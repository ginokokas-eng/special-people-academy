-- 1. content_history ------------------------------------------------------
CREATE TABLE public.content_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  course_id uuid NULL,
  lesson_id uuid NULL,
  actor uuid NULL,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  material boolean NOT NULL DEFAULT false,
  note text,
  before jsonb,
  after jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_history_course_at_idx ON public.content_history (course_id, at DESC);
CREATE INDEX content_history_row_at_idx ON public.content_history (row_id, at DESC);

GRANT SELECT ON public.content_history TO authenticated;
GRANT ALL ON public.content_history TO service_role;

ALTER TABLE public.content_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Training staff and trainers can read content history"
ON public.content_history FOR SELECT TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

-- 2. change context RPC ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_content_change_context(_material boolean, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.change_material', CASE WHEN _material THEN 'true' ELSE 'false' END, true);
  PERFORM set_config('app.change_note', COALESCE(_note, ''), true);
END;
$$;
REVOKE ALL ON FUNCTION public.set_content_change_context(boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_content_change_context(boolean, text) TO authenticated, service_role;

-- 3. version columns ------------------------------------------------------
ALTER TABLE public.lessons ADD COLUMN content_version int NOT NULL DEFAULT 1;
ALTER TABLE public.lesson_progress ADD COLUMN content_version int NULL;
ALTER TABLE public.courses ADD COLUMN require_recompletion_on_change boolean NOT NULL DEFAULT false;

-- 4. history trigger ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_content_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_material boolean := COALESCE(NULLIF(current_setting('app.change_material', true), ''), 'false')::boolean;
  v_note text := NULLIF(current_setting('app.change_note', true), '');
  v_before jsonb;
  v_after jsonb;
  v_row_id uuid;
  v_lesson uuid;
  v_course uuid;
  v_b jsonb;
  v_a jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD); v_after := NULL; v_row_id := OLD.id;
  ELSIF TG_OP = 'INSERT' THEN
    v_before := NULL; v_after := to_jsonb(NEW); v_row_id := NEW.id;
  ELSE
    v_before := to_jsonb(OLD); v_after := to_jsonb(NEW); v_row_id := NEW.id;
    -- Skip no-ops and bookkeeping-only changes (updated_at / content_version).
    v_b := v_before - 'updated_at' - 'content_version';
    v_a := v_after  - 'updated_at' - 'content_version';
    IF v_b = v_a THEN
      RETURN NULL;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'courses' THEN
    v_course := v_row_id;
  ELSIF TG_TABLE_NAME = 'lessons' THEN
    v_lesson := v_row_id;
    SELECT course_id INTO v_course FROM public.lessons WHERE id = v_row_id;
    IF v_course IS NULL THEN
      v_course := COALESCE((v_before->>'course_id')::uuid, (v_after->>'course_id')::uuid);
    END IF;
  ELSIF TG_TABLE_NAME = 'lesson_blocks' THEN
    v_lesson := COALESCE((v_after->>'lesson_id')::uuid, (v_before->>'lesson_id')::uuid);
    SELECT le.course_id INTO v_course FROM public.lessons le WHERE le.id = v_lesson;
  END IF;

  INSERT INTO public.content_history
    (table_name, row_id, course_id, lesson_id, actor, action, material, note, before, after)
  VALUES
    (TG_TABLE_NAME, v_row_id, v_course, v_lesson, auth.uid(), lower(TG_OP), v_material, v_note, v_before, v_after);

  -- Material changes bump the parent lesson's content version.
  IF v_material THEN
    IF TG_TABLE_NAME = 'lesson_blocks' AND v_lesson IS NOT NULL THEN
      UPDATE public.lessons SET content_version = content_version + 1 WHERE id = v_lesson;
    ELSIF TG_TABLE_NAME = 'lessons' AND TG_OP = 'UPDATE' THEN
      IF (v_before->>'title') IS DISTINCT FROM (v_after->>'title')
         OR (v_before->>'lesson_type') IS DISTINCT FROM (v_after->>'lesson_type') THEN
        UPDATE public.lessons SET content_version = content_version + 1 WHERE id = v_lesson;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER courses_content_history
AFTER INSERT OR UPDATE OR DELETE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.log_content_change();

CREATE TRIGGER lessons_content_history
AFTER INSERT OR UPDATE OR DELETE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.log_content_change();

CREATE TRIGGER lesson_blocks_content_history
AFTER INSERT OR UPDATE OR DELETE ON public.lesson_blocks
FOR EACH ROW EXECUTE FUNCTION public.log_content_change();

-- 5. stamp content_version on completion (covers every writer) ------------
CREATE OR REPLACE FUNCTION public.stamp_progress_content_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.completed = true THEN
    SELECT le.content_version INTO NEW.content_version
    FROM public.lessons le WHERE le.id = NEW.lesson_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_progress_stamp_version
BEFORE INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.stamp_progress_content_version();

-- Backfill: nobody is flagged retroactively.
UPDATE public.lesson_progress lp
SET content_version = le.content_version
FROM public.lessons le
WHERE le.id = lp.lesson_id AND lp.completed = true AND lp.content_version IS NULL;

-- 6. course_versions ------------------------------------------------------
CREATE TABLE public.course_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  version int NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid,
  snapshot jsonb NOT NULL,
  UNIQUE (course_id, version)
);

GRANT SELECT ON public.course_versions TO authenticated;
GRANT ALL ON public.course_versions TO service_role;

ALTER TABLE public.course_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read course versions"
ON public.course_versions FOR SELECT TO authenticated
USING (public.is_ops_training_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.publish_course_version(_course_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version int;
  v_snapshot jsonb;
BEGIN
  IF NOT public.is_ops_training_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not permitted to publish course versions' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COALESCE(max(version), 0) + 1 INTO v_version
  FROM public.course_versions WHERE course_id = _course_id;

  SELECT jsonb_build_object(
    'course', (SELECT to_jsonb(c) FROM public.courses c WHERE c.id = _course_id),
    'modules', COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.position)
                         FROM public.modules m WHERE m.course_id = _course_id), '[]'::jsonb),
    'lessons', COALESCE((SELECT jsonb_agg(to_jsonb(le) ORDER BY le.position)
                         FROM public.lessons le WHERE le.course_id = _course_id), '[]'::jsonb),
    'lesson_blocks', COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.lesson_id, b.position)
                               FROM public.lesson_blocks b
                               JOIN public.lessons le2 ON le2.id = b.lesson_id
                               WHERE le2.course_id = _course_id), '[]'::jsonb),
    'quizzes', COALESCE((SELECT jsonb_agg(to_jsonb(q))
                         FROM public.quizzes q
                         JOIN public.lessons le3 ON le3.id = q.lesson_id
                         WHERE le3.course_id = _course_id), '[]'::jsonb),
    'quiz_questions', COALESCE((SELECT jsonb_agg(to_jsonb(qq))
                                FROM public.quiz_questions qq
                                JOIN public.quizzes q2 ON q2.id = qq.quiz_id
                                JOIN public.lessons le4 ON le4.id = q2.lesson_id
                                WHERE le4.course_id = _course_id), '[]'::jsonb)
  ) INTO v_snapshot;

  INSERT INTO public.course_versions (course_id, version, published_by, snapshot)
  VALUES (_course_id, v_version, auth.uid(), v_snapshot);

  RETURN v_version;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_course_version(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_course_version(uuid) TO authenticated, service_role;

-- 7. changed-since-completion lookups ------------------------------------
CREATE OR REPLACE FUNCTION public.get_changed_since_completion(_user uuid DEFAULT auth.uid())
RETURNS TABLE(course_id uuid, course_title text, lesson_id uuid, lesson_title text,
              completed_version int, current_version int, require_recompletion boolean)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT c.id, c.title, le.id, le.title,
         lp.content_version, le.content_version, c.require_recompletion_on_change
  FROM public.lesson_progress lp
  JOIN public.lessons le ON le.id = lp.lesson_id
  JOIN public.courses c ON c.id = le.course_id
  WHERE lp.user_id = COALESCE(_user, auth.uid())
    AND lp.completed = true
    AND lp.content_version IS NOT NULL
    AND lp.content_version < le.content_version;
$$;
REVOKE ALL ON FUNCTION public.get_changed_since_completion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_changed_since_completion(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_org_changed_since_completion(_org uuid)
RETURNS TABLE(user_id uuid, course_id uuid, lesson_id uuid, lesson_title text,
              completed_version int, current_version int, require_recompletion boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_platform_staff(auth.uid()) OR public.is_org_admin(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'Not permitted to view this organisation' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT lp.user_id, c.id, le.id, le.title,
         lp.content_version, le.content_version, c.require_recompletion_on_change
  FROM public.organisation_members m
  JOIN public.lesson_progress lp ON lp.user_id = m.user_id
  JOIN public.lessons le ON le.id = lp.lesson_id
  JOIN public.courses c ON c.id = le.course_id
  WHERE m.organisation_id = _org AND m.ended_at IS NULL
    AND lp.completed = true
    AND lp.content_version IS NOT NULL
    AND lp.content_version < le.content_version;
END;
$$;
REVOKE ALL ON FUNCTION public.get_org_changed_since_completion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_changed_since_completion(uuid) TO authenticated, service_role;

-- 8. compliance matrix: stale completions drop out when re-completion is required
DROP FUNCTION IF EXISTS public.get_org_compliance_matrix(uuid);

CREATE OR REPLACE FUNCTION public.get_org_compliance_matrix(_org uuid)
 RETURNS TABLE(user_id uuid, full_name text, email text, course_id uuid, course_title text, licence_id uuid, seat_status text, status text, required_total integer, required_completed integer, percent integer, completed_at timestamp with time zone, cpd_hours numeric, cpd_hours_total numeric, updated_since_completion boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_internal boolean;
BEGIN
  IF NOT (public.is_platform_staff(auth.uid()) OR public.is_org_admin(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'Not permitted to view this organisation' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT o.kind = 'internal' INTO v_internal FROM public.organisations o WHERE o.id = _org;
  v_internal := COALESCE(v_internal, false);

  RETURN QUERY
  WITH members AS (
    SELECT m.user_id FROM public.organisation_members m
    WHERE m.organisation_id = _org AND m.ended_at IS NULL
  ),
  org_courses AS (
    SELECT c.id AS course_id, NULL::uuid AS licence_id
    FROM public.courses c
    WHERE v_internal AND c.is_mandatory AND c.is_published
    UNION ALL
    SELECT DISTINCT l.course_id, l.id AS licence_id
    FROM public.licences l
    WHERE NOT v_internal AND l.organisation_id = _org AND l.status = 'active'
  ),
  required_counts AS (
    SELECT le.course_id, count(*)::int AS required_total
    FROM public.lessons le WHERE le.is_required = true GROUP BY le.course_id
  ),
  grid AS (SELECT mb.user_id, oc.course_id, oc.licence_id FROM members mb CROSS JOIN org_courses oc),
  progress AS (
    SELECT g.user_id, g.course_id, g.licence_id,
           COALESCE(rc.required_total, 0) AS required_total,
           -- Stale completions no longer count when the course demands re-completion.
           (SELECT count(*)::int FROM public.lesson_progress lp
            JOIN public.lessons le2 ON le2.id = lp.lesson_id
            JOIN public.courses c2 ON c2.id = le2.course_id
            WHERE lp.user_id = g.user_id AND lp.completed = true
              AND le2.course_id = g.course_id AND le2.is_required = true
              AND NOT (c2.require_recompletion_on_change
                       AND lp.content_version IS NOT NULL
                       AND lp.content_version < le2.content_version)) AS required_completed,
           (SELECT bool_or(lp3.content_version < le3.content_version)
            FROM public.lesson_progress lp3
            JOIN public.lessons le3 ON le3.id = lp3.lesson_id
            WHERE lp3.user_id = g.user_id AND lp3.completed = true
              AND lp3.content_version IS NOT NULL
              AND le3.course_id = g.course_id) AS updated_since_completion,
           (SELECT e.completed_at FROM public.enrollments e
            WHERE e.user_id = g.user_id AND e.course_id = g.course_id
            ORDER BY e.enrolled_at DESC LIMIT 1) AS completed_at,
           (SELECT s.status FROM public.licence_seats s
            WHERE s.licence_id = g.licence_id AND s.user_id = g.user_id LIMIT 1) AS seat_status
    FROM grid g LEFT JOIN required_counts rc ON rc.course_id = g.course_id
  ),
  scored AS (
    SELECT pr.*, CASE WHEN pr.required_total > 0
      THEN round((pr.required_completed::numeric / pr.required_total) * 100)::int ELSE 0 END AS percent
    FROM progress pr
  ),
  labelled AS (
    SELECT s.*, CASE
        WHEN s.required_total > 0 AND s.required_completed >= s.required_total THEN 'completed'
        WHEN s.required_total > 0 AND s.required_completed < s.required_total AND s.required_completed > 0 THEN 'in_progress'
        WHEN s.completed_at IS NOT NULL AND s.required_total = 0 THEN 'completed'
        WHEN s.required_completed > 0 THEN 'in_progress'
        ELSE 'not_started' END AS status
    FROM scored s
  )
  SELECT lb.user_id, p.full_name, u.email::text, lb.course_id, c.title, lb.licence_id, lb.seat_status,
         lb.status, lb.required_total, lb.required_completed, lb.percent, lb.completed_at, c.cpd_hours,
         SUM(CASE WHEN lb.status = 'completed' THEN COALESCE(c.cpd_hours, 0) ELSE 0 END)
           OVER (PARTITION BY lb.user_id) AS cpd_hours_total,
         COALESCE(lb.updated_since_completion, false)
  FROM labelled lb
  JOIN public.courses c ON c.id = lb.course_id
  LEFT JOIN public.profiles p ON p.user_id = lb.user_id
  LEFT JOIN auth.users u ON u.id = lb.user_id
  ORDER BY COALESCE(p.full_name, u.email::text), c.title;
END;
$function$;