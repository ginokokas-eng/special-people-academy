// Consumes a one-shot LMS launch token and hands back a single-use magic link
// the /launch page verifies to establish the learner's session.
//
// The token is NEVER a session. It is minted server-side by
// lms-api?resource=launch, stored only as a sha-256 hash, expires in 10 minutes
// and is burned on first use.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    let body: { token?: unknown } = {};
    try {
      body = (await req.json()) ?? {};
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }

    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!/^[0-9a-f]{64}$/i.test(token)) return json({ error: 'invalid_token' }, 400);

    const tokenHash = await sha256Hex(token);
    const { data: row } = await admin
      .from('lms_launch_tokens')
      .select(
        'id, organisation_id, course_id, learner_email, expires_at, consumed_at, launch_key_id',
      )
      .eq('token_hash', tokenHash)
      .maybeSingle();

    // One generic message for unknown / used / expired: no oracle for guesses.
    if (!row || row.consumed_at || new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: 'token_not_valid' }, 401);
    }

    // Burn it first, conditionally, so two simultaneous requests cannot both win.
    const { data: burned } = await admin
      .from('lms_launch_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('consumed_at', null)
      .select('id')
      .maybeSingle();
    if (!burned) return json({ error: 'token_not_valid' }, 401);

    const { data: key } = await admin
      .from('org_launch_keys')
      .select('revoked_at, allowed_frame_origins')
      .eq('id', row.launch_key_id)
      .maybeSingle();
    if (!key || key.revoked_at) return json({ error: 'key_revoked' }, 403);

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: row.learner_email,
    });
    if (linkError || !link?.properties?.hashed_token) {
      console.error('consume-launch-token: link failed', linkError?.message);
      return json({ error: 'could_not_start_session' }, 500);
    }

    const { data: course } = await admin
      .from('courses')
      .select('id, title')
      .eq('id', row.course_id)
      .maybeSingle();

    return json({
      token_hash: link.properties.hashed_token,
      email: row.learner_email,
      course_id: row.course_id,
      course_title: course?.title ?? null,
      organisation_id: row.organisation_id,
      allowed_frame_origins: key.allowed_frame_origins ?? [],
    });
  } catch (e) {
    console.error('consume-launch-token error', (e as Error).message);
    return json({ error: 'could_not_start_session' }, 500);
  }
});
