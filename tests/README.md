# Tests

Two integration suites covering the mobile/SSO surface.

## SSO security invariants — `tests/sso/sso-security.test.ts`
Runs against the **deployed** `sso-from-ariadne` edge function and locks in its
auth hygiene: no/malformed token, HS256 algorithm-confusion, `alg:none`,
wrong-issuer, and wrong HTTP method must all be rejected without leaking why.

```sh
deno test --allow-net --allow-env tests/sso/sso-security.test.ts
# target another project: SSO_FN_URL=https://…/functions/v1/sso-from-ariadne deno test …
```

## Android shell integration — `tests/mobile/academy-android.yaml`
[Maestro](https://maestro.mobile.dev) flow proving the Capacitor WebView boots
the bundled build and reaches live, real-database surfaces (course catalogue +
the published demo course).

```sh
# 1. emulator up + APK installed:
#    (cd android && ./gradlew assembleDebug) && adb install -r android/app/build/outputs/apk/debug/app-debug.apk
# 2. run:
maestro test tests/mobile/academy-android.yaml
```

Selectors match the WebView accessibility tree, so they use the on-screen
labels verbatim (e.g. `All courses 12`, `Mandatory 0`). The build must be
BUNDLED (not a hosted `server.url`) — the Lovable preview origin is auth-gated.
