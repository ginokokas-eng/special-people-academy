# Cross-app SSO: Ariadne mobile app → Academy

Architecture recommendation only. No code changes in this plan.

## 1. Recommended pattern

Build the token-exchange edge function in this project, essentially as you described. It is the right call.

```text
Ariadne app (Capacitor)
  |  POST /functions/v1/sso-from-ariadne
  |  Authorization: Bearer <Ariadne access token>
  v
sso-from-ariadne (this project, service role)
  1. verify Ariadne JWT via Ariadne JWKS (iss/aud/exp/alg pinned)
  2. map Ariadne sub -> Academy user (provision if needed, learner role only)
  3. auth.admin.generateLink({ type: 'magiclink' }) -> token_hash
  4. return { url: https://academy/sso#token_hash=...&type=magiclink, expires_at }
  v
Academy /sso route -> supabase.auth.verifyOtp({ token_hash, type:'email' })
  -> session established -> redirect to /my-learning (or validated deep path)
```

Why this over the alternatives:

- **Supabase third-party / custom JWT acceptance** (Academy trusts Ariadne-issued JWTs directly): tempting, but it makes Ariadne's signing key a permanent authority over Academy identities, and Academy RLS is written against `auth.uid()` of *Academy* users. You would need identity aliasing everywhere, and role escalation risk moves into another team's token claims. Reject.
- **Shared auth project** (both products on one Supabase auth): cleanest in theory, but it is a migration of two live products with separate RLS, separate user tables, separate compliance posture. Violates the no-rebuild constraint. Reject.
- **Full OIDC broker** (Auth0/Keycloak/WorkOS in front of both): correct for 5+ relying parties, overkill for two apps you both own, and it means re-platforming Academy auth. Revisit only if a third-party customer ever needs to federate their own IdP.
- **Token exchange + magiclink verifyOtp**: no new infrastructure, no new vendor, Academy remains the sole issuer of Academy sessions, Ariadne is only ever an *assertion* source. Same endpoint later serves a standalone Academy wrapper by swapping the verifier (see §5 note on `provider`). Build this.

One refinement to your sketch: verify the Ariadne token by **JWKS, not** a server-side `getUser` call against Ariadne. JWKS is offline, cached, no round-trip on the hot path, and does not require holding Ariadne API credentials here. Keep a `getUser` fallback only if Ariadne uses opaque/legacy tokens.

## 2. Identity mapping

Yes — move off email as the join key.

- Extend the sync path to persist the Ariadne auth user id on the Academy profile. `profiles` already has `external_id`, `fountain_applicant_id`, `source_system`; add a dedicated `ariadne_user_id uuid` (unique, nullable) rather than overloading `external_id`, which currently carries the Fountain applicant id.
- Exchange resolution order: `ariadne_user_id` → `fountain_applicant_id` → normalised email (lowercased/trimmed). On an email-only match, backfill `ariadne_user_id` so the next exchange takes the fast, stable path.
- Email differs (carer changed it in Ariadne): stable id wins, no new account created; optionally record the divergence in `user_sync_log` for admin review. Never treat a *new* email as a new learner if the Ariadne sub already maps.
- Learner does not exist yet: auto-provision inline, reusing the existing sync logic (extract it into a shared module so `sync-learners-from-ariadne` and the exchange cannot drift). Provisioning creates the auth user with `email_confirm: true`, lets `handle_new_user` seed the profile + `learner` role, then stamps the Ariadne identifiers. **Never** read a role from external claims; staff roles remain owned by `staff_profiles` / `sync_staff_role`.
- If the Ariadne token carries no email at all, fail closed (`403 unprovisioned`) rather than inventing a synthetic address.

## 3. Security invariants the exchange must enforce

Token verification
- Signature via Ariadne JWKS, key id matched, algorithm allow-list (no `none`, no HS/RS confusion).
- `iss` pinned to Ariadne's exact issuer URL, `aud` pinned, `exp`/`nbf` checked with ≤60s clock skew.
- Reject tokens whose `sub` is missing, or whose `role` claim is not `authenticated`.
- Cache JWKS with a short TTL and refresh on unknown `kid`, but never fall back to "unverified" on fetch failure.

URL-borne material
- Return the magiclink hash in the **fragment** (`#token_hash=...`), never the query string — fragments are not sent to servers, not written to access logs, and not captured by referrers.
- Short TTL (Supabase link default is long; treat it as ≤120s by also returning `expires_at` and having `/sso` refuse anything older) and single use — `verifyOtp` consumes it; the callback must clear `location.hash` immediately after.
- `/sso` must render nothing from the fragment and must not log it.

Abuse control
- Rate limit per Ariadne `sub` and per IP (e.g. 10/min, 60/hour) with a `user_sync_log`-style audit row per exchange: outcome, mapped user id, ip, user agent.
- Replay defence: record `jti`/`sub`+`iat` of accepted Ariadne tokens for the token's remaining lifetime and refuse repeats; combined with single-use magiclinks this closes both legs.
- Never mint a session for a disabled/soft-deleted Academy learner; check `is_active`-style state before generating the link.

Redirect safety
- The exchange builds the Academy URL server-side from a configured origin. Any `next` path the app supplies must be validated against an allow-list of internal paths (must start `/`, no `//`, no scheme, no host) — otherwise ignore it and use the default landing route.

Secret hygiene
- Only Ariadne's issuer URL and expected audience need to live here (public values). If a fallback `getUser` is kept, its key is a read-only Ariadne credential stored in Project Settings → Secrets, used server-side only, never returned in a response or logged.
- Service-role key stays inside the function; the response body contains only the callback URL and expiry.
- `verify_jwt = false` for this function (the caller presents an Ariadne token, not an Academy one) — which makes the invariants above load-bearing, not optional.

Additions you did not list
- **CSRF/initiator binding**: have the app generate a nonce, send it with the exchange, and require it back on `/sso` (sessionStorage) so a leaked URL cannot be completed in a different browser context.
- **Kill switch**: a platform setting to disable Ariadne SSO instantly without a deploy.
- **Error responses must not enumerate** — "unprovisioned" vs "not found" should be one generic 403 to the client, with the detail only in the audit log.

## 4. Session lifecycle on mobile

- **Surface**: system browser tab — Android Custom Tabs / iOS `ASWebAuthenticationSession`/`SFSafariViewController` — not an embedded WebView. Reasons: real cookie/storage isolation, no in-app-browser storage quirks that break Supabase session persistence, App Store/Play policy comfort for auth flows, and it keeps the Academy web app single-codebase. An embedded WebView is only worth it if you need deep chrome integration; you don't.
- **Re-run the exchange on every entry**: yes, agreed. It is idempotent, cheap, always reflects current Ariadne auth state and current provisioning, and it means no Academy refresh token has to be trusted to survive inside another product's app. Treat the Academy session as ephemeral per visit.
- Because of that, the Academy session in the SSO tab should be **short-lived and non-persistent where possible**: land, do the training, close the tab. Do not attempt to share the session back into the Ariadne app.
- **Logout**: be honest about the limits. When the carer signs out of Ariadne, the app should (a) stop offering the Training entry point, and (b) best-effort close/discard the Custom Tab. Realistically you cannot reach into a system browser tab and revoke an Academy session from Ariadne. Mitigations that actually work: short Academy session lifetime in this flow, `verifyOtp` sessions treated as one-visit, and — if you need hard revocation — an authenticated `sso-logout` endpoint Ariadne calls on sign-out that runs `auth.admin.signOut(user_id, scope: 'global')` for the mapped learner. That is the only reliable invalidation, and it is a small addition to the same contract.
- Biometric unlock stays entirely on the Ariadne side; the Academy never sees it.

## 5. Contract for the Ariadne side

**Request**

```http
POST https://<academy-functions-host>/functions/v1/sso-from-ariadne
Authorization: Bearer <Ariadne Supabase access_token>
Content-Type: application/json

{ "nonce": "<random 32+ chars>", "next": "/my-learning" }   // next optional
```

- No Academy API key required; the Ariadne bearer token is the credential.
- `next` must be an internal Academy path; anything else is ignored.

**Success — 200**

```json
{
  "url": "https://<academy>/sso#token_hash=...&type=magiclink&nonce=...",
  "expires_at": "2026-08-24T21:48:00Z",
  "academy_user_id": "uuid",
  "provisioned": false
}
```

The app opens `url` in a Custom Tab / ASWebAuthenticationSession. It must not parse, store, or log the fragment.

**Errors the app must handle**

| Status | `code` | Meaning | App behaviour |
| --- | --- | --- | --- |
| 401 | `ariadne_token_invalid` | expired/bad Ariadne token | refresh Ariadne session, retry once; else send user to Ariadne login |
| 403 | `not_eligible` | no matching learner and auto-provision refused (no email, inactive) | show "Training isn't set up for your account yet — contact your training team" |
| 403 | `sso_disabled` | kill switch on | show maintenance copy |
| 429 | `rate_limited` | too many exchanges | back off, respect `Retry-After` |
| 5xx / timeout | `unavailable` | Academy or exchange down | "Training is temporarily unavailable, try again shortly"; never fall back to a manual login form |

**Optional logout call (recommended)**

```http
POST /functions/v1/sso-from-ariadne?action=logout
Authorization: Bearer <Ariadne access_token>
```
→ `204`, global sign-out of the mapped Academy learner. Fire-and-forget on Ariadne sign-out.

**Standalone Academy wrapper later**: the same endpoint gains a `provider` dimension (`ariadne` today) whose verifier config is looked up server-side; a first-party Academy wrapper simply authenticates against Academy Supabase directly and needs no exchange at all.

## Build order when approved

1. Migration: `profiles.ariadne_user_id` (unique) + backfill from existing email matches; extract shared provisioning module.
2. `sso-from-ariadne` edge function (verify → map/provision → generateLink → fragment URL), `verify_jwt = false`, audit rows in `user_sync_log`.
3. `/sso` public route: read fragment, check nonce + expiry, `verifyOtp`, clear hash, redirect to validated path; hard-fail states with plain copy.
4. Rate limiting + replay table + kill-switch platform setting.
5. Optional `?action=logout`.
6. Hand the §5 contract to the Ariadne team; test with a real carer account end to end on both platforms.
