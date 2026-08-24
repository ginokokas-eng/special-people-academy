// sso-logout
//
// Hard revocation companion to `sso-from-ariadne`: when a carer signs out of the
// Ariadne app, Ariadne calls this with the (still valid) Ariadne bearer token
// and every Academy session for the mapped learner is revoked globally.
//
// Mapping uses the same shared module as the exchange — no provisioning here.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';
import { isUuid, normaliseEmail, resolveOrProvisionLearner } from '../_shared/ariadne.ts';
import { verifyAriadneToken } from '../_shared/ariadne-jwt.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

async function audit(row: Record<string, unknown>) {
  try {
    await admin.from('sso_exchange_log').insert({ source_system: 'ariadne', ...row });
  } catch (e) {
    console.error('[sso-logout] audit insert failed', (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  const ua = req.headers.get('user-agent');

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ error: 'ariadne_token_invalid', message: 'Missing Ariadne access token.' }, 401);
  }

  let claims;
  try {
    claims = await verifyAriadneToken(authHeader.slice(7).trim());
  } catch (e) {
    await audit({ outcome: 'logout_token_rejected', detail: (e as Error).message, ip_address: ip, user_agent: ua });
    return json({ error: 'ariadne_token_invalid', message: 'Your Ariadne session is not valid.' }, 401);
  }

  const sub = claims.sub;
  const email = normaliseEmail(claims.email);

  const resolution = await resolveOrProvisionLearner(
    admin,
    { ariadneUserId: sub, email },
    { allowProvision: false },
  );

  if (resolution.status !== 'matched') {
    await audit({
      ariadne_sub: isUuid(sub) ? sub : null,
      email,
      outcome: 'logout_no_match',
      detail: 'reason' in resolution ? resolution.reason : null,
      ip_address: ip,
      user_agent: ua,
    });
    // Nothing to revoke is a successful logout from the caller's perspective.
    return json({ revoked: false });
  }

  // Global revocation of every Academy session for the mapped learner via the
  // GoTrue admin sessions endpoint (service-role only, never exposed to clients).
  let revokeError: { message: string } | null = null;
  try {
    const res = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users/${resolution.userId}/sessions`,
      {
        method: 'DELETE',
        headers: {
          apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
        },
      },
    );
    if (!res.ok) revokeError = { message: `sessions_delete_${res.status}` };
    await res.text();
  } catch (e) {
    revokeError = { message: (e as Error).message };
  }


  await audit({
    ariadne_sub: isUuid(sub) ? sub : null,
    email,
    user_id: resolution.userId,
    outcome: revokeError ? 'logout_failed' : 'logout_revoked',
    detail: revokeError?.message ?? null,
    ip_address: ip,
    user_agent: ua,
  });

  return json({ revoked: !revokeError });
});
