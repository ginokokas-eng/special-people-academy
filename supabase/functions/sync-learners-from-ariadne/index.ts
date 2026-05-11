import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';

interface AriadneWorker {
  fountain_applicant_id: string;
  external_id?: string;
  email: string;
  full_name?: string | null;
  source_system?: string; // expected 'fountain'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);

    const callerId = claimsData.claims.sub as string;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify admin role
    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId);
    const allowed = (roles ?? []).some((r) =>
      ['super_admin', 'admin', 'ops_training_admin'].includes(r.role),
    );
    if (!allowed) return json({ error: 'Forbidden' }, 403);

    // Fetch from Ariadne
    const configuredEndpoint =
      Deno.env.get('ARIADNE_LEARNERS_ENDPOINT') ||
      'https://hbklqmoywlxbjvpxsxyc.supabase.co/functions/v1/external-training-sync?resource=workers';
    const endpoint = buildWorkersEndpoint(configuredEndpoint);
    const apiKey = Deno.env.get('ARIADNE_API_KEY')?.trim();
    if (!apiKey) {
      return syncError('Ariadne credentials not configured', 'ARIADNE_API_KEY is required.');
    }

    const requestUrl = new URL(req.url);
    if (requestUrl.searchParams.get('dry_run') === 'true') {
      return json({ ok: true, mode: 'dry_run', endpoint });
    }

    const ariadneRes = await fetch(endpoint, {
      method: 'GET',
      headers: { 'accept': 'application/json', 'X-API-Key': apiKey },
    });
    if (!ariadneRes.ok) {
      const txt = await ariadneRes.text();
      return syncError(`Ariadne returned ${ariadneRes.status}`, explainAriadneError(txt));
    }
    const payload = await ariadneRes.json();
    const workers: AriadneWorker[] = Array.isArray(payload)
      ? payload
      : payload?.data ?? payload?.workers ?? payload?.learners ?? [];

    console.log('[ariadne] payload top_keys:', payload && typeof payload === 'object' ? Object.keys(payload) : null);
    console.log('[ariadne] sample worker:', JSON.stringify(workers[0] ?? null));
    console.log('[ariadne] worker count:', workers.length);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ email?: string; reason: string }> = [];

    for (const w of workers) {
      try {
        if (!w.email || !w.fountain_applicant_id) {
          skipped++;
          await admin.from('user_sync_log').insert({
            source_system: 'fountain',
            external_id: w.fountain_applicant_id ?? null,
            email: w.email ?? null,
            status: 'skipped',
            message: 'Missing email or fountain_applicant_id',
            triggered_by: callerId,
          });
          continue;
        }

        // 1) Match by fountain_applicant_id
        const { data: byFountain } = await admin
          .from('profiles')
          .select('user_id')
          .eq('fountain_applicant_id', w.fountain_applicant_id)
          .maybeSingle();

        let userId = byFountain?.user_id ?? null;

        // 2) Match by email via auth admin
        if (!userId) {
          const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const found = list?.users?.find(
            (u) => u.email?.toLowerCase() === w.email.toLowerCase(),
          );
          if (found) userId = found.id;
        }

        if (userId) {
          // Update profile with Fountain identifiers (option B: link existing)
          await admin
            .from('profiles')
            .update({
              source_system: 'fountain',
              external_id: w.external_id ?? w.fountain_applicant_id,
              fountain_applicant_id: w.fountain_applicant_id,
              full_name: w.full_name ?? undefined,
            })
            .eq('user_id', userId);
          updated++;
          await admin.from('user_sync_log').insert({
            source_system: 'fountain',
            external_id: w.fountain_applicant_id,
            email: w.email,
            user_id: userId,
            status: 'updated',
            triggered_by: callerId,
          });
        } else {
          // Create new auth user
          const tempPassword = crypto.randomUUID() + crypto.randomUUID();
          const { data: createRes, error: createErr } = await admin.auth.admin.createUser({
            email: w.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: w.full_name ?? '' },
          });
          if (createErr || !createRes.user) {
            failed++;
            errors.push({ email: w.email, reason: createErr?.message ?? 'create failed' });
            await admin.from('user_sync_log').insert({
              source_system: 'fountain',
              external_id: w.fountain_applicant_id,
              email: w.email,
              status: 'failed',
              message: createErr?.message ?? 'create failed',
              triggered_by: callerId,
            });
            continue;
          }
          // handle_new_user trigger created profile + learner role; update Fountain fields
          await admin
            .from('profiles')
            .update({
              source_system: 'fountain',
              external_id: w.external_id ?? w.fountain_applicant_id,
              fountain_applicant_id: w.fountain_applicant_id,
              full_name: w.full_name ?? null,
            })
            .eq('user_id', createRes.user.id);
          created++;
          await admin.from('user_sync_log').insert({
            source_system: 'fountain',
            external_id: w.fountain_applicant_id,
            email: w.email,
            user_id: createRes.user.id,
            status: 'created',
            triggered_by: callerId,
          });
        }
      } catch (e) {
        failed++;
        errors.push({ email: w.email, reason: (e as Error).message });
      }
    }

    return json({ ok: true, total: workers.length, created, updated, skipped, failed, errors });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

function syncError(error: string, detail: string) {
  return json({ ok: false, error, detail, total: 0, created: 0, updated: 0, skipped: 0, failed: 0 });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildWorkersEndpoint(rawEndpoint: string) {
  const url = new URL(rawEndpoint);
  url.search = '';
  url.searchParams.set('resource', 'workers');
  return url.toString();
}

function buildAriadneHeaders(apiKey: string, anonKey: string) {
  const headers = new Headers({
    'accept': 'application/json',
    'X-API-Key': apiKey,
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  });
  return headers;
}

function isJwtLike(value: string) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function explainAriadneError(detail: string) {
  if (detail.includes('invalid input syntax for type uuid') && detail.includes('"XX"')) {
    return 'Ariadne is still receiving a placeholder value "XX" for a UUID field. Check the API key configured in Ariadne for this external-training-sync endpoint.';
  }
  return detail;
}
