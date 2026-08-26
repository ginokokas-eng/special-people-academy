-- Phase 2 — the entitlement seam.
--
-- Until now nothing enforced who may enrol: the enrollments INSERT policy was
-- `auth.uid() = user_id`, so any signed-in user could enrol in any course and
-- has_active_licence_seat, though it existed, was never consulted by RLS.
--
-- This makes one function the single entitlement question for the whole app:
--
--   can_access_course(user, course)
--     = an active licence seat            (org passes AND individual purchases)
--    OR active membership of the internal org  (Special People's own carers)
--    OR a grandfathered enrolment         (the rows that predate enforcement)
--
-- Internal carers deliberately get NO seats: nobody is billed per seat for
-- internal training, and issuing 700+ of them would buy a licence-renewal
-- treadmill plus seat-exhaustion failures on a limit with no commercial meaning.

-- 1. A finished course must not lock its learner out ------------------------
-- 'completed' was missing, so the moment a seat was marked completed the
-- learner lost the course AND the certificate page hanging off it.
CREATE OR REPLACE FUNCTION public.has_active_licence_seat(_user uuid, _course uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.licence_seats s
    JOIN public.licences l ON l.id = s.licence_id
    WHERE s.user_id = _user
      AND s.status IN ('reserved', 'active', 'completed')
      AND l.course_id = _course
      AND l.status = 'active'
      AND l.starts_at <= now()
      AND l.expires_at > now()
  )
$function$;

-- 2. Grandfathering ---------------------------------------------------------
-- Enrolments created before enforcement keep working forever. The flag is set
-- once, here; nothing in the app can grant it, so it cannot be self-issued.
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS entitlement_exempt boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.enrollments.entitlement_exempt IS
  'True only for enrolments that predate entitlement enforcement (Phase 2). Never granted at runtime.';

-- Bounded by a fixed cutoff so re-running this migration can never exempt an
-- enrolment created after enforcement began.
UPDATE public.enrollments
SET entitlement_exempt = true
WHERE enrolled_at < timestamptz '2026-08-26 18:30:00+00'
  AND entitlement_exempt = false;

-- 3. Internal (Ariadne carer) access ----------------------------------------
CREATE OR REPLACE FUNCTION public.is_internal_member(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members m
    JOIN public.organisations o ON o.id = m.organisation_id
    WHERE m.user_id = _user
      AND m.ended_at IS NULL
      AND o.kind = 'internal'
      AND o.is_active
  )
$function$;

-- 4. The single entitlement question ----------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_course(_user uuid, _course uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _user IS NOT NULL
    AND (
      public.has_active_licence_seat(_user, _course)
      OR public.is_internal_member(_user)
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.user_id = _user
          AND e.course_id = _course
          AND e.entitlement_exempt
      )
    )
$function$;

REVOKE ALL ON FUNCTION public.can_access_course(uuid, uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.is_internal_member(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_course(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_internal_member(uuid) TO authenticated;

-- 5. Enforce it -------------------------------------------------------------
-- Replaces "Users can enroll themselves", which checked only that the row
-- belonged to the caller. Admin and org-invite paths are unaffected: the admin
-- policy still exists, and org-invite enrols through the service role.
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;

CREATE POLICY "Users can enrol where entitled"
  ON public.enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_access_course(auth.uid(), course_id)
  );

-- 6. Seats must actually move ------------------------------------------------
-- Nothing transitioned reserved -> active, so every seat sat 'reserved' for
-- life and seat reporting meant nothing. Enrolling is the moment a seat is
-- genuinely in use. Where the enrolment arrives without a seat reference but a
-- seat exists for that learner and course, they are linked here too.
CREATE OR REPLACE FUNCTION public.activate_seat_on_enrolment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_seat uuid := NEW.licence_seat_id;
BEGIN
  IF v_seat IS NULL THEN
    SELECT s.id INTO v_seat
    FROM public.licence_seats s
    JOIN public.licences l ON l.id = s.licence_id
    WHERE s.user_id = NEW.user_id
      AND l.course_id = NEW.course_id
      AND s.status IN ('reserved', 'active')
      AND l.status = 'active'
    ORDER BY s.assigned_at
    LIMIT 1;

    IF v_seat IS NOT NULL THEN
      UPDATE public.enrollments SET licence_seat_id = v_seat WHERE id = NEW.id;
    END IF;
  END IF;

  IF v_seat IS NOT NULL THEN
    UPDATE public.licence_seats
    SET status = 'active', updated_at = now()
    WHERE id = v_seat AND status = 'reserved';
  END IF;

  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_activate_seat_on_enrolment ON public.enrollments;
CREATE TRIGGER trg_activate_seat_on_enrolment
  AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.activate_seat_on_enrolment();
