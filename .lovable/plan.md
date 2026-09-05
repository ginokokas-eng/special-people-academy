# Menu audit — second pass (Resources, Contact, deferred items)

I read all the pages named plus the ones your list assumed were fine. Your reading of J and K is right, and your proposal for J is the one I'd take. But the audit stopped one page short: **/pricing is the most serious problem on the site, and it isn't on your list.** Two of the three pages you were treating as "real, on-brand" are template content as well.

## What the code confirms

- **/case-studies** — three invented customers, `[Quote from program coordinator…]`, `[Program Coordinator Name]`, and a visible "these are examples with editable placeholders" banner. Confirmed.
- **/help-center** — 375 lines about learner plans, caregivers, weekly summaries, CSV export, "SPA syncs data automatically", a chat widget that does not exist, plus `[Support Email]` and `[Support Hours: Mon–Fri, 9am–6pm GMT]`. Confirmed.
- **/blog** — eight posts in `src/data/blogPosts.ts`, life-skills teaching. Confirmed.
- **/webinars** — three sessions, all `[Date TBD]` / `[Time TBD]`. Confirmed.
- **/contact** — `[Support Email]`, `[Sales Email]`, `[Phone Number]`, `[Company Address]` all render. Tab state starts at `sales` with no URL handling, so "Contact Support" lands on Sales & Demos. Confirmed.
- **Branding fields** — `BrandingSettings` has `platformName`, `platformTagline`, logo/favicon URLs, `footerTextLeft`, `footerTextRight`, and `socialLinks { linkedin, facebook, instagram, youtube, email }`. **There is no phone or address field**, so K cannot be implemented as described without adding two fields to that settings shape and its Branding Settings form.

### Corrections to your L1 assumptions

- **/pricing is not on-brand and is actively dangerous.** It advertises £29 / £99 / £249 *monthly subscriptions* and its buttons call `create-checkout`, which creates a Stripe session in `mode: "subscription"` against three hardcoded price IDs. Nothing in the current model reads a subscription: access comes from licence seats (`fulfil_purchase` → `licences` → `licence_seats`), and `user_subscriptions` was dropped in the B2B work. A card payment here therefore charges a recurring fee and grants **no course access at all**. The plan copy is also template ("For a caregiver or single learner plan", learner slots, 14-day trial, CSV/API tiers). This outranks everything else in your list.
- **/partners is not a local-authorities page.** It is a partner-programme page (implementation / content / referral partners, "share SPA with organizations", `[Dedicated partner support line…]`). Pointing "Local authorities" at it is wrong.
- **/features (14 template hits) and /integrations (4)** are also off-product, and the footer's whole "Compliance" column points five separate labels — CQC audit packs, Care Inspectorate, CIW Wales, Skills for Care, CPD certification — at `/features`. Same class of defect as J.
- **Navbar dropdowns are worse than the trim implies**: four of six "For organisations" items point at the same `/enterprise` page, and "Downloads / Resources" and "CQC Inspection Guide" both point at `/help-center` while promising content that isn't there.

### The other L items

- **L2** — agreed, and note /enterprise's "How SPA helps" panels and role list ("caregivers, observers") need the same pass, not just Use Cases.
- **L3** — agreed, restyle only.
- **L4** — `cpdLogged` in `Dashboard.tsx` is already correct: it sums `courses.cpd_hours` over *completed* enrolments only. So it reads 0 because no course has completed, not because the field is unused. Hiding it when 0 hides a legitimate "nothing banked yet" state; I'd keep the tile and label it "No CPD hours banked yet" rather than remove it, and hide it only when no enrolled course carries `cpd_hours` at all.
- **L5** — agreed, no nav change.

## Recommendation

**Don't delete the four Resources pages — neutralise the routes and keep the files.** Redirect `/case-studies`, `/blog`, `/blog/:slug`, `/webinars` to `/help-center`, and remove them from the navbar dropdown and footer. The components stay in the repo unreferenced, so real content later is a re-route, not a rebuild. I would not keep any of the three as live pages: an empty webinars page with "[Date TBD]" reads worse than no page, and a case-studies page is unpublishable when zero certificates have ever been issued.

**Take /pricing off the public site in the same turn.** Two options, and I recommend the first: redirect `/pricing` to `/contact` (with the sales tab) and remove it from nav and footer, leaving individual course prices on the course pages as the only self-serve price. The alternative — rewriting it as a per-course pricing explainer — is a bigger content job and can wait. Either way the subscription buttons must stop being reachable this turn. `create-checkout` itself stays untouched (out of scope, but it should be retired separately).

**Help Centre**: rewrite from features that demonstrably exist — signing in (password, email link, Google), being invited to an organisation and setting a password, enrolling and buying a course, the lesson player and what counts as complete, quizzes and attempts, practical sign-off, certificates and `/verify/<code>`, renewals, the organisation portal (people, licences, seats, invitations, compliance view). No hours, no SLAs, no chat widget, no policies.

**Contact**: add `contactEmail`, `contactPhone`, `contactAddress` to `BrandingSettings` (defaults empty), render each row only when non-empty and not placeholder-looking (reuse the `YOUR_`/`[`-bracket test the footer socials now use), and read the tab from `?tab=support|sales`, with the navbar "Contact Support" link pointing at `/contact?tab=support`.

**Dropdowns** (revised from your L1):

- For organisations → "Care providers" (/enterprise), "Pricing" → drop, "Talk to sales" (/contact). Drop Local Authorities and Multi-site Teams until there is a page behind them.
- Resources → "Help Centre" (/help-center), "Contact" (/contact).
- Footer: same two-item Resources column; collapse the five-label Compliance column to a single honest link or remove it until /features is rewritten.

## Prioritised list for one build turn

1. **Stop the dead subscription checkout being reachable.** Redirect `/pricing` → `/contact?tab=support=false` (sales tab); remove Pricing from navbar, footer, mobile menu, and any CTA that links to it. *(App.tsx, Navbar.tsx, Footer.tsx, FuturisticMobileMenu.tsx, plus CTA components that link /pricing.)*
2. **Neutralise the four template Resources routes.** Redirect `/case-studies`, `/blog`, `/blog/:slug`, `/webinars` → `/help-center`. *(App.tsx.)*
3. **Trim navbar + footer + mobile menu** to the surviving destinations above, including the /features Compliance column and the duplicate /enterprise entries. *(Navbar.tsx, Footer.tsx, FuturisticMobileMenu.tsx.)*
4. **Rewrite /help-center** for this app, no placeholders, UK spelling. *(HelpCenter.tsx.)*
5. **Contact page**: three new branding fields + form row, placeholder-safe rendering, `?tab=` support, navbar Contact Support → `/contact?tab=support`. *(useBrandingSettings.tsx, admin/BrandingSettings.tsx, Contact.tsx, Navbar.tsx, DashboardLayout.tsx.)*
6. **About + /enterprise copy** rewrite to homepage positioning, UK spelling, no "SPA", use cases = Care homes / Domiciliary care / Supported living / NHS trusts, no invented numbers. *(About.tsx, Enterprise.tsx.)*
7. **Mobile menu restyle** to the light violet system, keeping the collapsible groups. *(FuturisticMobileMenu.tsx.)*
8. **Dashboard CPD tile**: keep it, show "No CPD hours banked yet" at 0, hide only when no enrolled course carries CPD hours. *(Dashboard.tsx.)*

Out of this turn: rewriting /features and /integrations (redirect or rewrite as its own turn), retiring `create-checkout`'s subscription plans server-side, real case studies/blog/webinar content, merging My Courses and My Learning, email templates.

## Technical notes

Redirects as `<Route path="…" element={<Navigate to="/help-center" replace />} />` keeps the page components in the tree unreferenced — no deletions, consistent with the no-rebuild constraint. The placeholder test should be one shared helper (`isPlaceholder(value)` matching `YOUR_`, leading `[`, empty) used by Footer, Contact and any future settings-driven row, rather than three copies.
