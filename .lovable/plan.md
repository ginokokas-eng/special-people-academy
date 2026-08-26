# Native App Shell for the Android build

Goal: when running inside the Capacitor shell, the app boots into the learner's own content and wears native chrome (bottom tabs, collapsing headers, edge-to-edge). Web, desktop and the marketing site render exactly as they do today.

## Answers to your four questions

**1. What already exists for Certificates and Profile**
- `/certificates` (`src/pages/Certificates.tsx`) — real page: fetches the learner's certificates, download via the issue-certificate path. Reuse as-is inside the Certificates tab.
- `/profile` (`src/pages/Profile.tsx`) — real page: full name, job title, department, avatar, save. Reuse as-is; in native we add org name + Sign out to it (both currently only reachable from the web header dropdown, which native removes).
- `/my-learning` (`src/pages/MyLearning.tsx`) — enrolled courses with progress; the Learn tab and the boot destination.
- All three currently wrap themselves in `DashboardLayout` (web navbar: logo, search, phone/support, bell, hamburger, avatar dropdown). That wrapper is the single thing to swap in native.

**2. Where the native gate goes — one seam**
`DashboardLayout` is already the common wrapper for every learner page (My Learning, Certificates, Profile, My Courses, Notifications, Dashboard). So:
- Add `src/lib/native.ts` → `isNative()` (a memoised `Capacitor.isNativePlatform()`, safe on web) plus a `useIsNative()` hook.
- Inside `DashboardLayout`, when native, render `NativeShell` instead of the web header/footer chrome and pass children straight through. Zero per-page edits, zero route restructuring, and any page that already uses `DashboardLayout` inherits the shell.
- `NativeShell` (`src/components/native/NativeShell.tsx`) owns: safe-area padding, collapsing large-title header, the content cross-fade, and `NativeTabBar`.
- Two small extra native conditionals are unavoidable and are the only ones outside the shell:
  - `Index.tsx` (or a boot guard mounted next to `NativeSsoHandoff`): native + session → replace to `/my-learning`; native + no session → `NativeWelcome`. Never the marketing homepage.
  - `Courses.tsx` — native hides the editorial headline block and goes straight to search + facet chips + grid, and `PublicLayout` suppresses navbar/footer/cart in native so course detail and catalogue sit inside the shell.

This is a presentation-layer swap only; no route table changes, no auth changes.

**3. Pages that must render OUTSIDE the tab shell**
They already do, because they don't use `DashboardLayout` — we simply must not wrap the router:
- `/sso` (SsoCallback) — must stay bare; the deep-link handoff and `useNativeSsoHandoff` are untouched.
- `/invite`, `/verify/:code` — token/one-shot flows, no tabs, no back chevron into learner content.
- `/auth` and the native welcome screen — pre-session, no tabs.
- `/courses/:id/learn`, `/courses/:courseId/quiz`, `/scorm/launch/*` — immersive; they keep their own header/mobile player and get **no** tab bar (full-bleed, back chevron only). This is why wrapping the router globally would be wrong.
- `/admin-portal/*`, `/org` — out of scope, `PortalLayout`, unchanged.

**4. Status bar / safe area for this shell**
Checked `android/`: `variables.gradle` is `compileSdk 36 / targetSdk 36`, `styles.xml` has no `windowTranslucentStatus`/`enforceNavigationBarContrast` handling, and no safe-area or status-bar plugin is installed (`package.json` has only `@capacitor/core`, `@capacitor/android`, `@capacitor/app`). So today the window is not edge-to-edge and, on targetSdk 35/36, Android reports **zero** webview safe-area insets — the same failure your sister app hit. Recommendation, matching that fix:
- Add `@capacitor/status-bar` (transparent status bar, overlay web view, dark icons on the light violet canvas) **and** `@capacitor-community/safe-area` so `--safe-area-inset-top/bottom` CSS vars are actually injected. Config-only will not be enough at targetSdk 36.
- `index.html` viewport gets `viewport-fit=cover`.
- Shell CSS uses `max(env(safe-area-inset-top), var(--safe-area-inset-top, 0px))` so it degrades gracefully if the plugin is absent.
- Native asset changes require the user to pull the repo and run `npx cap sync` before the insets appear on device.

## What gets built

**A. Native shell**
- `NativeShell` + `NativeTabBar`: 4 tabs — Learn (`/my-learning`, default), Catalogue (`/courses`), Certificates (`/certificates`), Profile (`/profile`).
- Tab bar: `.material-chrome` translucency (blur + saturate) already in `index.css`, scroll-edge fade instead of a hairline, `env(safe-area-inset-bottom)` padding, ≥56dp targets, active = filled icon + violet label, inactive = outline + muted, `.pressable` press feedback. No hamburger in native.
- Header: per-tab large title that collapses on scroll into an inline `.material-chrome` bar — generalising the pattern `CourseLearn` already uses. No logo, cart, phone or bell; contextual actions only. Drill-downs get back chevron + inline title.

**B. Edge-to-edge**: transparent status bar, canvas runs underneath, safe-area padding on headers and tab bar.

**C. Strip web furniture in native**: no cart icon or cart/checkout routes surfaced, no purchase CTAs (Play-policy safe — digital purchases stay on the web), no phone/support icon, no marketing footer, no catalogue headline. Keep browse, course detail, and the "included in your plan" / enrol-free affordances.

**D. Feel**: ~200ms cross-fade on tab switches (no slide), `prefers-reduced-motion` respected, `-webkit-tap-highlight-color: transparent` + `user-select: none` on chrome only, `overscroll-behavior: none` on the shell to kill bounce-chaining.

**E. Untouched**: web/desktop rendering, marketing pages, lesson player internals, admin portal, `/org`, SSO/auth flows, `useNativeSsoHandoff`.

## Technical notes

- New: `src/lib/native.ts`, `src/components/native/NativeShell.tsx`, `NativeTabBar.tsx`, `NativeHeader.tsx`, `NativeWelcome.tsx`, `useCollapsingHeader.ts`.
- Edited (native-gated branches only): `DashboardLayout.tsx`, `PublicLayout.tsx`, `Courses.tsx`, `Index.tsx`, `Profile.tsx` (org + sign out), `index.css` (shell utilities), `index.html` (viewport-fit), `capacitor.config.ts` + `styles.xml` (status bar), `package.json` (two plugins).
- Icons come from `@/components/icons` (Aperture set) — no direct lucide imports.
- Colours/blur via existing semantic tokens; no hardcoded hex in components.
- Verification: typecheck + build, plus a Playwright pass at 390x844 with the native flag forced on to confirm boot tab, tab bar, collapsed header and absence of cart/footer/headline — and a web pass confirming the marketing site is byte-identical in behaviour.

## Flagged risks

- One real conflict: `Courses.tsx` and `CourseDetail` live under `PublicLayout`, which is also the marketing wrapper. Native gating happens inside `PublicLayout` rather than by moving routes, so marketing pages keep their exact chrome.
- `useGeneralSettings().learnerCoursesNavDestination` currently rewrites a learner nav item; the native tab set ignores that setting (Catalogue is always `/courses`). Say the word if it should still be honoured.
- Native plugin additions only take effect after the user pulls and runs `npx cap sync`.
