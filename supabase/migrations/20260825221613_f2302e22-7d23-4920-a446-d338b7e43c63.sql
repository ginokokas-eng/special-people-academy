-- ============================================================
-- B2B multi-organisation foundations (Step 1: schema + primitives)
-- ============================================================

-- ---------- 1. TABLES ----------

CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'customer' CHECK (kind IN ('internal','customer','personal')),
  logo_url text,
  contact_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisations TO authenticated;
GRANT ALL ON public.organisations TO service_role;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organisation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  org_role text NOT NULL DEFAULT 'member' CHECK (org_role IN ('org_admin','member')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_id)
);
CREATE INDEX organisation_members_user_idx ON public.organisation_members (user_id) WHERE ended_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_members TO authenticated;
GRANT ALL ON public.organisation_members TO service_role;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.org_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  reference text NOT NULL,
  po_reference text,
  amount_gbp integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','invoiced','paid','void')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','stripe')),
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX org_orders_org_idx ON public.org_orders (organisation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_orders TO authenticated;
GRANT ALL ON public.org_orders TO service_role;
ALTER TABLE public.org_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.licences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  offering_id uuid REFERENCES public.course_offerings(id) ON DELETE SET NULL,
  org_order_id uuid REFERENCES public.org_orders(id) ON DELETE SET NULL,
  seats_total integer NOT NULL CHECK (seats_total > 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  renews_licence_id uuid REFERENCES public.licences(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX licences_org_idx ON public.licences (organisation_id);
CREATE INDEX licences_course_idx ON public.licences (course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licences TO authenticated;
GRANT ALL ON public.licences TO service_role;
ALTER TABLE public.licences ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organisation_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email text NOT NULL,
  org_role text NOT NULL DEFAULT 'member' CHECK (org_role IN ('org_admin','member')),
  licence_id uuid REFERENCES public.licences(id) ON DELETE SET NULL,
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at timestamptz NOT NULL,
  invited_by uuid,
  accepted_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organisation_invitations_org_idx ON public.organisation_invitations (organisation_id);
CREATE UNIQUE INDEX organisation_invitations_token_hash_key ON public.organisation_invitations (token_hash);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_invitations TO authenticated;
GRANT ALL ON public.organisation_invitations TO service_role;
ALTER TABLE public.organisation_invitations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.licence_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licence_id uuid NOT NULL REFERENCES public.licences(id) ON DELETE CASCADE,
  user_id uuid,
  invitation_id uuid REFERENCES public.organisation_invitations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','active','completed','revoked')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX licence_seats_licence_user_key
  ON public.licence_seats (licence_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX licence_seats_licence_idx ON public.licence_seats (licence_id);
CREATE INDEX licence_seats_user_idx ON public.licence_seats (user_id) WHERE user_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licence_seats TO authenticated;
GRANT ALL ON public.licence_seats TO service_role;
ALTER TABLE public.licence_seats ENABLE ROW LEVEL SECURITY;

-- updated_at triggers
CREATE TRIGGER update_organisations_updated_at BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organisation_members_updated_at BEFORE UPDATE ON public.organisation_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_organisation_invitations_updated_at BEFORE UPDATE ON public.organisation_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_licences_updated_at BEFORE UPDATE ON public.licences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_licence_seats_updated_at BEFORE UPDATE ON public.licence_seats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_org_orders_updated_at BEFORE UPDATE ON public.org_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 2. ADDITIVE COLUMN CHANGES ----------

ALTER TABLE public.enrollments
  ADD COLUMN licence_seat_id uuid REFERENCES public.licence_seats(id) ON DELETE SET NULL;

-- 'public' preserves today's public-site visibility for all 32 existing rows.
ALTER TABLE public.course_offerings
  ADD COLUMN available_to text NOT NULL DEFAULT 'public'
    CHECK (available_to IN ('internal','customer_org','public'));

-- ---------- 3. SECURITY DEFINER HELPERS ----------

CREATE OR REPLACE FUNCTION public.is_platform_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','admin','ops_training_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user uuid, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE user_id = _user
      AND organisation_id = _org
      AND org_role = 'org_admin'
      AND ended_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin_of_member(_admin uuid, _member uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members a
    JOIN public.organisation_members m
      ON m.organisation_id = a.organisation_id
    WHERE a.user_id = _admin
      AND a.org_role = 'org_admin'
      AND a.ended_at IS NULL
      AND m.user_id = _member
      AND m.ended_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.has_active_licence_seat(_user uuid, _course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.licence_seats s
    JOIN public.licences l ON l.id = s.licence_id
    WHERE s.user_id = _user
      AND s.status IN ('reserved','active')
      AND l.course_id = _course
      AND l.status = 'active'
      AND l.starts_at <= now()
      AND l.expires_at > now()
  )
$$;

-- ---------- 4. RLS POLICIES (additive only) ----------

-- Org admins get READ-ONLY visibility of their members' records.
CREATE POLICY "Org admins can view member enrollments"
  ON public.enrollments FOR SELECT TO authenticated
  USING (public.is_org_admin_of_member(auth.uid(), user_id));

CREATE POLICY "Org admins can view member certificates"
  ON public.certificates FOR SELECT TO authenticated
  USING (public.is_org_admin_of_member(auth.uid(), user_id));

CREATE POLICY "Org admins can view member profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_org_admin_of_member(auth.uid(), user_id));

-- organisations
CREATE POLICY "Staff manage organisations" ON public.organisations
  FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Org admins view own organisation" ON public.organisations
  FOR SELECT TO authenticated USING (public.is_org_admin(auth.uid(), id));

-- organisation_members
CREATE POLICY "Staff manage organisation members" ON public.organisation_members
  FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Org admins view own org members" ON public.organisation_members
  FOR SELECT TO authenticated USING (public.is_org_admin(auth.uid(), organisation_id));
CREATE POLICY "Members view own membership" ON public.organisation_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- organisation_invitations
CREATE POLICY "Staff manage organisation invitations" ON public.organisation_invitations
  FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Org admins view own org invitations" ON public.organisation_invitations
  FOR SELECT TO authenticated USING (public.is_org_admin(auth.uid(), organisation_id));

-- licences
CREATE POLICY "Staff manage licences" ON public.licences
  FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Org admins view own org licences" ON public.licences
  FOR SELECT TO authenticated USING (public.is_org_admin(auth.uid(), organisation_id));

-- licence_seats
CREATE POLICY "Staff manage licence seats" ON public.licence_seats
  FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Org admins view own org licence seats" ON public.licence_seats
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.licences l
    WHERE l.id = licence_seats.licence_id
      AND public.is_org_admin(auth.uid(), l.organisation_id)
  ));
CREATE POLICY "Learners view own licence seats" ON public.licence_seats
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- org_orders
CREATE POLICY "Staff manage org orders" ON public.org_orders
  FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));
CREATE POLICY "Org admins view own org orders" ON public.org_orders
  FOR SELECT TO authenticated USING (public.is_org_admin(auth.uid(), organisation_id));

-- ---------- 5. SEED + BACKFILL ----------

INSERT INTO public.organisations (id, name, slug, kind, is_active)
VALUES ('00000000-0000-0000-0000-00000000513c', 'Special People', 'special-people', 'internal', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organisation_members (organisation_id, user_id, org_role)
SELECT '00000000-0000-0000-0000-00000000513c', p.user_id, 'member'
FROM public.profiles p
ON CONFLICT (organisation_id, user_id) DO NOTHING;

-- ---------- 6. TRANSACTIONAL PRIMITIVES ----------

CREATE OR REPLACE FUNCTION public.create_licence(
  _organisation_id uuid,
  _course_id uuid,
  _offering_id uuid,
  _seats_total integer,
  _starts_at timestamptz,
  _expires_at timestamptz,
  _order_reference text,
  _po_reference text DEFAULT NULL,
  _amount_gbp integer DEFAULT 0,
  _order_status text DEFAULT 'draft'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id uuid;
  v_licence_id uuid;
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform staff can create licences' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _seats_total IS NULL OR _seats_total <= 0 THEN
    RAISE EXCEPTION 'A licence needs at least one seat' USING ERRCODE = 'check_violation';
  END IF;
  IF _expires_at IS NULL OR _expires_at <= COALESCE(_starts_at, now()) THEN
    RAISE EXCEPTION 'Licence expiry must be after its start date' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.org_orders (organisation_id, reference, po_reference, amount_gbp, status, source)
  VALUES (
    _organisation_id,
    COALESCE(NULLIF(_order_reference, ''), 'ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
    _po_reference,
    COALESCE(_amount_gbp, 0),
    COALESCE(_order_status, 'draft'),
    'manual'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.licences (organisation_id, course_id, offering_id, org_order_id, seats_total, starts_at, expires_at, status)
  VALUES (_organisation_id, _course_id, _offering_id, v_order_id, _seats_total, COALESCE(_starts_at, now()), _expires_at, 'active')
  RETURNING id INTO v_licence_id;

  RETURN v_licence_id;
END;
$$;

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

  IF v_user IS NULL AND _email IS NOT NULL THEN
    SELECT om.user_id INTO v_user
    FROM public.organisation_members om
    JOIN public.profiles p ON p.user_id = om.user_id
    WHERE om.organisation_id = v_licence.organisation_id
      AND om.ended_at IS NULL
      AND lower(_email) = lower(_email)
    LIMIT 0; -- email resolution happens in the invitation flow; keep seat pending
  END IF;

  IF v_user IS NULL AND _invitation_id IS NULL THEN
    RAISE EXCEPTION 'A seat needs either a user or an invitation' USING ERRCODE = 'check_violation';
  END IF;

  -- Reuse an existing seat for this user (idempotent; revive a revoked one).
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
    RAISE EXCEPTION 'All % seats on this licence are taken — free a seat or buy more', v_licence.seats_total
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.licence_seats (licence_id, user_id, invitation_id, status)
  VALUES (_licence_id, v_user, _invitation_id, 'reserved')
  RETURNING id INTO v_seat_id;

  RETURN v_seat_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_seat(_seat_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seat public.licence_seats;
  v_org uuid;
BEGIN
  SELECT * INTO v_seat FROM public.licence_seats WHERE id = _seat_id FOR UPDATE;
  IF v_seat.id IS NULL THEN
    RAISE EXCEPTION 'Seat not found' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT organisation_id INTO v_org FROM public.licences WHERE id = v_seat.licence_id;
  IF NOT (public.is_platform_staff(auth.uid()) OR public.is_org_admin(auth.uid(), v_org)) THEN
    RAISE EXCEPTION 'Not permitted to revoke this seat' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_seat.status = 'completed' THEN
    RAISE EXCEPTION 'This seat has been used to complete the course and stays consumed'
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_seat.status = 'revoked' THEN
    RETURN false;
  END IF;

  UPDATE public.licence_seats
  SET status = 'revoked', revoked_at = now()
  WHERE id = _seat_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_expired_invitation_seats()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform staff can release expired invitations' USING ERRCODE = 'insufficient_privilege';
  END IF;

  WITH stale AS (
    UPDATE public.organisation_invitations
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at <= now()
    RETURNING id
  ),
  freed AS (
    UPDATE public.licence_seats s
    SET status = 'revoked', revoked_at = now()
    WHERE s.invitation_id IN (SELECT id FROM stale)
      AND s.status = 'reserved'
    RETURNING s.id
  )
  SELECT count(*) INTO v_count FROM freed;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_licence(uuid, uuid, uuid, integer, timestamptz, timestamptz, text, text, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.assign_seat(uuid, uuid, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.revoke_seat(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.release_expired_invitation_seats() FROM anon;

-- ---------- 7. CLEANUP ----------

DROP TABLE IF EXISTS public.user_subscriptions;
