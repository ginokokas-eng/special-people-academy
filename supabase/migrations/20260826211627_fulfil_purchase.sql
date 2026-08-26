-- Phase 3 — fulfilment for a paid purchase.
--
-- create_licence and assign_seat both guard on is_platform_staff(auth.uid()).
-- A Stripe webhook carries no JWT, so auth.uid() is NULL and both would raise
-- insufficient_privilege. Rather than weaken those guards — they are what stops
-- an org admin minting their own licences — fulfilment gets its own entry point
-- that is reachable ONLY by the service role.
--
-- The guard is the GRANT itself: EXECUTE is revoked from anon, authenticated
-- and PUBLIC, so a signed-in user cannot call this even if they discover it.
--
-- A self-employed buyer is modelled as an organisation of kind 'personal'
-- holding a one-seat licence. That keeps ONE entitlement path for org passes
-- and individuals alike (see can_access_course), rather than forking every
-- policy and primitive for a second shape.

CREATE OR REPLACE FUNCTION public.fulfil_purchase(
  _user            uuid,
  _course          uuid,
  _offering        uuid,
  _amount_gbp      integer,
  _payment_ref     text,
  _seats           integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org      uuid;
  v_order    uuid;
  v_licence  uuid;
  v_seat     uuid;
  v_months   integer;
  v_email    text;
  v_role     text;
BEGIN
  IF _user IS NULL OR _course IS NULL THEN
    RAISE EXCEPTION 'fulfil_purchase requires a user and a course';
  END IF;
  IF _seats < 1 THEN
    RAISE EXCEPTION 'fulfil_purchase requires at least one seat';
  END IF;

  -- Idempotency. Stripe retries; a replayed event must not mint a second
  -- licence. The payment reference is the natural key.
  SELECT l.id INTO v_licence
  FROM public.licences l
  JOIN public.org_orders o ON o.id = l.org_order_id
  WHERE o.stripe_session_id = _payment_ref
  LIMIT 1;
  IF v_licence IS NOT NULL THEN
    RETURN v_licence;
  END IF;

  -- The buyer's own organisation. Reused across their later purchases.
  SELECT m.organisation_id INTO v_org
  FROM public.organisation_members m
  JOIN public.organisations o ON o.id = m.organisation_id
  WHERE m.user_id = _user AND m.ended_at IS NULL AND o.kind = 'personal'
  LIMIT 1;

  IF v_org IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = _user;

    -- The slug is unique and must never be guessable from a person's name, and
    -- the display name must never be shown as if it were a company.
    INSERT INTO public.organisations (name, slug, kind, contact_email, is_active)
    VALUES (
      'Individual purchase',
      'personal-' || replace(gen_random_uuid()::text, '-', ''),
      'personal',
      v_email,
      true
    )
    RETURNING id INTO v_org;
  END IF;

  -- A single-seat buyer needs no admin rights over their own shell org — that
  -- would hand them the org portal and a compliance matrix over themselves.
  -- Buying a multi-seat (group) offering is different: they must allocate.
  v_role := CASE WHEN _seats > 1 THEN 'org_admin' ELSE 'member' END;

  -- The unique index here is (organisation_id, user_id) with no predicate, so a
  -- previously ended membership is revived rather than duplicated. An existing
  -- org_admin is never demoted by a later single-seat purchase.
  INSERT INTO public.organisation_members (organisation_id, user_id, org_role)
  VALUES (v_org, _user, v_role)
  ON CONFLICT (organisation_id, user_id)
  DO UPDATE SET
    ended_at = NULL,
    org_role = CASE
      WHEN public.organisation_members.org_role = 'org_admin' THEN 'org_admin'
      ELSE EXCLUDED.org_role
    END;

  -- Access lasts as long as the thing they bought: the course's own certificate
  -- cycle, then its renewal cycle, then a year.
  SELECT COALESCE(c.certificate_expiry_months, c.renewal_months, 12)
  INTO v_months
  FROM public.courses c WHERE c.id = _course;
  v_months := COALESCE(v_months, 12);

  INSERT INTO public.org_orders (organisation_id, reference, amount_gbp, status, source, stripe_session_id)
  VALUES (v_org, COALESCE(_payment_ref, 'purchase'), COALESCE(_amount_gbp, 0), 'paid', 'stripe', _payment_ref)
  RETURNING id INTO v_order;

  INSERT INTO public.licences
    (organisation_id, course_id, offering_id, org_order_id, seats_total, starts_at, expires_at, status)
  VALUES
    (v_org, _course, _offering, v_order, _seats, now(), now() + make_interval(months => v_months), 'active')
  RETURNING id INTO v_licence;

  -- The buyer takes the first seat. Any remaining seats on a group purchase stay
  -- free for them to allocate through the org portal.
  INSERT INTO public.licence_seats (licence_id, user_id, status)
  VALUES (v_licence, _user, 'active')
  RETURNING id INTO v_seat;

  -- Enrol them so the course appears immediately. The seat is already active,
  -- so the enrolment trigger has nothing left to do.
  INSERT INTO public.enrollments (user_id, course_id, licence_seat_id)
  VALUES (_user, _course, v_seat)
  ON CONFLICT DO NOTHING;

  RETURN v_licence;
END;
$function$;

REVOKE ALL ON FUNCTION public.fulfil_purchase(uuid, uuid, uuid, integer, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfil_purchase(uuid, uuid, uuid, integer, text, integer)
  TO service_role;
