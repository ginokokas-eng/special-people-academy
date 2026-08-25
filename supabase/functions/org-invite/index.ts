// org-invite
//
// Bulk seat assignment / invitation creation for a B2B licence.
//
// Callable by platform staff OR an org_admin of the licence's organisation.
//
// Per email:
//   known auth user   -> assign_seat(_user_id) via the CALLER's client (the
//                        primitive authorises on auth.uid()), then membership
//                        row (member) if missing, seat -> active, enrollment
//                        with licence_seat_id.
//   unknown email      -> organisation_invitations row (raw token 32 bytes,
//                        only its SHA-256 hash stored, 14-day expiry) +
//                        assign_seat(_invitation_id) so the seat is reserved.
//                        If the seat cannot be reserved (seats full) the
//                        invitation row is rolled back and the row reports the
//                        failure honestly.
//
// Nothing is written directly to licences/seats — every seat mutation goes
// through the Step-1 primitives.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';
import { findAuthUserByEmail } from '../_shared/ariadne.ts';
import {
  INVITE_TTL_DAYS,
  createRawToken,
  hashToken,
  isUuid,
  parseEmailList,
} from '../_shared/org-invites.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const DEFAULT_BASE_URL = 'https://grow-shine-campus.lovable.app';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

type RowOutcome = 'enrolled' | 'invited' | 'invalid_email' | 'failed';

interface ResultRow {
  email: string;
  outcome: RowOutcome;
  message: string;
  invite_url?: string;
  email_sent?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);

  // getUser with an explicit token — never rely on ambient claims here.
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const caller = userData?.user;
  if (userErr || !caller) return json({ error: 'unauthorized' }, 401);

  // Caller-scoped client: the seat primitives authorise on auth.uid().
  const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: { licence_id?: string; emails?: string; org_role?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request', message: 'Invalid JSON body.' }, 400);
  }

  const licenceId = body.licence_id;
  if (!isUuid(licenceId)) {
    return json({ error: 'bad_request', message: 'A valid licence is required.' }, 400);
  }
  const orgRole = body.org_role === 'org_admin' ? 'org_admin' : 'member';

  const { emails, invalid } = parseEmailList(typeof body.emails === 'string' ? body.emails : '');
  if (emails.length === 0 && invalid.length === 0) {
    return json({ error: 'bad_request', message: 'Add at least one email address.' }, 400);
  }
  if (emails.length > 200) {
    return json({ error: 'bad_request', message: 'Invite at most 200 people at a time.' }, 400);
  }

  // Licence + org context (service role: the caller's permission is checked next).
  const { data: licence } = await admin
    .from('licences')
    .select('id, organisation_id, course_id, seats_total, status, starts_at, expires_at')
    .eq('id', licenceId)
    .maybeSingle();
  if (!licence) return json({ error: 'not_found', message: 'Licence not found.' }, 404);

  const [{ data: isStaff }, { data: isOrgAdmin }] = await Promise.all([
    admin.rpc('is_platform_staff', { _user_id: caller.id }),
    admin.rpc('is_org_admin', { _user: caller.id, _org: licence.organisation_id }),
  ]);
  if (!isStaff && !isOrgAdmin) {
    return json({ error: 'forbidden', message: 'You cannot invite people to this licence.' }, 403);
  }
  // Only platform staff may mint another org admin.
  const effectiveRole = orgRole === 'org_admin' && !isStaff ? 'member' : orgRole;

  // Opportunistic housekeeping: free seats held by this org's expired invites.
  const { error: releaseErr } = await asCaller.rpc('release_expired_invitation_seats', {
    _org: licence.organisation_id,
  });
  if (releaseErr) console.warn('[org-invite] release failed:', releaseErr.message);

  const baseUrl = (Deno.env.get('ACADEMY_BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const rows: ResultRow[] = invalid.map((value) => ({
    email: value,
    outcome: 'invalid_email' as RowOutcome,
    message: 'Not a valid email address — skipped.',
  }));

  for (const email of emails) {
    try {
      const existingUserId = await findAuthUserByEmail(admin, email);

      if (existingUserId) {
        const { data: seatId, error: seatErr } = await asCaller.rpc('assign_seat', {
          _licence_id: licenceId,
          _user_id: existingUserId,
        });
        if (seatErr || !seatId) {
          rows.push({ email, outcome: 'failed', message: seatErr?.message ?? 'Seat assignment failed.' });
          continue;
        }

        await admin.from('organisation_members').upsert(
          { organisation_id: licence.organisation_id, user_id: existingUserId, org_role: effectiveRole },
          { onConflict: 'organisation_id,user_id', ignoreDuplicates: true },
        );

        await admin
          .from('licence_seats')
          .update({ status: 'active', user_id: existingUserId })
          .eq('id', seatId)
          .neq('status', 'completed');

        const { data: existingEnrolment } = await admin
          .from('enrollments')
          .select('id')
          .eq('user_id', existingUserId)
          .eq('course_id', licence.course_id)
          .maybeSingle();

        if (existingEnrolment) {
          await admin
            .from('enrollments')
            .update({ licence_seat_id: seatId })
            .eq('id', existingEnrolment.id)
            .is('licence_seat_id', null);
        } else {
          await admin.from('enrollments').insert({
            user_id: existingUserId,
            course_id: licence.course_id,
            licence_seat_id: seatId,
          });
        }

        rows.push({ email, outcome: 'enrolled', message: 'Already has an account — seat assigned and enrolled.' });
        continue;
      }

      // Unknown email -> invitation + reserved seat.
      const rawToken = createRawToken();
      const tokenHash = await hashToken(rawToken);
      const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

      const { data: invitation, error: inviteErr } = await admin
        .from('organisation_invitations')
        .insert({
          organisation_id: licence.organisation_id,
          email,
          org_role: effectiveRole,
          licence_id: licenceId,
          token_hash: tokenHash,
          status: 'pending',
          expires_at: expiresAt,
          invited_by: caller.id,
        })
        .select('id')
        .single();

      if (inviteErr || !invitation) {
        rows.push({ email, outcome: 'failed', message: inviteErr?.message ?? 'Could not create the invitation.' });
        continue;
      }

      const { error: seatErr } = await asCaller.rpc('assign_seat', {
        _licence_id: licenceId,
        _invitation_id: invitation.id,
      });
      if (seatErr) {
        // No silent partial success: roll the invitation back.
        await admin.from('organisation_invitations').delete().eq('id', invitation.id);
        rows.push({ email, outcome: 'failed', message: seatErr.message });
        continue;
      }

      const inviteUrl = `${baseUrl}/invite?token=${rawToken}`;
      rows.push({
        email,
        outcome: 'invited',
        message: `Invitation created — expires in ${INVITE_TTL_DAYS} days.`,
        invite_url: inviteUrl,
        // Email delivery is not configured for this project yet (no sender
        // domain). The link is returned so it can be shared directly.
        email_sent: false,
      });
    } catch (e) {
      rows.push({ email, outcome: 'failed', message: (e as Error).message });
    }
  }

  const summary = {
    total: rows.length,
    enrolled: rows.filter((r) => r.outcome === 'enrolled').length,
    invited: rows.filter((r) => r.outcome === 'invited').length,
    failed: rows.filter((r) => r.outcome === 'failed' || r.outcome === 'invalid_email').length,
  };

  return json({ ok: true, email_delivery: 'not_configured', summary, rows });
});
