# Native SSO handoff into the Android Academy app

Goal: tapping "Open training" in the Ariadne carer app opens the installed Academy app, already signed in — no Chrome Custom Tab, no browser chrome.

The proposed design is sound. Three things need correcting or tightening before it will work, and they are the reason this is a plan rather than a one-line manifest edit.

## Findings from the current code

1. **`SsoCallback` reads the FRAGMENT only.** It parses `window.location.hash`; a `?token_hash=…` query string is ignored and the screen falls straight to the "We couldn't sign you in" state. The consultation describes the Ariadne app opening `/sso?token_hash=…`, while `sso-from-ariadne` mints a `#fragment` URL. Whichever is live today, the deep-link path must accept **both**, because an Android intent URI is far more naturally carried in the query and the existing minted link uses the fragment.
2. **Auth storage is safe in the shell.** `brokeredPreviewStorage()` only brokers over postMessage when the host is a Lovable preview zone *and* the page is framed. In Capacitor the origin is `https://localhost` and unframed, so it returns plain `localStorage`. Combined with `persistSession: true` and `autoRefreshToken: true` already set in the client, that answers (d): a signed-in Academy app stays signed in across launches, subject only to the refresh token's own lifetime.
3. **Nothing in `SsoCallback` or the client depends on the public origin.** No `redirectTo`, no `emailRedirectTo`, no origin comparison — it reads the fragment, calls `verifyOtp({ token_hash, type: 'email' })`, clears the hash and navigates. `verifyOtp` with a `token_hash` is origin-agnostic, so (b) is confirmed. One caveat: the minted `type` must match. The function sends `type=email`; the proposed intent example uses `type=magiclink`. `SsoCallback` hardcodes `'email'` and ignores the incoming `type`, so it works either way today — but the intent URI should say `type=email` to avoid a future mismatch.
4. **Routing is `BrowserRouter`** with `/sso` registered, and the SPA is bundled (`webDir: dist`), so an in-app `navigate('/sso?…')` resolves without a network round trip.
5. `ScrollToTop` already guards against a non-selector fragment, so the hash form cannot crash the shell.

## Answers to the questions

**(a) Where launch-URL handling belongs.** Neither `main.tsx` nor a plain page effect. Put it in a single `useNativeSsoHandoff()` hook mounted once **inside** `BrowserRouter` (alongside `ScrollToTop`), so it can call `navigate` rather than manipulating `window.location`:

- On mount: `await App.getLaunchUrl()` — handles the cold start where the intent was already consumed before React mounted.
- Also on mount: register the `appUrlOpen` listener — handles warm receipt under `singleTask`.
- De-duplicate with a module-level `Set` of already-handled URLs (or a single "last handled" ref keyed on the raw URL string). Cold start can deliver the same URL through both channels on some Android versions; the token is single-use, so a double `verifyOtp` would make the second attempt fail and show the error screen on a successful sign-in. The dedupe guard is the whole point of centralising this.
- Remove the listener on unmount.

`main.tsx` is the wrong place because it has no router context and would force a full-page `location.replace`, remounting the app and racing the auth listener.

**(b) Confirmed** — see finding 3. Nothing origin-bound. Worth adding a defensive check that the deep link's `next` passes the existing `safeNext` rules; it already does inside `SsoCallback`, so no new validation is needed as long as the query is forwarded verbatim and not reassembled.

**(c) No objection to replacing the session.** Same-as-web is the right behaviour and the honest one: the handoff carries an explicit identity assertion from Ariadne, so the incoming user wins. Two refinements: sign the previous session out first (or let `verifyOtp` replace it — it does), and because `useAuth` clears the React Query cache only on `SIGNED_OUT`, a straight user swap could leave the previous learner's cached queries in memory. Add a cache clear when the authenticated user id changes, not just on sign-out. That is a small, contained change in `useAuth` and worth doing regardless of this feature.

**(d) Confirmed** — `persistSession: true`, `autoRefreshToken: true`, and `localStorage` in the shell (finding 2).

**(e) Other flags.**

- **Query + fragment support in `SsoCallback`** is required, not optional (finding 1). Read the fragment first, fall back to the query, then clear both from the URL.
- **Fallback when the app isn't installed.** The Ariadne side owns this, but the contract should state it: explicit intent fails when the Academy app is absent, so Ariadne must catch `ActivityNotFoundException` and fall back to the existing Custom Tab URL. Otherwise "Open training" silently does nothing for anyone without the app.
- **Don't add a second intent-filter for `https://grow-shine-campus.lovable.app`** (App Links) in this phase. It requires a `assetlinks.json` on the domain and would start hijacking ordinary web links to the site. Custom scheme only.
- **Android 12+ / `singleTask`:** the existing `launchMode="singleTask"` and `exported="true"` are already correct. Add `android:autoVerify` — no; add `<data android:scheme="uk.org.specialpeople.academy" android:host="sso" />` inside a new `<intent-filter>` with `VIEW` action, `DEFAULT` and `BROWSABLE` categories. The `configChanges` list already covers the rotation case. The splash behaves normally because the process is reused on warm receipt; on cold start the launch URL is read after mount, so the "Signing you in…" screen is what the carer sees.
- **Server-side logging is already sufficient.** `sso_exchange_log` records the exchange at mint time with outcome, mapped user, ip and ua. Adding a client-side "handoff consumed" write would need a new anon-writable path for an unauthenticated caller — not worth the surface. If completion visibility is genuinely wanted later, do it as an authenticated post-`verifyOtp` call, not before.
- **Guarding `/sso`:** no guard needed or wanted. It must stay public and it already refuses without a token, checks expiry, checks the nonce when one was stored, and clears the URL immediately. It should stay `noindex` (it is).
- **`type` value alignment:** intent URIs should use `type=email` to match what the function mints (finding 3).

## Scope of the change when approved

- `android/app/src/main/AndroidManifest.xml` — add the `sso` scheme intent-filter to `MainActivity`.
- `package.json` — add `@capacitor/app`.
- New `src/hooks/useNativeSsoHandoff.ts` — launch URL + `appUrlOpen`, deduped, navigates to `/sso?<query verbatim>`.
- `src/App.tsx` — mount the hook once inside `BrowserRouter`.
- `src/pages/SsoCallback.tsx` — accept the token from the fragment **or** the query; clear both.
- `src/hooks/useAuth.tsx` — clear the React Query cache on user-id change, not only on `SIGNED_OUT`.
- `supabase/functions/sso-from-ariadne/README.md` — document the native intent form and the not-installed fallback for the Ariadne team.

Untouched: the edge functions' logic, JWKS verification, replay guard, rate limits, audit rows, role provisioning, and every learner surface outside `/sso`.

## Verification when built

- Cold start: kill the app, fire the intent with `adb shell am start -a android.intent.action.VIEW -d "uk.org.specialpeople.academy://sso?token_hash=…&type=email&next=/my-learning" -p uk.org.specialpeople.academy` → lands signed in on `/my-learning`.
- Warm start: app in background on another screen, same intent → same result, no second app instance.
- Double-delivery: confirm only one `verifyOtp` fires (single audit-free success, no error screen flash).
- Bad/expired token: honest failure screen, no crash, URL cleared.
- Relaunch from the launcher afterwards: still signed in.
