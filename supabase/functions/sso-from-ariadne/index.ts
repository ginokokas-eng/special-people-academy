// sso-from-ariadne
//
// Token exchange: an Ariadne-authenticated carer's access token in, a
// single-use Academy magic-link (token_hash in a URL fragment) out.
//
// Invariants enforced here:
//  - kill-switch (platform_settings.ariadne_sso.enabled) checked first
//  - JWKS verification with kid match, pinned iss/aud, asymmetric algs only
//  - a fresh per-request nonce is REQUIRED, and replay defence is keyed on
//    (sub, nonce) — NOT on the token iat, since one Ariadne access token is
//    legitimately reused for many taps within its hour-long lifetime
//  - rate limits: 10/min and 60/hr per Ariadne sub AND per IP
//  - identity resolution ariadne_user_id -> fountain_applicant_id -> email
//  - inline provisioning is learner-only, and never mints for an inactive learner
//  - every attempt writes an audit row; the client only ever sees a generic 403

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';
import {
  isUuid,
  isLearnerActive,
  normaliseEmail,
  resolveOrProvisionLearner,
} from '../_shared/ariadne.ts';
import { verifyAriadneToken } from '../_shared/ariadne-jwt.ts';

const DEFAULT_BASE_URL = 'https://grow-shine-campus.lovable.app';
/** Magic links are treated as short-lived regardless of the project setting. */
const LINK_TTL_SECONDS = 120;
/** Replay window for a given nonce — the exchange only needs minutes, not the token's hour. */
const GUARD_TTL_MS = 10 * 60 * 1000;
/** URL-safe nonce, 16–128 chars (callers send 43-char base64url of 32 random bytes). */
const NONCE_PATTERN = /^[A-Za-z0-9._~-]{16,128}$/;


const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/** Single generic client-facing failure. Detail only ever reaches the audit log. */
const GENERIC_DENIED = { error: 'sso_denied', message: 'Unable to start this Academy session.' };

interface AuditInput {
  sub?: string | null;
  email?: string | null;
  userId?: string | null;
  outcome: string;
  detail?: string | null;
  provisioned?: boolean;
  ip?: string | null;
  ua?: string | null;
}

async function audit(input: AuditInput) {
  try {
    await admin.from('sso_exchange_log').insert({
      source_system: 'ariadne',
      ariadne_sub: isUuid(input.sub) ? input.sub : null,
      email: input.email ?? null,
      user_id: input.userId ?? null,
      outcome: input.outcome,
      detail: input.detail ?? null,
      provisioned: input.provisioned ?? false,
      ip_address: input.ip ?? null,
      user_agent: input.ua ?? null,
    });
  } catch (e) {
    console.error('[sso] audit insert failed', (e as Error).message);
  }
}

function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip');
}

async function ssoSettings(): Promise<{ enabled: boolean; baseUrl: string }> {
  const { data } = await admin
    .from('platform_settings')
    .select('settings')
    .eq('section', 'ariadne_sso')
    .maybeSingle();
  const settings = (data?.settings ?? {}) as { enabled?: boolean; site_url?: string };
  const configured =
    (typeof settings.site_url === 'string' && settings.site_url.trim()) ||
    Deno.env.get('ACADEMY_SITE_URL')?.trim() ||
    DEFAULT_BASE_URL;
  let baseUrl = DEFAULT_BASE_URL;
  try {
    const parsed = new URL(configured);
    if (parsed.protocol === 'https:') baseUrl = parsed.origin;
  } catch {
    baseUrl = DEFAULT_BASE_URL;
  }
  return { enabled: settings.enabled !== false, baseUrl };
}

/** Internal-path validation: single leading slash, no scheme, no host. */
function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\]/.test(value) || value.includes(':')) return null;
  if (value.length > 512) return null;
  return value;
}

async function rateLimited(sub: string, ip: string | null): Promise<string | null> {
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();

  const checks: Array<{ label: string; column: 'ariadne_sub' | 'ip_address'; value: string; since: string; max: number }> = [
    { label: 'sub_per_minute', column: 'ariadne_sub', value: sub, since: minuteAgo, max: 10 },
    { label: 'sub_per_hour', column: 'ariadne_sub', value: sub, since: hourAgo, max: 60 },
  ];
  if (ip) {
    checks.push(
      { label: 'ip_per_minute', column: 'ip_address', value: ip, since: minuteAgo, max: 10 },
      { label: 'ip_per_hour', column: 'ip_address', value: ip, since: hourAgo, max: 60 },
    );
  }

  for (const check of checks) {
    const { count } = await admin
      .from('sso_exchange_log')
      .select('id', { count: 'exact', head: true })
      .eq(check.column, check.value)
      .gte('created_at', check.since);
    if ((count ?? 0) >= check.max) return check.label;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const ip = clientIp(req);
  const ua = req.headers.get('user-agent');

  // 1. Kill switch, before any work.
  const { enabled, baseUrl } = await ssoSettings();
  if (!enabled) {
    await audit({ outcome: 'disabled', detail: 'ariadne_sso.enabled is false', ip, ua });
    return json({ error: 'sso_disabled', message: 'Academy sign-in from Ariadne is currently unavailable.' }, 503);
  }

  // 2. Bearer token presence.
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    await audit({ outcome: 'unauthorized', detail: 'missing bearer token', ip, ua });
    return json({ error: 'ariadne_token_invalid', message: 'Missing Ariadne access token.' }, 401);
  }
  const token = authHeader.slice(7).trim();

  // 3. Verify against Ariadne's JWKS (fails closed).
  let claims;
  try {
    claims = await verifyAriadneToken(token);
  } catch (e) {
    const reason = (e as Error).message;
    await audit({ outcome: 'token_rejected', detail: reason, ip, ua });
    return json({ error: 'ariadne_token_invalid', message: 'Your Ariadne session is not valid. Sign in again.' }, 401);
  }

  const sub = claims.sub;
  const email = normaliseEmail(claims.email);

  // 4. Rate limiting per sub and per IP.
  const limited = await rateLimited(sub, ip);
  if (limited) {
    await audit({ sub, email, outcome: 'rate_limited', detail: limited, ip, ua });
    return json({ error: 'rate_limited', message: 'Too many sign-in attempts. Try again shortly.' }, 429);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }

  // 5. Per-request nonce: this is the replay key, so it is mandatory.
  const rawNonce = typeof body.nonce === 'string' ? body.nonce.trim() : '';
  if (!NONCE_PATTERN.test(rawNonce)) {
    await audit({
      sub,
      email,
      outcome: 'invalid_nonce',
      detail: rawNonce ? `nonce failed validation (len=${rawNonce.length})` : 'nonce missing',
      ip,
      ua,
    });
    return json(
      { error: 'invalid_request', message: 'A fresh nonce is required for each sign-in request.' },
      400,
    );
  }
  const nonce = rawNonce;

  // 6. Replay defence on (sub, nonce) — a replayed REQUEST is refused, while a
  // fresh tap on the same still-valid Ariadne token is allowed through.
  const guardExpiry = Math.min(claims.exp * 1000, Date.now() + GUARD_TTL_MS);
  const { error: replayErr } = await admin.from('sso_replay_guard').insert({
    ariadne_sub: sub,
    token_iat: claims.iat, // retained for audit/debug only — no longer a uniqueness key
    nonce,
    expires_at: new Date(guardExpiry).toISOString(),
  });
  if (replayErr) {
    const replayed = (replayErr as { code?: string }).code === '23505';
    await audit({
      sub,
      email,
      outcome: replayed ? 'replayed' : 'replay_guard_failed',
      detail: replayErr.message,
      ip,
      ua,
    });
    return json(GENERIC_DENIED, 403);
  }
  // Opportunistic cleanup of expired guard rows.
  admin.from('sso_replay_guard').delete().lt('expires_at', new Date().toISOString()).then(
    () => {},
    () => {},
  );


  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    [meta.first_name, meta.last_name].filter((v) => typeof v === 'string' && v).join(' ').trim() ||
    null;
  const fountainApplicantId =
    (typeof meta.fountain_applicant_id === 'string' && meta.fountain_applicant_id) ||
    (typeof meta.external_id === 'string' && meta.external_id) ||
    null;

  // 6. Resolve (stable id first) or inline-provision a learner.
  const resolution = await resolveOrProvisionLearner(
    admin,
    { ariadneUserId: sub, fountainApplicantId, email, fullName, externalId: fountainApplicantId },
    { allowProvision: true },
  );

  if (resolution.status === 'no_email') {
    await audit({ sub, email, outcome: 'no_email', detail: resolution.reason, ip, ua });
    return json(GENERIC_DENIED, 403);
  }
  if (resolution.status !== 'matched' && resolution.status !== 'provisioned') {
    await audit({ sub, email, outcome: 'not_eligible', detail: resolution.reason, ip, ua });
    return json(GENERIC_DENIED, 403);
  }

  const academyUserId = resolution.userId;

  // 7. Never mint for an inactive learner.
  const activity = await isLearnerActive(admin, academyUserId);
  if (!activity.active) {
    await audit({ sub, email, userId: academyUserId, outcome: 'inactive', detail: activity.reason, ip, ua });
    return json(GENERIC_DENIED, 403);
  }

  // 8. Resolve the target email for the magic link from the Academy account.
  const { data: academyUser } = await admin.auth.admin.getUserById(academyUserId);
  const linkEmail = normaliseEmail(academyUser?.user?.email) ?? email;
  if (!linkEmail) {
    await audit({ sub, email, userId: academyUserId, outcome: 'no_email', detail: 'Academy account has no email', ip, ua });
    return json(GENERIC_DENIED, 403);
  }

  // 9. Mint the single-use magic link.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: linkEmail,
  });
  const hashedToken = link?.properties?.hashed_token;
  if (linkErr || !hashedToken) {
    await audit({
      sub,
      email: linkEmail,
      userId: academyUserId,
      outcome: 'mint_failed',
      detail: linkErr?.message ?? 'no hashed_token returned',
      ip,
      ua,
    });
    return json(GENERIC_DENIED, 403);
  }

  const next = safeNext(body.next) ?? '/my-learning';
  const nonce = typeof body.nonce === 'string' && body.nonce.length <= 128 ? body.nonce : null;
  const expiresAt = new Date(Date.now() + LINK_TTL_SECONDS * 1000).toISOString();

  const fragment = new URLSearchParams({
    token_hash: hashedToken,
    type: 'email',
    next,
    expires_at: expiresAt,
  });
  if (nonce) fragment.set('nonce', nonce);

  await audit({
    sub,
    email: linkEmail,
    userId: academyUserId,
    outcome: 'success',
    detail: `via=${resolution.via}`,
    provisioned: resolution.provisioned,
    ip,
    ua,
  });

  return json({
    url: `${baseUrl}/sso#${fragment.toString()}`,
    expires_at: expiresAt,
    academy_user_id: academyUserId,
    provisioned: resolution.provisioned,
  });
});
