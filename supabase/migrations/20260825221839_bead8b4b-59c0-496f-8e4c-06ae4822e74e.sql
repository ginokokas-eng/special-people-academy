CREATE OR REPLACE FUNCTION public.assign_seat(
  _licence_id uuid,
  _user_id uuid DEFAULT NULL,
  _email text DEFAULT NULL,
  _invitation_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_licence public.licences;
  v_user uuid := _user_id;
  v_used integer;
  v_seat_id uuid;
BEGIN
  SELECT * INTO v_licence FROM public.licences WHERE id = _licence_id FOR UPDATE;
  IF v_licence.id IS NULL THEN
    RAISE EXCEPTION 'Licence not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT (public.is_platform_staff(auth.uid()) OR public.is_org_admin(auth.uid(), v_licence.organisation_id)) THEN
    RAISE EXCEPTION 'Not permitted to assign seats on this licence' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_licence.status <> 'active' THEN
    RAISE EXCEPTION 'This licence is % and cannot take new seats', v_licence.status USING ERRCODE = 'check_violation';
  END IF;
  IF v_licence.expires_at <= now() OR v_licence.starts_at > now() THEN
    RAISE EXCEPTION 'This licence is outside its valid dates' USING ERRCODE = 'check_violation';
  END IF;

  -- Resolve by email against existing auth users; unknown emails stay
  -- invitation-only (the seat is reserved against the invitation).
  IF v_user IS NULL AND _email IS NOT NULL AND length(trim(_email)) > 3 THEN
    SELECT u.id INTO v_user
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(_email))
    LIMIT 1;
  END IF;

  IF v_user IS NULL AND _invitation_id IS NULL THEN
    RAISE EXCEPTION 'A seat needs either a known user or an invitation' USING ERRCODE = 'check_violation';
  END IF;

  IF v_user IS NOT NULL THEN
    SELECT id INTO v_seat_id FROM public.licence_seats
    WHERE licence_id = _licence_id AND user_id = v_user;
    IF v_seat_id IS NOT NULL THEN
      UPDATE public.licence_seats
      SET status = CASE WHEN status = 'revoked' THEN 'reserved' ELSE status END,
          revoked_at = CASE WHEN status = 'revoked' THEN NULL ELSE revoked_at END,
          invitation_id = COALESCE(_invitation_id, invitation_id)
      WHERE id = v_seat_id;
      RETURN v_seat_id;
    END IF;
  END IF;

  SELECT count(*) INTO v_used FROM public.licence_seats
  WHERE licence_id = _licence_id AND status IN ('reserved','active','completed');

  IF v_used >= v_licence.seats_total THEN
    RAISE EXCEPTION 'All % seats on this licence are taken - free a seat or buy more', v_licence.seats_total
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.licence_seats (licence_id, user_id, invitation_id, status)
  VALUES (_licence_id, v_user, _invitation_id, 'reserved')
  RETURNING id INTO v_seat_id;

  RETURN v_seat_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_seat(uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_seat(uuid, uuid, text, uuid) TO authenticated, service_role;
