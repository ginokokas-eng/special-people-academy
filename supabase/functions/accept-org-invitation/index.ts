// accept-org-invitation
//
// Server-side acceptance of a B2B organisation invitation.
//
// The raw token NEVER touches a log line and is never stored — it is hashed and
// matched against organisation_invitations.token_hash.
//
// Success path:
//   1. validate token -> pending, not expired
//   2. resolve or create the auth user for the invitation email
//   3. mint a single-use magic link (the same verify-and-land pattern as /sso)
//   4. service-side: invitation accepted + accepted_user_id, membership row,
//      bind the reserved seat (user_id + status active), create the enrollment
//      with licence_seat_id
//   5. return { token_hash, next } — the client calls verifyOtp and lands
//
// Idempotent: re-clicking an accepted invitation re-mints a link for the same
// user and re-runs the (upsert-shaped) bindings. Expired invitations report a
// clear error and their reserved seat is released.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';
import { findAuthUserByEmail } from '../_shared/ariadne.ts';
import {
  hashToken,
  looksLikeToken,
  normaliseDisplayName,
  normaliseEmail,
} from '../_shared/org-invites.ts';

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

const INVALID = { error: 'invalid_invitation', message: 'This invitation link is not valid.' };

interface Invitation {
  id: string;
  organisation_id: string;
  email: string;
  org_role: string;
  licence_id: string | null;
  status: string;
  expires_at: string;
  accepted_user_id: string | null;
}

/** Binds the reserved seat, membership and enrollment. Safe to re-run. */
async function applyBindings(invitation: Invitation, userId: string) {
  await admin.from('organisation_members').upsert(
    {
      organisation_id: invitation.organisation_id,
      user_id: userId,
      org_role: invitation.org_role === 'org_admin' ? 'org_admin' : 'member',
    },
    { onConflict: 'organisation_id,user_id', ignoreDuplicates: true },
  );

  if (!invitation.licence_id) return null;

  const { data: seat } = await admin
    .from('licence_seats')
    .select('id, status, user_id')
    .eq('invitation_id', invitation.id)
    .maybeSingle();

  if (!seat) return null;

  if (seat.status !== 'completed') {
    await admin
      .from('licence_seats')
      .update({ user_id: userId, status: 'active', revoked_at: null })
      .eq('id', seat.id);
  }

  const { data: licence } = await admin
    .from('licences')
    .select('course_id')
    .eq('id', invitation.licence_id)
    .maybeSingle();
  if (!licence) return null;

  const { data: existing } = await admin
    .from('enrollments')
    .select('id, licence_seat_id')
    .eq('user_id', userId)
    .eq('course_id', licence.course_id)
    .maybeSingle();

  if (existing) {
    if (!existing.licence_seat_id) {
      await admin.from('enrollments').update({ licence_seat_id: seat.id }).eq('id', existing.id);
    }
  } else {
    await admin.from('enrollments').insert({
      user_id: userId,
      course_id: licence.course_id,
      licence_seat_id: seat.id,
    });
  }

  return licence.course_id as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: { token?: string; display_name?: string };
  try {
    body = await req.json();
  } catch {
    return json(INVALID, 400);
  }

  if (!looksLikeToken(body.token)) return json(INVALID, 400);

  const displayName = normaliseDisplayName(body.display_name);
  if (body.display_name !== undefined && !displayName) {
    return json(
      { error: 'invalid_name', message: 'Please enter your full name (2–100 characters).' },
      400,
    );
  }


  const tokenHash = await hashToken(body.token);

  const { data: invitation } = await admin
    .from('organisation_invitations')
    .select('id, organisation_id, email, org_role, licence_id, status, expires_at, accepted_user_id')
    .eq('token_hash', tokenHash)
    .maybeSingle<Invitation>();

  if (!invitation) return json(INVALID, 404);

  const email = normaliseEmail(invitation.email);
  if (!email) return json(INVALID, 400);

  const expired = Date.parse(invitation.expires_at) <= Date.now();

  if (invitation.status === 'revoked') {
    return json({ error: 'revoked', message: 'This invitation has been withdrawn.' }, 410);
  }

  if (invitation.status !== 'accepted' && expired) {
    // Mark it expired and free the reserved seat (service-side; the invitee has
    // no session yet so the org-scoped RPC is not available here).
    await admin.from('organisation_invitations').update({ status: 'expired' }).eq('id', invitation.id);
    const { data: seat } = await admin
      .from('licence_seats')
      .select('id, status')
      .eq('invitation_id', invitation.id)
      .maybeSingle();
    if (seat && seat.status === 'reserved') {
      await admin
        .from('licence_seats')
        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
        .eq('id', seat.id);
    }
    return json(
      { error: 'expired', message: 'This invitation has expired — ask your manager to send a new one.' },
      410,
    );
  }

  if (invitation.status === 'expired') {
    return json(
      { error: 'expired', message: 'This invitation has expired — ask your manager to send a new one.' },
      410,
    );
  }

  try {
    let userId = invitation.accepted_user_id ?? (await findAuthUserByEmail(admin, email));

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        email_confirm: true,
      });
      if (createErr || !created?.user) {
        console.error('[org-invite-accept] createUser failed:', createErr?.message);
        return json({ error: 'failed', message: 'We could not set up your account.' }, 500);
      }
      userId = created.user.id;
    }

    const courseId = await applyBindings(invitation, userId);

    await admin
      .from('organisation_invitations')
      .update({ status: 'accepted', accepted_user_id: userId })
      .eq('id', invitation.id);

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    const hashedToken = link?.properties?.hashed_token;
    if (linkErr || !hashedToken) {
      console.error('[org-invite-accept] generateLink failed:', linkErr?.message);
      return json({ error: 'failed', message: 'We could not start your session.' }, 500);
    }

    return json({
      ok: true,
      token_hash: hashedToken,
      next: courseId ? `/courses/${courseId}/learn` : '/my-learning',
      email,
    });
  } catch (e) {
    console.error('[org-invite-accept] unexpected failure:', (e as Error).message);
    return json({ error: 'failed', message: 'Something went wrong accepting this invitation.' }, 500);
  }
});
