// Shared Ariadne <-> Academy identity module.
//
// Used by BOTH `sync-learners-from-ariadne` (bulk provisioning) and
// `sso-from-ariadne` (inline provisioning during token exchange) so the two
// paths can never drift.
//
// PUBLIC configuration only — no secrets live in this file. The Ariadne issuer
// and its JWKS endpoint are public values.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

export const ARIADNE_ISSUER = 'https://hbklqmoywlxbjvpxsxyc.supabase.co/auth/v1';
export const ARIADNE_JWKS_URL = `${ARIADNE_ISSUER}/.well-known/jwks.json`;
export const ARIADNE_AUDIENCE = 'authenticated';
/** Asymmetric only. HS* / none are never accepted. */
export const ARIADNE_ALLOWED_ALGS = ['ES256', 'RS256'] as const;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function normaliseEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 3 && trimmed.includes('@') ? trimmed : null;
}

export interface AriadneIdentity {
  /** Ariadne auth user id (JWT `sub`) — the stable link. */
  ariadneUserId?: string | null;
  fountainApplicantId?: string | null;
  email?: string | null;
  fullName?: string | null;
  externalId?: string | null;
}

export type ResolveOutcome =
  | { status: 'matched'; userId: string; provisioned: false; via: 'ariadne_user_id' | 'fountain_applicant_id' | 'email' }
  | { status: 'provisioned'; userId: string; provisioned: true; via: 'created' }
  | { status: 'no_email'; reason: string }
  | { status: 'not_found'; reason: string }
  | { status: 'failed'; reason: string };

/**
 * Resolve an Ariadne identity to an Academy auth user, optionally provisioning.
 *
 * Resolution order (stable id first, mutable email last):
 *   1. profiles.ariadne_user_id
 *   2. profiles.fountain_applicant_id
 *   3. normalised auth email  (then backfill the stable ids)
 *
 * Provisioning is strictly learner-level: the account is created through
 * `auth.admin.createUser`, whose `handle_new_user` trigger assigns the
 * `learner` role. No role ever comes from external claims.
 */
export async function resolveOrProvisionLearner(
  admin: SupabaseClient,
  identity: AriadneIdentity,
  opts: { allowProvision: boolean },
): Promise<ResolveOutcome> {
  const email = normaliseEmail(identity.email);
  const ariadneUserId = isUuid(identity.ariadneUserId) ? identity.ariadneUserId : null;
  const fountainApplicantId = identity.fountainApplicantId?.trim() || null;

  try {
    // 1. Stable Ariadne id.
    if (ariadneUserId) {
      const { data } = await admin
        .from('profiles')
        .select('user_id')
        .eq('ariadne_user_id', ariadneUserId)
        .maybeSingle();
      if (data?.user_id) {
        await stampProfile(admin, data.user_id, identity, ariadneUserId);
        return { status: 'matched', userId: data.user_id, provisioned: false, via: 'ariadne_user_id' };
      }
    }

    // 2. Fountain applicant id.
    if (fountainApplicantId) {
      const { data } = await admin
        .from('profiles')
        .select('user_id')
        .eq('fountain_applicant_id', fountainApplicantId)
        .maybeSingle();
      if (data?.user_id) {
        await stampProfile(admin, data.user_id, identity, ariadneUserId);
        return { status: 'matched', userId: data.user_id, provisioned: false, via: 'fountain_applicant_id' };
      }
    }

    // 3. Email (mutable) — backfill stable ids on hit.
    if (email) {
      const existingId = await findAuthUserByEmail(admin, email);
      if (existingId) {
        await stampProfile(admin, existingId, identity, ariadneUserId);
        return { status: 'matched', userId: existingId, provisioned: false, via: 'email' };
      }
    }

    if (!opts.allowProvision) {
      return { status: 'not_found', reason: 'No matching Academy learner' };
    }
    if (!email) {
      return { status: 'no_email', reason: 'Ariadne identity carries no usable email' };
    }

    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: identity.fullName ?? '' },
    });
    if (createErr || !created?.user) {
      return { status: 'failed', reason: createErr?.message ?? 'createUser failed' };
    }

    await stampProfile(admin, created.user.id, identity, ariadneUserId);
    return { status: 'provisioned', userId: created.user.id, provisioned: true, via: 'created' };
  } catch (e) {
    return { status: 'failed', reason: (e as Error).message };
  }
}

/** Writes the Ariadne identifiers onto the Academy profile (additive only). */
export async function stampProfile(
  admin: SupabaseClient,
  userId: string,
  identity: AriadneIdentity,
  ariadneUserId?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = { source_system: 'fountain' };
  const stableId = isUuid(ariadneUserId) ? ariadneUserId : isUuid(identity.ariadneUserId) ? identity.ariadneUserId : null;
  if (stableId) patch.ariadne_user_id = stableId;
  if (identity.fountainApplicantId) patch.fountain_applicant_id = identity.fountainApplicantId;
  const externalId = identity.externalId ?? identity.fountainApplicantId;
  if (externalId) patch.external_id = externalId;
  if (identity.fullName) patch.full_name = identity.fullName;

  const { error } = await admin.from('profiles').update(patch).eq('user_id', userId);
  if (error && stableId) {
    // A unique-violation on ariadne_user_id means another profile already owns
    // that Ariadne account. Never steal the link — stamp everything else.
    delete patch.ariadne_user_id;
    await admin.from('profiles').update(patch).eq('user_id', userId);
  }
}

/** Paged lookup of an auth user by exact (lowercased) email. */
export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (users.length < 1000) break;
  }
  return null;
}

/**
 * An Academy learner must be active to receive a session: not banned, not
 * soft-deleted, and holding the `learner` capability.
 */
export async function isLearnerActive(
  admin: SupabaseClient,
  userId: string,
): Promise<{ active: boolean; reason?: string }> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return { active: false, reason: 'Academy auth user missing' };
  const user = data.user as unknown as { banned_until?: string | null; deleted_at?: string | null };
  if (user.deleted_at) return { active: false, reason: 'Academy account deleted' };
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return { active: false, reason: 'Academy account suspended' };
  }

  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userId);
  if (!roles || roles.length === 0) return { active: false, reason: 'No Academy roles assigned' };
  return { active: true };
}
