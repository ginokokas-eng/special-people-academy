CREATE OR REPLACE FUNCTION public.sync_staff_role()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_profile record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_profile
  FROM public.staff_profiles
  WHERE lower(email) = v_email
    AND is_active = true
  LIMIT 1;

  -- No active staff profile, or it is a plain learner: ensure learner role only.
  IF v_profile.id IS NULL OR v_profile.role IS NULL OR v_profile.role = 'learner'::public.app_role THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'learner'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN 'learner'::public.app_role;
  END IF;

  -- Link the staff profile to this auth user.
  UPDATE public.staff_profiles SET user_id = v_uid WHERE id = v_profile.id;

  -- Assign the staff role and drop the default learner role.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_profile.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles
  WHERE user_id = v_uid AND role = 'learner'::public.app_role;

  RETURN v_profile.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_staff_role() TO authenticated;