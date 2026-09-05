# Site walkthrough audit — verified causes, corrections, one-turn fix list

I read the code behind every item. Below: confirmed / corrected, then a single prioritised build list and what I'd deliberately leave out.

## A. Navbar

- **A1 — confirmed, your fix is right.** `navigationMenuTriggerStyle()` includes `focus:bg-accent focus:text-accent-foreground`; the Navbar's trigger class list overrides only the backgrounds (`focus:!bg-transparent`) and never the text colour, so on focus the label becomes accent-foreground (white) on transparent. Add `focus:!text-[hsl(259_72%_14%)]` to both triggers and keep `data-[state=open]:!text-[hsl(262_83%_58%)]`. Slightly better: also add `focus-visible:` ring parity so keyboard focus is visible, since the trigger currently has no visible focus state at all once the accent background is suppressed.
- **A2 — content decision, not a bug.** The arrays are real code (`forOrganisationsLinks`, `resourcesLinks`), and 4 of 6 org links and 3 of 6 resource links point at `/enterprise` / `/help-center`. Existing distinct destinations are `/partners`, `/case-studies`, `/blog`, `/webinars`, `/help-center`, `/enterprise`. I'd trim to distinct destinations now (org: Care Homes/Domiciliary/Supported Living/NHS collapse into one "For care providers" → `/enterprise`, keep Local Authorities and Multi-site) and re-expand when the pages exist. **Your call on wording** — flagging.

## B. Courses

- **B1 — confirmed in principle, needs Publish.** The preview and the published app are separate deploys; code changes only reach `grow-shine-campus.lovable.app` after a publish. The RLS migration, though, applies to the shared backend immediately, so the live site's empty-lesson symptom is already fixed while the chips are not.
- **B2 — confirmed.** `EditorialCourseCard.formatDuration` returns `"—"` for null/0. Better than hiding just the text: hide the whole badge when there's no duration, and keep the dash nowhere. Note the root cause is missing lesson durations in the data — the Course Builder duration audit fills those.
- **B3 — confirmed.** Category renders twice (pill on the frame, eyebrow under). Drop the pill; the eyebrow is the accessible, non-overlapping one.
- **B4 — correct diagnosis, partly already there.** The card is already `flex flex-col h-full` with an `mt-auto` meta row, but the CTA sits *after* that row and is rendered for every card, disabled when there's no offering, and `opacity-0` until hover — so non-purchasable cards reserve an invisible button's height. Fix: render the CTA only when `offeringId` exists (and not native).
- **B5 — confirmed.** Header is `bg-white/90` (scrolled) / `bg-white/85` (top). Raise both toward `.97`.
- **B6 — corrected: this is mostly data, not code.** Footer social hrefs come from branding settings (`socialLinks.linkedin` etc.), already conditionally rendered — the `YOUR_LINKEDIN_URL` values are stored settings, fixable in Admin → Branding without a build. The code fix worth doing is treating placeholder-looking values as absent. `Company No. 12345678` **is** hardcoded in `Footer.tsx` and should be removed until real.

## C. About

- **C1 — agreed, product decision.** Six bracketed placeholder names ship live. I'd remove the section this turn; restoring it later is trivial. **Your call.**
- **C2 — confirmed.** 5 items in a 3-col grid. Cleanest here: keep 3 columns and let the last row centre (`lg:[&>*:nth-child(4)]:col-start-1` is fragile) — simpler is a 5-up auto-fit grid at `lg`.
- **C3 — confirmed, copy decision.** The About subtitle describes life-skills training for "special individuals… families, educators", contradicting the homepage's UK care-workforce positioning. Needs your words, not my invention. **Flagged, no code.**

## D. Sign in

- **D1 — confirmed, and it is not fixable from here today.** `useAuth.sendEmailCode` calls `supabase.auth.signInWithOtp` (`shouldCreateUser: false`), which renders the managed **Magic Link** template. That template is Lovable-managed (`no-reply@auth.lovable.cloud`) and not editable unless you set up your own sender domain — I confirmed no email domain is configured for this project. So `{{ .Token }}` cannot be added yet. **Two honest options:** (i) keep the passwordless route but change the UI to "we've sent you a sign-in link" and drop the six code boxes, or (ii) set up a sender domain, after which editable templates can carry both link and code. I'd ship (i) now because today the route is a dead end, and revisit (ii) with the domain.
- **D2 — confirmed.** The code panel keeps its own email state; pass `loginEmail` in and lift the setter.
- **D3 — confirmed.** Page H1 "Welcome back" plus card `CardTitle` "Welcome Back", and logo twice. Drop the card title/description.
- **D4 — confirmed for the link path.** `emailRedirectTo` is `${origin}/`, so magic links land on the homepage. `Index.tsx` only redirects *staff* onward; learners stay. Fix: point the link at `/dashboard` (respecting the configured login redirect) rather than adding a blanket homepage redirect, which would break signed-in people browsing marketing pages.

## E. Learner portal shell

- **E1 — confirmed.** Brand span is `truncate max-w-[180px]` with the full platform name on one line and no `title`. Use the public navbar's two-line "Special People / TRAINING ACADEMY" lockup — consistent and it fits.
- **E2 — confirmed** (`bg-background/95`). Same treatment as B5.
- **E3 — confirmed.** `useOrgAdmin()` resolves async and the sidebar row appears late. Gate the org row on the check having resolved (render nothing rather than a shifting list).
- **E4/E5 — confirmed.** Dashboard truncates the resume title at 34 chars inside the button; the course name is already in the line above. Button → "Resume course". Continue-Learning titles get `title` + `line-clamp-2`.
- **E6 — flagged, product/data.** Hero "CPD logged" and the "Learning Time" stat are two different computations (CPD hours vs summed lesson minutes) and can legitimately disagree; 0h vs 26h suggests CPD hours aren't populated on courses. Needs a decision on which number learners should see.

## F. My Courses / My Learning

- **F1 — confirmed, and your reading of the cause is right in shape.** `MyCourses` derives "Assigned" from `course.is_internal`, In Progress from `0 < progress < 100`, Completed from `progress === 100 || completedAt`. Those are three overlapping, non-exhaustive predicates — a purchased course at 0% belongs to none, hence 4+1+0 ≠ 7. `MyLearning` uses Not Started / In Progress / Completed, which *is* exhaustive. Fix: one shared helper (`src/lib/progress.ts`) returning a single exclusive status per enrolment, used by both pages, and show "Assigned" as a *badge*, not a tab.
- **F2 — flagged.** Two nav items over one dataset is real duplication, and `learnerCoursesNavDestination` already re-points one of them. Consolidation is a product decision; I wouldn't do it in the same turn as F1.
- **F3 — confirmed.** Hide the duration row when null instead of printing "N/A".
- **F4 — confirmed**, same flex-column/`mt-auto` treatment.
- **F5 — data.** Wrong `thumbnail_url` on that course; fix the image, no code.

## G. Organisation portal

- **G1 — confirmed.** `OrgPortal` renders `'—'` when there are no licensed courses / no seats. For counters, `0` is truthful and reads better; keep `—` only for genuinely unknown values like dates.
- **G2 — confirmed**, same opacity fix.
- **G3 — confirmed.** Add "Back to my learning" to the portal user menu.

## H. Profile

- **H1 — confirmed.** `DashboardLayout` derives initials from `user.email.slice(0,2)`; `Profile` derives them from `full_name`. One helper preferring full name, falling back to email.
- **H2 — confirmed**, placeholder-only change.

## I. Phone menu

- **I1 — confirmed.** `FuturisticMobileMenu` receives a hand-written 5-item list; the two dropdown arrays and About never appear on a phone. Rebuild the list from `forOrganisationsLinks` / `resourcesLinks` as collapsible groups plus About.
- **I2 — flagged, product/design.** Black ground, neon grid, monospace "NAVIGATION", "v · 2026" — a different visual world from the light violet site. Restyling is a bigger design call than a bug fix; **your decision**, and I'd do it as its own turn.
- **I3 — confirmed.** The item is labelled "All Courses" but `coursesHref` becomes `/my-courses` when signed in. Label it from the destination.

---

## The one-turn fix list (in order)

1. **D1** — remove the unreachable 6-digit code UI; passwordless becomes "email me a sign-in link". (Highest: a promise the product cannot keep.)
2. **F1** — shared exclusive status derivation for `/my-courses` and `/my-learning`; Assigned becomes a badge. Counts add up.
3. **I1 + I3** — phone menu built from the real link arrays as collapsible groups; courses item labelled from its destination.
4. **A1** — focused nav trigger text colour + visible focus ring.
5. **D4, D2, D3** — magic-link landing to the configured learner home; email carried across modes; de-duplicate the welcome heading/logo.
6. **E1, E3, E4, E5** — two-line brand lockup; org sidebar row gated on resolution; "Resume course"; tooltip + two-line titles.
7. **B2, B3, B4** — hide empty duration badge; drop duplicate category pill; render basket CTA only when purchasable.
8. **F3, F4** — hide null duration rows; pin card footers.
9. **G1, G3** — zero instead of a dash on counters; "Back to my learning" in the portal menu.
10. **H1, H2** — one initials helper; care-sector placeholders.
11. **B5, E2, G2** — header opacity to `.97` in the three shells.
12. **B6** — remove the hardcoded company number; ignore placeholder-looking social URLs.
13. **C1, C2** — remove the placeholder team section; fix the 5-in-3 values grid.
14. **Publish** at the end so all of it reaches the live site (B1).

## Left out, and why

- **A2 link trimming** and **C3 About copy** — need your words/decisions, not my invention.
- **I2 mobile menu restyle** — a design direction, and large enough to swamp the rest of the turn.
- **E6 CPD vs Learning Time** — a definition question; I'd be guessing which number is authoritative.
- **F2 My Courses / My Learning consolidation** — removing a nav item is a product change; F1 already makes both pages truthful.
- **F5 thumbnail, B6 social URLs, B2's missing durations, HeyGen lesson titles** — database content, changeable without a build.
- **Editable auth email templates carrying `{{ .Token }}`** — blocked until a sender domain you own is configured.
