-- LAUNCH KEYS -------------------------------------------------------------
CREATE TABLE public.org_launch_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  label text,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  allowed_frame_origins text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

CREATE INDEX org_launch_keys_org_idx ON public.org_launch_keys(organisation_id);

-- Column-level grants: authenticated staff/org admins never read key_hash.
GRANT SELECT (id, organisation_id, label, key_prefix, allowed_frame_origins, created_by, created_at, revoked_at, last_used_at)
  ON public.org_launch_keys TO authenticated;
GRANT INSERT ON public.org_launch_keys TO authenticated;
GRANT UPDATE (label, allowed_frame_origins, revoked_at) ON public.org_launch_keys TO authenticated;
GRANT ALL ON public.org_launch_keys TO service_role;

ALTER TABLE public.org_launch_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and org admins read launch keys"
  ON public.org_launch_keys FOR SELECT TO authenticated
  USING (
    public.is_ops_training_admin(auth.uid())
    OR public.is_org_admin(auth.uid(), organisation_id)
  );

CREATE POLICY "Platform staff create launch keys"
  ON public.org_launch_keys FOR INSERT TO authenticated
  WITH CHECK (public.is_ops_training_admin(auth.uid()));

CREATE POLICY "Staff and org admins revoke launch keys"
  ON public.org_launch_keys FOR UPDATE TO authenticated
  USING (
    public.is_ops_training_admin(auth.uid())
    OR public.is_org_admin(auth.uid(), organisation_id)
  )
  WITH CHECK (
    public.is_ops_training_admin(auth.uid())
    OR public.is_org_admin(auth.uid(), organisation_id)
  );

-- LAUNCH TOKENS -----------------------------------------------------------
-- One-shot, 10-minute handoff tokens. Same shape of replay defence as the
-- Ariadne SSO guard: the hash is unique, and consumed_at closes the token.
CREATE TABLE public.lms_launch_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  launch_key_id uuid REFERENCES public.org_launch_keys(id) ON DELETE SET NULL,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  learner_email text NOT NULL,
  learner_name text,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_by uuid
);

CREATE INDEX lms_launch_tokens_key_created_idx
  ON public.lms_launch_tokens(launch_key_id, created_at DESC);

-- Service role only: no client ever touches this table.
GRANT ALL ON public.lms_launch_tokens TO service_role;
ALTER TABLE public.lms_launch_tokens ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: RLS with no policy denies every non-service role.

-- SEAT ASSIGNMENT FOR SERVICE-ROLE LAUNCHES -------------------------------
-- assign_seat() gates on auth.uid() being staff or an org admin, which is NULL
-- under the service role. This mirrors its capacity/validity rules exactly for
-- the launch path, and is granted to service_role only.
CREATE OR REPLACE FUNCTION public.assign_seat_for_launch(_licence_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_licence public.licences;
  v_used integer;
  v_seat_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'A seat needs a known user' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_licence FROM public.licences WHERE id = _licence_id FOR UPDATE;
  IF v_licence.id IS NULL THEN
    RAISE EXCEPTION 'Licence not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_licence.status <> 'active' THEN
    RAISE EXCEPTION 'This licence is % and cannot take new seats', v_licence.status USING ERRCODE = 'check_violation';
  END IF;
  IF v_licence.expires_at <= now() OR v_licence.starts_at > now() THEN
    RAISE EXCEPTION 'This licence is outside its valid dates' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id INTO v_seat_id FROM public.licence_seats
  WHERE licence_id = _licence_id AND user_id = _user_id;
  IF v_seat_id IS NOT NULL THEN
    UPDATE public.licence_seats
    SET status = CASE WHEN status = 'revoked' THEN 'reserved' ELSE status END,
        revoked_at = CASE WHEN status = 'revoked' THEN NULL ELSE revoked_at END
    WHERE id = v_seat_id;
    RETURN v_seat_id;
  END IF;

  SELECT count(*) INTO v_used FROM public.licence_seats
  WHERE licence_id = _licence_id AND status IN ('reserved','active','completed');

  IF v_used >= v_licence.seats_total THEN
    RAISE EXCEPTION 'no_seat_available' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.licence_seats (licence_id, user_id, status)
  VALUES (_licence_id, _user_id, 'reserved')
  RETURNING id INTO v_seat_id;

  RETURN v_seat_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.assign_seat_for_launch(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_seat_for_launch(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_seat_for_launch(uuid, uuid) TO service_role;