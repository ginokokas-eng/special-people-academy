# Selling to Care Organisations — Recommended Architecture

## Sanity-check of the current state (verified today)

Confirmed against the live database and code:

- `orders`, `payments`, `user_subscriptions`, `stripe_webhook_logs`: 0 rows. `cart_items` holds stale test rows.
- `course_offerings`: 32 real rows — online £19–55, blended £29–150, individual F2F £60–200, group F2F £380–1350.
- 109 courses, 36 profiles, 16 enrollments, `certificates` empty.
- No organisation concept anywhere. `enrollments` has no entitlement link.
- Access rules on `enrollments`, `certificates`, `profiles` are "own row OR platform admin" only — there is no third party who can see someone else's progress. This is the key gap for B2B.
- A certificate generator already exists (`generate-certificate` edge function, SVG → PDF, completion + competency variants, CPD hours). It has simply never been invoked in anger; `courses.certificate_expiry_months` and `cpd_hours` already exist.
- Ariadne SSO provisioning (`_shared/ariadne.ts`) creates flat learner accounts with no org field.

So: commerce scaffolding is dead weight, pricing data is real, and certificates are 80% built.

## Recommendation in one line

Add a real tenancy layer (`organisations` + `organisation_members` + org-scoped roles), model purchases as **licences with seats** rather than subscriptions, ship invoice-led sales first, and treat Special People itself as a first-class "home organisation" that Ariadne carers are provisioned into.

---

## 1. Tenancy model

**Recommendation: `organisations` + `organisation_members` with an org-scoped role, and Special People becomes the home org.**

Making Special People an organisation row (with a fixed, seeded id) is the decision that keeps everything else simple. If internal learners stay org-less, every query and policy needs an "or NULL org" branch forever, and internal compliance reporting can never reuse the org-admin surface. Instead:

- Seed one organisation, `Special People` (`kind = 'internal'`).
- Ariadne SSO provisioning stamps new carers as members of that org. This is a one-line addition to the shared provisioning module, so both the bulk sync and the token exchange stay identical.
- Backfill the existing 36 profiles into the home org in the same migration.
- External buyers get `kind = 'customer'` organisations.

**Roles: keep the existing flat `app_role` untouched, add a separate org-scoped role.** Do not extend the `app_role` enum with `org_admin` — platform roles and tenant roles are different axes, and mixing them means a future `org_admin` could be mistaken for a platform admin by existing `has_role()` checks. `organisation_members.org_role` (`org_admin` | `member`) is checked through a new security-definer function, exactly mirroring the existing `has_role` / `is_enrolled` pattern.

**RLS scoping** — additive only; every existing policy stays. New policies added alongside:

- `enrollments`, `certificates`, `profiles`: add a SELECT policy `is_org_admin_of_member(auth.uid(), user_id)` — a security-definer function that returns true when the caller is an `org_admin` of an organisation the target user belongs to. Existing "own row" and platform-admin policies are unaffected, and because policies are OR'd, nothing that works today breaks.
- Org admins get **read-only** access to their members' progress and certificates. They never write enrollments directly; enrolment happens through licence assignment (Phase 2 section below).
- Never expose `auth.users`; org admin views read `profiles` + `organisation_members`.

Trade-off accepted: a learner could in principle belong to two organisations (agency staff). The join table allows it, and the RLS function tolerates it, but Phase 1 UI assumes one org per learner.

## 2. Entitlement / licence model

**Recommendation: `licences` (org × course × seats × validity window) + `licence_seats` (one row per assigned learner), with `enrollments` staying exactly as it is.**

Do not put entitlement columns on `enrollments`. `enrollments` means "this learner has access to this course" and is already wired into progress, quizzes, certificates and the player. Adding a nullable `licence_seat_id` pointer to it is the only change needed there — internal Ariadne learners keep a NULL pointer and are unaffected.

Seat semantics:

- A seat is **reserved on invite/assignment**, not on first lesson. Training managers buy predictability; a manager who assigns 40 staff must immediately see 40/40 used. Consuming only on enrolment lets a manager over-assign and hit a wall later.
- Revoking a seat before the learner has completed anything frees it (`status = 'revoked'`, seat count recalculated). Revoking after completion does **not** free it — the certificate has been earned and the seat is spent. This rule prevents seat-recycling abuse and is the norm in the sector.
- Expiry lives on the licence (`starts_at`, `expires_at`, typically 12 months). Expiry blocks *new* assignments and blocks *access to unfinished* courses; it never invalidates an already issued certificate.
- Renewal = a new licence row referencing the previous one (`renews_licence_id`). Never mutate dates in place — audit trail matters when a manager disputes what they bought.
- Course access check becomes: internal enrolment (as today) **or** an active seat on a non-expired licence. Implemented in one security-definer function so both RLS and the client hook share one rule.

## 3. Sales motion sequencing

**Agree with invoice-led first.** Care organisations of 40 staff buy on invoice and purchase order far more often than by card, and an invoice-led flow needs zero payment infrastructure: our admin creates the organisation, the licence, and hands the training manager an invite link. That is a sellable product in Phase 1.

**Delete the dead scaffolding rather than reuse it.** `user_subscriptions` and `cart_items` model the wrong thing (per-user recurring plans, single-item carts) and would fight the licence model. `orders` and `payments` are reasonable shapes but were written for a per-user course purchase and carry a `plan` column we do not want. With zero rows there is no migration cost. Keep `stripe_webhook_logs` (generic, useful) and keep the existing Stripe edge functions dormant rather than deleting them, so the F2F booking path is untouched.

The B2B commercial record for Phase 1 is a single new `org_orders` table (invoice number, PO reference, amount, status: `draft` → `invoiced` → `paid`), which licences reference. Phase 3 Stripe checkout writes into the same table instead of inventing a parallel one.

**Lovable's native path for Phase 2/3** is the Stripe integration with Checkout Sessions created in an edge function and fulfilment driven by a webhook — the same shape as the existing (unused) `create-checkout` / `stripe-webhook` functions. Design towards: one Stripe Price per `course_offerings` row, quantity = seats, and a webhook that creates the licence. That means Phase 1 should already treat licence creation as a single server-side function, called by an admin form now and by the webhook later.

## 4. Org admin experience — minimal surface

Four screens under `/org` behind an `org_admin` guard:

1. **People** — member list with status, bulk invite by pasted emails (one per line or comma-separated), seat counter.
2. **Compliance matrix** — staff × licenced course grid, cells showing Not started / In progress / Complete / Expiring / Expired. This is the screen that sells renewals, so it ships in Phase 1 even in a plain form.
3. **Certificates** — per-learner download, plus a bulk "download all for this course" for inspection packs.
4. **Licences** — what was bought, seats used, expiry.

**Invitations: our own `organisation_invitations` table, with the actual account creation done through Supabase auth invite/magic link.** A pure Supabase auth invite carries no org or licence context and cannot express "invited, not yet accepted, seat reserved". Our table owns the state machine (`pending` → `accepted` / `expired` / `revoked`), a hashed token, and the seat reservation; the email itself is a magic link that lands on an `/invite` accept route which reuses the same verify-and-land pattern already proven in the `/sso` callback. Invitation emails go through the existing transactional email setup.

## 5. Blended / F2F for external organisations

`course_offerings` already distinguishes the four delivery types, so the answer is presentation and permission, not new schema — with one small addition.

- Add `available_to` (`internal` | `customer_org` | `public`) to `course_offerings`. A course can then be sold online-only to external orgs while remaining bookable F2F internally, without duplicating the course.
- Licences are only ever issued against offerings whose type is `individual_online` (or blended's online portion). Practical attendance stays on the existing `bookings` / `practical_sessions` path.
- For blended sold to an external org: the licence covers the online modules and the certificate issued is the **completion** certificate only. The competency certificate stays gated on a practical sign-off at our venue, booked separately. This is honest to the dual-certificate model already in place and avoids promising a sign-off we cannot deliver remotely.
- Group F2F (£380–1350) remains a quote/booking product, not a licence product — surfaced as "Contact us" in the org portal.

## 6. Certificates

The generator already exists; the work is triggering, storing and verifying it.

- **Trigger on completion**, server-side: when the last required item completes, the existing completion check calls `generate-certificate`, which writes the row and the PDF. Never generate on page view.
- **Storage**: keep the private `certificates` bucket; serve via short-lived signed URLs from an edge function that re-checks entitlement (learner themselves, their org admin, or platform admin). Org admins must not be able to guess paths.
- **Add to `certificates`**: `expires_at` (derived from `courses.certificate_expiry_months`), `organisation_id` (snapshot of the issuing context), and a public `verification_code`.
- **Co-branding**: add optional org logo to the template in a later phase — the SVG template already has the layout space. Phase 1 issues our own branding only; inspectors care about the awarding body, not the employer's logo.

## 7. What else matters for UK care-sector B2B

- **Verification links.** A public `/verify/<code>` page showing name, course, issue and expiry only. Inspectors and commissioners ask for this, and it is a strong trust signal at zero cost.
- **Refresher cycles are the recurring-revenue engine.** `certificate_expiry_months` already exists; add scheduled "expiring in 90/30 days" notifications to both the learner and their org admin, reusing the existing notification settings infrastructure. This drives renewals better than any sales email.
- **Data isolation expectations.** Buyers will ask, in writing, whether another customer can see their staff. Getting the org-admin RLS right — and being able to say policies enforce it at the database layer — is a procurement requirement, not a nicety.
- **CPD hours** already exist on `courses` and print on the certificate; make sure the compliance matrix totals them per learner, as managers report on them.
- **Named-user licences, not shared logins.** State it explicitly in the portal; shared logins destroy audit value and are the most common misuse.
- **Data processing / retention.** An org admin leaving must lose access immediately (membership revoke), and staff leaving an organisation keep their own certificates. Model membership end (`ended_at`) rather than deleting rows.
- **Accessibility and evidence exports.** A CSV export of the compliance matrix is the single most requested B2B feature after certificates.

---

## Phased plan

### Phase 1 — smallest sellable B2B slice (invoice-led)

Goal: we can sell Falls Prevention to Sunrise Care for 40 staff today, their manager invites staff, sees progress, downloads certificates.

New tables: `organisations`, `organisation_members`, `organisation_invitations`, `licences`, `licence_seats`, `org_orders`.
New functions: `is_org_admin`, `is_org_admin_of_member`, `has_active_licence_seat`.
Touches: `enrollments` (+ nullable `licence_seat_id`), `profiles` (read policy for org admins), `certificates` (read policy, `expires_at`, `organisation_id`, `verification_code`), `_shared/ariadne.ts` (stamp home-org membership), `course_offerings` (+ `available_to`).
New surfaces: `/org` portal (People, Compliance, Certificates, Licences), `/invite` accept route, admin screens to create organisations and issue licences.
Also in Phase 1: wire certificate generation on completion, and the public `/verify/<code>` page.
Cleanup: drop `user_subscriptions`, `cart_items`; retire `orders` / `payments` in favour of `org_orders`.

### Phase 2 — retention and scale

Expiry/refresher notifications, CSV compliance export, bulk certificate download, org co-branding on certificates, multi-course licence bundles, membership offboarding, seat reassignment UI.

### Phase 3 — self-serve commerce

Stripe Checkout for org purchases (quantity = seats) and individual card purchases, writing into the same `org_orders` + `licences` path as the admin form. Individual purchases create a single-seat licence in a personal organisation, so there is exactly one entitlement code path.

### Phase 4 — enterprise asks

SSO for customer organisations (the Ariadne exchange generalised per-org), API/reporting access, custom learning paths per organisation, F2F scheduling self-service.

---

## Technical notes

Schema sketch (Phase 1, abbreviated — full SQL at build time):

```text
organisations(id, name, slug unique, kind: internal|customer|personal,
              logo_url, contact_email, is_active, created_at, updated_at)

organisation_members(id, organisation_id, user_id, org_role: org_admin|member,
                     started_at, ended_at null, unique(organisation_id, user_id))

organisation_invitations(id, organisation_id, email, org_role, licence_id null,
                         token_hash, status: pending|accepted|expired|revoked,
                         expires_at, invited_by, accepted_user_id, created_at)

licences(id, organisation_id, course_id, offering_id null, org_order_id null,
         seats_total, starts_at, expires_at, renews_licence_id null,
         status: active|expired|cancelled, created_at, updated_at)

licence_seats(id, licence_id, user_id null, invitation_id null,
              status: reserved|active|completed|revoked,
              assigned_at, revoked_at, unique(licence_id, user_id))

org_orders(id, organisation_id, reference, po_reference, amount_gbp,
           status: draft|invoiced|paid|void, source: manual|stripe,
           stripe_session_id null, created_at, updated_at)
```

Every new public table gets explicit GRANTs plus RLS in the same migration, per project convention. All org-admin reads go through security-definer functions to avoid recursive policy evaluation — the same pattern as the existing `has_role` and `is_enrolled`.

Migrations are additive: no existing column is dropped or retyped, no existing policy is removed, and internal Ariadne learners keep working with NULL licence pointers throughout.
