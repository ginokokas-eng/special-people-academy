# Access & identity model — design review

Verdict up front: **the personal-org idea is right**, but two of your five points are wrong as stated, and there is a hard blocker in the existing primitives that your payment flow (point 4) will hit on day one. Details below, all checked against the live schema today.

## 1. Personal orgs: keep them (a)

Not an abuse of the model. `organisations.kind` already allows `'personal'`, so the concept is anticipated, and 5k narrow rows is nothing for Postgres. The alternative (nullable `licences.organisation_id`) is the worse deal: it forks `assign_seat`, `revoke_seat`, `is_org_admin`, every licence/seat RLS policy, and the compliance matrix — permanently, for one edge case.

Costs to accept and mitigate, not reasons to reject:
- Admin UI pollution. `Organisations.tsx` and `Licences.tsx` list all orgs; filter to `kind <> 'personal'` by default with a toggle, otherwise the customer list drowns.
- Naming. Personal orgs must not display a person's name as a company. Store a deterministic label and never surface it in learner UI.
- Slug collisions. `organisations.slug` is unique; personal orgs need a generated non-guessable slug, not `full-name`.
- Membership role. The buyer should be `member`, **not** `org_admin`, of their own personal org — otherwise they inherit the org portal, the compliance matrix over themselves, and read access to `licences`/`org_orders` rows that only exist for billing. Entitlement doesn't need admin.

## 2. Where your design is actually wrong

**Point 4 cannot work as written.** `create_licence` opens with `IF NOT public.is_platform_staff(auth.uid())` and `assign_seat` with `is_platform_staff(auth.uid()) OR is_org_admin(...)`. A Stripe webhook runs with no JWT, so `auth.uid()` is NULL and both primitives raise `insufficient_privilege`. Fix: add a service-role fulfilment wrapper (e.g. `fulfil_individual_purchase`) that is SECURITY DEFINER, callable only where `auth.uid() IS NULL AND current_setting('request.jwt.claim.role') = 'service_role'` (or gate on a shared secret), and have it do org-upsert → membership → `create_licence` → `assign_seat` in one transaction. Do not loosen the guards on the existing two primitives.

**Point 1's claim that "everything keeps working unchanged" is false, because entitlement isn't enforced anywhere yet.** `enrollments` INSERT policy is `WITH CHECK (auth.uid() = user_id)` — any signed-in user can enrol themselves in any course right now. `has_active_licence_seat` exists but nothing calls it in RLS. So the licence seat is not yet "the one access primitive"; making it one is net-new work, not a preserved invariant. That work is the real heart of this project.

**Two latent seat bugs that will bite both A and B:**
- `has_active_licence_seat` accepts only `('reserved','active')`. A seat moved to `completed` loses access — learners can't revisit a finished course or reach their certificate page if it's seat-gated. Either include `completed`, or never move seats to `completed` and treat it as a reporting-only status.
- Nothing currently transitions `reserved → active`. Decide the trigger (first lesson open, or enrolment creation) or every seat stays `reserved` forever and your reporting is meaningless.

**Point 3 is correct and worth defending.** One auth user per human, multiple authentication routes, membership history via `organisation_members.ended_at`. Nothing in the schema fights this. The one thing to add: an internal carer who later buys personally ends up in two orgs simultaneously — that must be fine by design (entitlement = "any active seat OR internal enrolment"), not an error state.

## 3. Internal carers: don't give them seats (b)

Keep point 2. Issuing 700+ seats for training nobody is billed per-seat for buys you a uniform compliance matrix and costs you a licence-renewal treadmill on the internal org, plus seat-exhaustion failures on a limit that has no commercial meaning. And uniformity is illusory anyway: `get_org_compliance_matrix` derives its course grid from `licences` for that org (`CROSS JOIN` of members × active org licences), so the internal org would need a licence per mandatory course regardless.

Better shape: make entitlement a single **function**, not a single table.

```text
can_access_course(user, course) :=
     has_active_licence_seat(user, course)          -- A and B
  OR is_internal_free_access(user, course)          -- C: active member of kind='internal' org
```

One question to ask anywhere in the app, two implementations behind it. Then give the internal org a separate compliance view driven by `courses.is_mandatory` + `programmes`/`training_ids` rather than by licences, since that is what internal compliance actually means.

## 4. Renewals and expiry for individuals (c)

`licences.starts_at/expires_at` are NOT NULL, so an individual licence must have a window — the only question is length. Recommend: access window = `courses.certificate_expiry_months` (fall back to `renewal_months`, then 12 months) from purchase. Then:
- **Certificate**: never revoked. `certificates` already has its own `expires_at` and DELETE/UPDATE are denied by policy. A certificate that has lapsed is a historical fact plus a renewal prompt — `verify_certificate` already returns a status, so `/verify/<code>` tells the truth without touching access.
- **Access after expiry**: course content locks, but the learner keeps read-only sight of their record — their certificate, their transcript-equivalent, and a "renew" CTA. Locking someone out of their own certificate page is the single most damaging thing you could do here.
- **Renewal**: `licences.renews_licence_id` already exists; a renewal purchase creates a new licence pointing at the old one, into the same personal org.

## 5. Order ledger: `org_orders` for both (d)

Don't revive `cart_items`/`orders`/`payments` for this. Reasons that are specific to your state: `create_licence` already writes an `org_orders` row and links it via `licences.org_order_id`, `org_orders` already carries `source` and `stripe_session_id`, and `orders`/`payments`/`stripe_webhook_logs` have zero rows ever — there is no history to preserve. Two ledgers means two reconciliation stories for one business.

So: `org_orders` is the single ledger; `source` distinguishes `manual`/`invoice` from `stripe`; individual purchase goes straight to Stripe Checkout (single course, no cart) and the webhook is the only writer. Drop the 2 stale `cart_items` rows and retire the dormant tables in a later cleanup, not in this build. Keep `stripe_webhook_logs` — idempotency by `event_id` still matters.

Multi-course individual baskets are the only thing you lose. Given B is "a self-employed carer buys one course", ship single-item checkout and revisit only if demand appears.

## 6. Mobile sign-in — the real problem, and a better shape (e)

Your diagnosis is right and this is the most urgent item: `accept-org-invitation` sets a random UUID password, the auth surface offers only password + Google, and there's no reset. An invited carer without a Google account cannot sign in on Android at all. Today. That blocks A entirely, regardless of the entitlement design.

Recommended, in order:
1. **Email OTP (magic code, not link).** A 6-digit code typed into the app avoids the deep-link fragility that link-based flows have in Android WebViews, and works identically on web. This is the fix for both invited staff and individual buyers.
2. **Password reset**, because "set a password later" is a reasonable path and its absence is just a gap.
3. **Set a password during invitation acceptance.** `InviteAccept.tsx` already collects full name; collecting a password there means the invited user leaves with working credentials instead of a UUID they never see.
4. Keep Google. Keep Ariadne SSO exactly as it is for C — one-directional, Academy never initiates.

Things worth knowing that you didn't list: OTP and password reset both need the transactional email sender configured, or codes silently don't arrive — that is a prerequisite task, not a detail. And the Android app has exactly one deep link (`uk.org.specialpeople.academy://sso`); OTP-by-code needs no new link, which is a further argument for codes over links.

## 7. Suggested build order

1. Auth unblock: email OTP + password reset + password-at-invitation. Nothing else in A works without it.
2. Entitlement seam: `can_access_course()`, seat lifecycle (`reserved → active`, `completed` semantics), and enforcement in `enrollments` RLS replacing the current self-enrol-anything policy.
3. Individual purchase: personal-org upsert + service-role fulfilment wrapper + Stripe Checkout + webhook into `org_orders`/`licences`/`licence_seats`.
4. Expiry and renewal behaviour, plus the locked-but-certificate-visible state.
5. Admin polish: filter personal orgs out of the org lists; internal compliance view driven by mandatory-training config rather than licences.

## Open questions

- Individual access window: is course-specific (`certificate_expiry_months`) right, or do you want a flat 12 months for every individual purchase?
- Should an individual buyer see anything org-shaped at all, or is the personal org strictly invisible plumbing? (Recommendation: strictly invisible.)
- `course_offerings.available_to` — which values gate the public individual-purchase catalogue? This decides which of the 32 active offerings appear in self-serve checkout.
