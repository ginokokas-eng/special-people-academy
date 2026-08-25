# sso-from-ariadne — mobile contract

Token exchange so an Ariadne-authenticated carer lands in the Academy already
signed in. The Ariadne app implements the caller half.

## Request

```
POST https://<academy-project>.supabase.co/functions/v1/sso-from-ariadne
Authorization: Bearer <ARIADNE access_token>     (required)
Content-Type: application/json

{
  "next": "/my-learning",            // optional, internal path only
  "nonce": "<fresh random 16-128 chars>"   // REQUIRED, new value per tap
}
```

`nonce` is **required** and must be **freshly generated for every exchange
request** (recommended: 32 random bytes, base64url — 43 chars). Allowed charset
`A-Z a-z 0-9 . _ ~ -`, length 16–128. It is the replay key: the pair
(Ariadne `sub`, `nonce`) may be exchanged **once**, so reusing a nonce returns a
generic `403 sso_denied`. A missing or malformed nonce returns
`400 invalid_request`. Note the same Ariadne access token may legitimately be
used for many taps within its lifetime — only the nonce must change.

The Ariadne token is verified offline against Ariadne's public JWKS
(`https://hbklqmoywlxbjvpxsxyc.supabase.co/auth/v1/.well-known/jwks.json`),
issuer pinned to `https://hbklqmoywlxbjvpxsxyc.supabase.co/auth/v1`, audience
`authenticated`, ES256/RS256 only. Verification fails closed.


## Response `200`

```json
{
  "url": "https://<academy>/sso#token_hash=...&type=email&next=/my-learning&expires_at=...&nonce=...",
  "expires_at": "2026-08-24T22:20:00.000Z",
  "academy_user_id": "uuid",
  "provisioned": false
}
```

Open `url` in a **system browser tab** (`ASWebAuthenticationSession` on iOS,
Custom Tabs on Android) — not an embedded WebView. Store the `nonce` you sent in
the web app's `sessionStorage` under `academy_sso_nonce` if you control that
context; the callback checks it when present. Links are single-use and treated as
valid for **≤120 seconds** — run the exchange fresh on every entry rather than
caching `url`.

## Preferred path: native hand-off into the Academy Android app

When the Academy app (`uk.org.specialpeople.academy`) is installed, do **not**
open a browser tab. Launch the app directly with an **explicit** intent so no
other app can intercept it:

```
uk.org.specialpeople.academy://sso?token_hash=<hashed_token>&type=email&next=/my-learning
```

```kotlin
val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
    setPackage("uk.org.specialpeople.academy")
}
try {
    startActivity(intent)
} catch (e: ActivityNotFoundException) {
    // Academy app not installed — fall back to the browser-tab flow above.
    openCustomTab(response.url)
}
```

Contract details:

- Take `token_hash` from the `url` fragment returned by this function (or use the
  fragment form `…://sso#token_hash=…` — the app accepts query **or** fragment).
- `type` must be **`email`** — that is what `generateLink({ type: 'magiclink' })`
  produces and what the callback verifies. Do not send `type=magiclink`.
- `next` must be an internal path (single leading `/`, no scheme or host);
  anything else falls back to `/my-learning`.
- The link is still single-use and ≤120s — mint one per tap, never cache it.
- **Not-installed fallback is the caller's responsibility.** An explicit intent
  throws `ActivityNotFoundException` when the app is absent; catch it and open
  the Custom Tab URL, otherwise "Open training" silently does nothing.
- If a different learner is already signed in inside the Academy app, the
  incoming hand-off replaces that session.


## Errors the app must handle

| Status | `error` | Meaning | App behaviour |
| --- | --- | --- | --- |
| 401 | `ariadne_token_invalid` | Missing/expired/untrusted Ariadne token | Refresh the Ariadne session, retry once |
| 403 | `sso_denied` | Not eligible (no email, inactive/suspended learner, replayed token, mint failure) | Show "Training isn't available for your account yet — contact your manager" |
| 429 | `rate_limited` | 10/min or 60/hr exceeded per user or IP | Back off, retry later |
| 503 | `sso_disabled` | Kill-switch off (`platform_settings.ariadne_sso.enabled`) | Show "Training is temporarily unavailable" |
| 5xx / network | — | Academy down | Show retry affordance |

`403` is deliberately a single generic code — the specific reason is only ever
written to the `sso_exchange_log` audit table.

## sso-logout (optional hard revocation)

```
POST /functions/v1/sso-logout
Authorization: Bearer <ARIADNE access_token>   → { "revoked": true }
```

Call it while the Ariadne token is still valid, at carer sign-out. It revokes
every Academy session for the mapped learner. `{ "revoked": false }` means there
was no mapped Academy account — treat as success.

## Identity mapping

`profiles.ariadne_user_id` (stable, from the token `sub`) →
`profiles.fountain_applicant_id` → normalised email, with the stable ids
backfilled on an email hit. Unknown carers are provisioned inline with the
`learner` role only — roles never come from external claims.
