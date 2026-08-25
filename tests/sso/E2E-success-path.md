# SSO end-to-end success path (manual / gated)

The automated suite (`sso-security.test.ts`) covers the repeatable REJECTION
paths. The SUCCESS path needs a real, single-use Ariadne magic-link token, so it
is a manual verification — recorded here because it was run and passed on
2026-08-25, and because it is the canonical procedure for re-verifying after any
change to `sso-from-ariadne` or the shared provisioning module.

## Procedure

1. **Get a real Ariadne carer token** — send a magic link and complete it via API:
   ```sh
   # send (Ariadne project anon key):
   curl -X POST https://hbklqmoywlxbjvpxsxyc.supabase.co/auth/v1/otp \
     -H "apikey: $ARIADNE_ANON" -H "Content-Type: application/json" \
     -d '{"email":"<carer@email>","create_user":false}'
   # read the email, follow the tracker's first redirect to the /auth/v1/verify
   # URL, take its ?token= value, then:
   curl -X POST https://hbklqmoywlxbjvpxsxyc.supabase.co/auth/v1/verify \
     -H "apikey: $ARIADNE_ANON" -H "Content-Type: application/json" \
     -d '{"type":"magiclink","token_hash":"<token>"}'
   # -> access_token (ES256, iss .../auth/v1, aud authenticated)
   ```

2. **Run the exchange** with that token:
   ```sh
   curl -X POST https://qyroautvyzfsgtgwjcur.supabase.co/functions/v1/sso-from-ariadne \
     -H "Authorization: Bearer <ariadne_access_token>" -H "Content-Type: application/json" \
     -d '{"nonce":"<32+ chars>","next":"/my-learning"}'
   ```
   Expect: `{ url: https://grow-shine-campus.lovable.app/sso#token_hash=…, academy_user_id, provisioned, expires_at (~120s) }`.

3. **Assert** (verified 2026-08-25):
   - `academy_user_id` maps to the Academy learner whose `email` equals the carer's.
   - `profiles.ariadne_user_id` is **backfilled** to the Ariadne `sub` after an email match (so the next exchange uses the stable-id path and an email change can't fork the account).
   - `sso_exchange_log` gains a `success` row with `ariadne_sub` + `email`; rejected attempts log neither.
   - Completing the returned `token_hash` via Academy `/auth/v1/verify` establishes an Academy session for the SAME `academy_user_id`.

## Result 2026-08-25
Carer `ginokokas@gmail.com` (Ariadne sub `6a631b59…`) → Academy learner
`d7ccaddd…`, `provisioned:false`, ariadne_user_id backfilled, exchange logged
`success`, Academy session established as `d7ccaddd…`. PASS.
