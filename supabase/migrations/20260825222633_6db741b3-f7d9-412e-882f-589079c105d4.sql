-- 1) Org-scoped expired invitation release (org_admin of that org, or platform staff)
CREATE OR REPLACE FUNCTION public.release_expired_invitation_seats(_org uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  IF _org IS NULL THEN
    RAISE EXCEPTION 'An organisation is required' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT (public.is_platform_staff(auth.uid()) OR public.is_org_admin(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'Not permitted to release invitations for this organisation'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  WITH stale AS (
    UPDATE public.organisation_invitations
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at <= now()
      AND organisation_id = _org
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
$function$;

REVOKE EXECUTE ON FUNCTION public.release_expired_invitation_seats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_expired_invitation_seats(uuid) TO authenticated, service_role;

-- 2) Org people (membership + identity), fenced to org admins / platform staff
CREATE OR REPLACE FUNCTION public.get_org_people(_org uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  job_title text,
  org_role text,
  started_at timestamptz,
  ended_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_platform_staff(auth.uid()) OR public.is_org_admin(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'Not permitted to view this organisation' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT m.user_id,
         p.full_name,
         u.email::text,
         p.job_title,
         m.org_role,
         m.started_at,
         m.ended_at
  FROM public.organisation_members m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.organisation_id = _org
  ORDER BY (m.ended_at IS NOT NULL), COALESCE(p.full_name, u.email::text);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_org_people(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_people(uuid) TO authenticated, service_role;

-- 3) Compliance matrix: members x licensed courses, required-lessons-only progress
CREATE OR REPLACE FUNCTION public.get_org_compliance_matrix(_org uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  course_id uuid,
  course_title text,
  licence_id uuid,
  seat_status text,
  status text,
  required_total integer,
  required_completed integer,
  percent integer,
  completed_at timestamptz,
  cpd_hours numeric,
  cpd_hours_total numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_platform_staff(auth.uid()) OR public.is_org_admin(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'Not permitted to view this organisation' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH members AS (
    SELECT m.user_id
    FROM public.organisation_members m
    WHERE m.organisation_id = _org AND m.ended_at IS NULL
  ),
  org_courses AS (
    SELECT DISTINCT l.course_id, l.id AS licence_id
    FROM public.licences l
    WHERE l.organisation_id = _org
      AND l.status = 'active'
  ),
  required_counts AS (
    SELECT le.course_id, count(*)::int AS required_total
    FROM public.lessons le
    WHERE le.is_required = true
    GROUP BY le.course_id
  ),
  grid AS (
    SELECT mb.user_id, oc.course_id, oc.licence_id
    FROM members mb
    CROSS JOIN org_courses oc
  ),
  progress AS (
    SELECT g.user_id,
           g.course_id,
           g.licence_id,
           COALESCE(rc.required_total, 0) AS required_total,
           (
             SELECT count(*)::int
             FROM public.lesson_progress lp
             JOIN public.lessons le2 ON le2.id = lp.lesson_id
             WHERE lp.user_id = g.user_id
               AND lp.completed = true
               AND le2.course_id = g.course_id
               AND le2.is_required = true
           ) AS required_completed,
           (
             SELECT e.completed_at FROM public.enrollments e
             WHERE e.user_id = g.user_id AND e.course_id = g.course_id
             ORDER BY e.enrolled_at DESC LIMIT 1
           ) AS completed_at,
           (
             SELECT s.status FROM public.licence_seats s
             WHERE s.licence_id = g.licence_id AND s.user_id = g.user_id
             LIMIT 1
           ) AS seat_status
    FROM grid g
    LEFT JOIN required_counts rc ON rc.course_id = g.course_id
  ),
  scored AS (
    SELECT pr.*,
           CASE WHEN pr.required_total > 0
                THEN round((pr.required_completed::numeric / pr.required_total) * 100)::int
                ELSE 0 END AS percent
    FROM progress pr
  ),
  labelled AS (
    SELECT s.*,
           CASE
             WHEN s.completed_at IS NOT NULL THEN 'completed'
             WHEN s.required_total > 0 AND s.required_completed >= s.required_total THEN 'completed'
             WHEN s.required_completed > 0 THEN 'in_progress'
             ELSE 'not_started'
           END AS status
    FROM scored s
  )
  SELECT lb.user_id,
         p.full_name,
         u.email::text,
         lb.course_id,
         c.title AS course_title,
         lb.licence_id,
         lb.seat_status,
         lb.status,
         lb.required_total,
         lb.required_completed,
         lb.percent,
         lb.completed_at,
         c.cpd_hours,
         SUM(CASE WHEN lb.status = 'completed' THEN COALESCE(c.cpd_hours, 0) ELSE 0 END)
           OVER (PARTITION BY lb.user_id) AS cpd_hours_total
  FROM labelled lb
  JOIN public.courses c ON c.id = lb.course_id
  LEFT JOIN public.profiles p ON p.user_id = lb.user_id
  LEFT JOIN auth.users u ON u.id = lb.user_id
  ORDER BY COALESCE(p.full_name, u.email::text), c.title;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_org_compliance_matrix(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_compliance_matrix(uuid) TO authenticated, service_role;