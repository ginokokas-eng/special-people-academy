# Plan: Fix Ariadne SSO repeat-tap replay bug

## Recommendation

Yes: change replay protection from `(ariadne_sub, token_iat)` to `(ariadne_sub, nonce)`.

The current guard treats one Ariadne access token as one allowed Academy entry. That is too strict because the Ariadne app correctly reuses the same valid access token until it nears expiry. The security property we actually need is: the same exchange request cannot be replayed. A per-request nonce is the right primitive for that.

## Answers to the specific questions

### a) Nonce-keying vs keeping `(sub, iat)`

Use `(ariadne_sub, nonce)`.

What we keep:
- Replayed exchange requests with the same nonce are refused.
- Intercepted returned magic links remain single-use because `verifyOtp` consumes the `token_hash`.
- Stolen Ariadne access tokens are still bounded by token expiry, JWKS verification, rate limits, learner eligibility checks, and audit logs.

What we deliberately stop doing:
- Blocking the same legitimate learner from starting training again while their Ariadne token is still valid.

I would not keep `(sub, iat)` as an additional hard guard because it preserves the bug. It could be kept only as an audit/debug field, not as a uniqueness key.

### b) Should nonce become mandatory?

Recommended rollout:

1. **For this fix:** make nonce mandatory for `sso-from-ariadne` because it becomes load-bearing replay protection.
2. **Before deploying:** confirm the tester Ariadne build currently sends a nonce in every exchange request.
3. **If confirmed:** reject missing/invalid nonce with `400 invalid_request`, not `403 sso_denied`.
4. **If not confirmed:** do not deploy the mandatory backend change until the Ariadne app build is updated, otherwise old tester builds will fail every launch.

Why `400`:
- Missing nonce is a caller contract error, not an authentication failure and not an eligibility denial.
- It stays distinguishable from:
  - `401 ariadne_token_invalid` = refresh Ariadne token and retry once.
  - `403 sso_denied` = genuine not eligible / inactive / replayed request / mint failure.
  - `429 rate_limited` = back off.
  - `503 sso_disabled` = training temporarily unavailable.

A replayed nonce should still return the existing generic `403 sso_denied` so attackers cannot enumerate internal reasons.

### c) Nonce format and TTL

Use a strict, boring format:

- Required string.
- Length: 16–128 characters.
- Allowed characters: URL-safe base64/base64url style, e.g. `A-Z a-z 0-9 _ - . ~`.
- Recommended caller generation: at least 128 bits of randomness, e.g. 16 random bytes encoded as base64url.

Guard row TTL:
- Store `expires_at = min(Ariadne token exp, now + 10 minutes)`.
- Reason: the replay window only needs to cover the exchange attempt, not the full one-hour token lifetime.
- Keep opportunistic cleanup of expired rows.

Returned magic-link expiry remains unchanged at `≤120 seconds`.

### d) Ariadne-side retry behaviour

Do not blindly retry all `403 sso_denied` responses with a fresh token.

`403` deliberately covers genuine denials: inactive learner, no email, not eligible, replayed nonce, and mint failure. A forced token refresh would add noisy duplicate calls and may mask real account issues.

Recommended Ariadne behaviour:
- `401 ariadne_token_invalid`: refresh Ariadne token and retry once.
- `400 invalid_request`: regenerate nonce and retry once only if the client can prove it accidentally sent a malformed/missing nonce; otherwise show a technical error/update-required message.
- `403 sso_denied`: no automatic token-refresh retry; show the existing “Training isn’t available for your account yet — contact your manager” copy.
- `429`: back off.
- `503`: temporary unavailable message.

### e) Other places with the once-per-token assumption

Confirmed touchpoints:
- `sso-from-ariadne` is the only place using `sso_replay_guard` and `(ariadne_sub, token_iat)` uniqueness.
- `sso-logout` verifies the Ariadne token and maps the learner, but does not use replay guard. Repeated logout calls are acceptable/idempotent from the caller perspective.
- `sync-learners-from-ariadne` is a bulk sync path and does not use this replay guard.
- `/sso` callback already uses the returned `token_hash`; its single-use semantics come from `verifyOtp`, not the replay table.

## Smallest correct implementation

### Database migration

Add nonce support without destructive changes:

```sql
ALTER TABLE public.sso_replay_guard
  ADD COLUMN IF NOT EXISTS nonce text;

CREATE UNIQUE INDEX IF NOT EXISTS sso_replay_guard_ariadne_sub_nonce_key
  ON public.sso_replay_guard (ariadne_sub, nonce)
  WHERE nonce IS NOT NULL;

CREATE INDEX IF NOT EXISTS sso_replay_guard_sub_created_idx
  ON public.sso_replay_guard (ariadne_sub, created_at DESC);
```

Do not drop `token_iat` immediately. Keep it populated for audit/debug compatibility and avoid risky destructive migration during the live test window. It can be relaxed or removed later after the new flow has burned in.

### Edge function: `sso-from-ariadne`

Make these surgical changes only:

1. Parse the request body before inserting into `sso_replay_guard`.
2. Validate `nonce` as required.
3. On missing/invalid nonce, audit `invalid_nonce` and return `400 invalid_request`.
4. Insert replay guard row with:
   - `ariadne_sub`
   - `token_iat` still populated for debugging
   - `nonce`
   - `expires_at = min(claims.exp, now + 10 minutes)`
5. Treat unique violation on `(ariadne_sub, nonce)` as replay and return the existing generic `403 sso_denied`.
6. Keep all existing JWKS, rate limit, resolution, inactive learner, provisioning, and magic-link logic unchanged.

### Documentation update

Update the `sso-from-ariadne` mobile contract:
- `nonce` is required.
- It must be fresh per tap/exchange.
- The same nonce must not be reused after an error unless the caller is retrying the identical network request after an unknown transport failure.
- Missing/invalid nonce returns `400 invalid_request`.

## Testing before release

Run these checks against the deployed function after migration + deployment:

1. Missing Authorization still returns `401 ariadne_token_invalid`.
2. Malformed/forged token still returns generic `401` without internal detail.
3. Valid-shaped request with missing nonce, if a real Ariadne token is available from Ariadne-side testing, returns `400 invalid_request`.
4. Real Ariadne app smoke test:
   - tap Open training once: success
   - return to Ariadne
   - tap Open training again within the same hour/token: success
   - replay the exact same exchange request/nonce: `403 sso_denied`
5. Confirm `sso_exchange_log` shows the first and second fresh taps as `success`, and only repeated nonce attempts as `replayed`.

## What must be redeployed manually

Required:
- Apply the new database migration.
- Manually deploy **`sso-from-ariadne`**.

Not required:
- `sso-logout` does not need redeploying.
- `sync-learners-from-ariadne` does not need redeploying.
- The Android Academy app does not need a new build for this backend replay fix.

Ariadne app requirement:
- No Ariadne app change is needed if the current tester build already sends a fresh nonce per tap.
- If any active Ariadne build does not send nonce, update Ariadne first or keep the backend nonce requirement behind a short compatibility window.
