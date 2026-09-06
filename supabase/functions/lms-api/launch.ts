// Thin SCORM launcher resources for lms-api.
//
// These two resources do NOT use the ARIADNE_SYNC_SECRET. They authenticate
// with a per-organisation launch key sent in `x-launch-key`, verified against
// the sha-256 hash stored in org_launch_keys. Everything they touch is fenced
// to that key's organisation.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

export const LAUNCH_TOKEN_TTL_SECONDS = 600; // 10 minutes
const RATE_LIMIT_PER_MINUTE = 60;

export interface LaunchKeyRow {
  id: string;
  organisation_id: string;
  revoked_at: string | null;
  allowed_frame_origins: string[];
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Resolves the launch key. Returns null when absent/unknown, 'revoked' when off. */
export async function resolveLaunchKey(
  admin: SupabaseClient,
  raw: string | null,
): Promise<LaunchKeyRow | 'revoked' | null> {
  if (!raw || raw.trim().length < 20) return null;
  const hash = await sha256Hex(raw.trim());
  const { data } = await admin
    .from('org_launch_keys')
    .select('id, organisation_id, revoked_at, allowed_frame_origins')
    .eq('key_hash', hash)
    .maybeSingle();
  if (!data) return null;
  if (data.revoked_at) return 'revoked';
  return data as LaunchKeyRow;
}

const normaliseEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
};

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return (data?.users ?? []).find((u) => u.email?.toLowerCase() === email) ?? null;
}

/** Same provisioning shape as ?resource=register: confirmed, passwordless. */
async function ensureLearner(
  admin: SupabaseClient,
  email: string,
  fullName: string | null,
  externalId: string | null,
): Promise<{ userId: string; created: boolean } | { error: string }> {
  const existing = await findAuthUserByEmail(admin, email);
  if (existing) {
    if (fullName) {
      await admin
        .from('profiles')
        .upsert({ user_id: existing.id, full_name: fullName }, { onConflict: 'user_id' });
    }
    return { userId: existing.id, created: false };
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, external_id: externalId },
  });
  if (error || !created?.user) return { error: error?.message ?? 'could_not_create_learner' };

  await admin.from('profiles').upsert(
    { user_id: created.user.id, full_name: fullName, external_id: externalId },
    { onConflict: 'user_id' },
  );
  return { userId: created.user.id, created: true };
}

async function rateLimited(admin: SupabaseClient, keyId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from('lms_launch_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('launch_key_id', keyId)
    .gte('created_at', since);
  return (count ?? 0) >= RATE_LIMIT_PER_MINUTE;
}

export async function handleLaunch(
  admin: SupabaseClient,
  req: Request,
  key: LaunchKeyRow,
  appOrigin: string,
  json: (body: unknown, status?: number) => Response,
) {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const courseId = typeof body.course_id === 'string' ? body.course_id.trim() : '';
  const email = normaliseEmail(body.learner_email);
  const fullName = typeof body.learner_name === 'string' && body.learner_name.trim()
    ? body.learner_name.trim().slice(0, 160)
    : null;
  const externalId = typeof body.external_id === 'string' && body.external_id.trim()
    ? body.external_id.trim().slice(0, 160)
    : null;

  if (!/^[0-9a-f-]{36}$/i.test(courseId)) return json({ error: 'invalid_course_id' }, 400);
  if (!email) return json({ error: 'invalid_learner_email' }, 400);

  if (await rateLimited(admin, key.id)) {
    return json({ error: 'rate_limited', message: 'Too many launches. Try again shortly.' }, 429);
  }

  const { data: course } = await admin
    .from('courses')
    .select('id, title, is_published')
    .eq('id', courseId)
    .maybeSingle();
  if (!course || !course.is_published) return json({ error: 'course_not_licensed' }, 404);

  // Active licence for this org + course.
  const nowIso = new Date().toISOString();
  const { data: licences } = await admin
    .from('licences')
    .select('id, seats_total, expires_at, starts_at, status')
    .eq('organisation_id', key.organisation_id)
    .eq('course_id', courseId)
    .eq('status', 'active')
    .lte('starts_at', nowIso)
    .gt('expires_at', nowIso)
    .order('expires_at', { ascending: false });

  if (!licences?.length) return json({ error: 'course_not_licensed' }, 403);

  const learner = await ensureLearner(admin, email, fullName, externalId);
  if ('error' in learner) return json({ error: 'learner_provisioning_failed', detail: learner.error }, 500);

  // Membership of the buying organisation, so org reporting sees them.
  await admin
    .from('organisation_members')
    .upsert(
      { organisation_id: key.organisation_id, user_id: learner.userId, org_role: 'member' },
      { onConflict: 'organisation_id,user_id', ignoreDuplicates: true },
    );

  // Prefer a licence where this learner already holds a seat, else the first
  // with capacity. assign_seat_for_launch mirrors assign_seat's rules.
  let seatId: string | null = null;
  let seatError: string | null = null;
  for (const licence of licences) {
    const { data, error } = await admin.rpc('assign_seat_for_launch', {
      _licence_id: licence.id,
      _user_id: learner.userId,
    });
    if (!error && data) {
      seatId = data as string;
      break;
    }
    seatError = error?.message ?? null;
  }
  if (!seatId) {
    if (seatError?.includes('no_seat_available')) return json({ error: 'no_seat_available' }, 409);
    return json({ error: 'no_seat_available', detail: seatError }, 409);
  }

  await admin.from('enrollments').upsert(
    { user_id: learner.userId, course_id: courseId, licence_seat_id: seatId },
    { onConflict: 'user_id,course_id', ignoreDuplicates: false },
  );

  // One-shot token: only the hash is stored, exactly like the SSO replay guard.
  const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + LAUNCH_TOKEN_TTL_SECONDS * 1000).toISOString();

  const { error: tokenErr } = await admin.from('lms_launch_tokens').insert({
    token_hash: tokenHash,
    launch_key_id: key.id,
    organisation_id: key.organisation_id,
    course_id: courseId,
    learner_email: email,
    learner_name: fullName,
    external_id: externalId,
    expires_at: expiresAt,
  });
  if (tokenErr) return json({ error: 'could_not_mint_token', detail: tokenErr.message }, 500);

  await admin
    .from('org_launch_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', key.id);

  return json({
    launch_url: `${appOrigin}/launch?t=${rawToken}`,
    expires_at: expiresAt,
    course: { id: course.id, title: course.title },
    learner_created: learner.created,
  });
}

export async function handleLaunchStatus(
  admin: SupabaseClient,
  req: Request,
  key: LaunchKeyRow,
  json: (body: unknown, status?: number) => Response,
) {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const courseId = typeof body.course_id === 'string' ? body.course_id.trim() : '';
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) return json({ error: 'invalid_course_id' }, 400);

  const email = normaliseEmail(body.learner_email);
  const externalId = typeof body.external_id === 'string' ? body.external_id.trim() : '';
  if (!email && !externalId) return json({ error: 'learner_email_or_external_id_required' }, 400);

  let userId: string | null = null;
  if (email) {
    const authUser = await findAuthUserByEmail(admin, email);
    userId = authUser?.id ?? null;
  }
  if (!userId && externalId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('user_id')
      .or(`external_id.eq.${externalId},fountain_applicant_id.eq.${externalId}`)
      .maybeSingle();
    userId = profile?.user_id ?? null;
  }
  if (!userId) return json({ error: 'learner_not_found' }, 404);

  // Org fence: the key may only report on its own organisation's people.
  const { data: membership } = await admin
    .from('organisation_members')
    .select('user_id')
    .eq('organisation_id', key.organisation_id)
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle();
  if (!membership) return json({ error: 'learner_not_in_organisation' }, 403);

  const [{ data: enrollment }, { data: lessons }, { data: quizzes }] = await Promise.all([
    admin
      .from('enrollments')
      .select('enrolled_at, completed_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle(),
    admin.from('lessons').select('id').eq('course_id', courseId).eq('is_required', true),
    admin.from('quizzes').select('id').eq('course_id', courseId),
  ]);

  const lessonIds = (lessons ?? []).map((l) => l.id);
  let completedCount = 0;
  if (lessonIds.length) {
    const { count } = await admin
      .from('lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', true)
      .in('lesson_id', lessonIds);
    completedCount = count ?? 0;
  }

  let score: number | null = null;
  const quizIds = (quizzes ?? []).map((q) => q.id);
  if (quizIds.length) {
    const { data: attempts } = await admin
      .from('quiz_attempts')
      .select('score')
      .eq('user_id', userId)
      .in('quiz_id', quizIds)
      .order('score', { ascending: false })
      .limit(1);
    score = attempts?.[0]?.score ?? null;
  }

  const percent = lessonIds.length ? Math.round((completedCount / lessonIds.length) * 100) : 0;
  const status = enrollment?.completed_at
    ? 'completed'
    : completedCount > 0
      ? 'in_progress'
      : enrollment
        ? 'not_started'
        : 'not_enrolled';

  return json({
    status,
    percent,
    completed_at: enrollment?.completed_at ?? null,
    score,
    lessons_completed: completedCount,
    lessons_total: lessonIds.length,
  });
}
