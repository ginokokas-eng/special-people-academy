import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';

// Public endpoint protected by shared secret (x-ariadne-secret header).
// Body: { fountain_applicant_ids?: string[], emails?: string[] }
// Returns per-learner training status: enrollments, completions, certificates, last_activity_at.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const expected = Deno.env.get('ARIADNE_SYNC_SECRET');
  const provided = req.headers.get('x-ariadne-secret');
  if (!expected || provided !== expected) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: { fountain_applicant_ids?: string[]; emails?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const fountainIds = (body.fountain_applicant_ids ?? []).map(String);
  const emails = (body.emails ?? []).map((e) => e.toLowerCase());

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Resolve user_ids
  let profilesQuery = admin
    .from('profiles')
    .select('user_id, full_name, source_system, fountain_applicant_id, external_id');

  if (fountainIds.length && emails.length) {
    profilesQuery = profilesQuery.or(
      `fountain_applicant_id.in.(${fountainIds.join(',')})`,
    );
  } else if (fountainIds.length) {
    profilesQuery = profilesQuery.in('fountain_applicant_id', fountainIds);
  }

  const { data: profilesByFountain } = await profilesQuery;
  let profiles = profilesByFountain ?? [];

  // If emails provided, also lookup via auth admin
  if (emails.length) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const matched = (list?.users ?? []).filter((u) =>
      u.email && emails.includes(u.email.toLowerCase()),
    );
    if (matched.length) {
      const ids = matched.map((u) => u.id);
      const { data: extra } = await admin
        .from('profiles')
        .select('user_id, full_name, source_system, fountain_applicant_id, external_id')
        .in('user_id', ids);
      const seen = new Set(profiles.map((p) => p.user_id));
      for (const p of extra ?? []) if (!seen.has(p.user_id)) profiles.push(p);
    }
  }

  if (profiles.length === 0) {
    return json({ learners: [] });
  }

  const userIds = profiles.map((p) => p.user_id);

  const [{ data: enrollments }, { data: certificates }, { data: authList }] = await Promise.all([
    admin
      .from('enrollments')
      .select('user_id, course_id, completed_at, enrolled_at')
      .in('user_id', userIds),
    admin
      .from('certificates')
      .select('user_id, course_id, certificate_type, certificate_number, issued_at, pdf_path')
      .in('user_id', userIds),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailById = new Map<string, string | null>();
  for (const u of authList?.data?.users ?? []) emailById.set(u.id, u.email ?? null);

  const learners = profiles.map((p) => {
    const myEnr = (enrollments ?? []).filter((e) => e.user_id === p.user_id);
    const myCerts = (certificates ?? []).filter((c) => c.user_id === p.user_id);
    const lastActivity = myEnr
      .map((e) => e.completed_at ?? e.enrolled_at)
      .filter(Boolean)
      .sort()
      .pop() ?? null;
    return {
      user_id: p.user_id,
      email: emailById.get(p.user_id) ?? null,
      full_name: p.full_name,
      fountain_applicant_id: p.fountain_applicant_id,
      external_id: p.external_id,
      source_system: p.source_system,
      enrollments_total: myEnr.length,
      enrollments_completed: myEnr.filter((e) => !!e.completed_at).length,
      enrollments: myEnr.map((e) => ({
        course_id: e.course_id,
        status: e.completed_at ? 'completed' : 'in_progress',
        enrolled_at: e.enrolled_at,
        completed_at: e.completed_at,
      })),
      certificates: myCerts.map((c) => ({
        course_id: c.course_id,
        type: c.certificate_type,
        certificate_number: c.certificate_number,
        issued_at: c.issued_at,
        pdf_path: c.pdf_path,
      })),
      last_activity_at: lastActivity,
    };
  });

  return json({ learners });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
