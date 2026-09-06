-- 1) Org membership flag: explicit assessors (NOT the org_admin role).
ALTER TABLE public.organisation_members
  ADD COLUMN IF NOT EXISTS can_assess boolean NOT NULL DEFAULT false;

-- Who may assess a given learner: platform/training staff, or an active member
-- of one of the learner's organisations that is flagged can_assess.
CREATE OR REPLACE FUNCTION public.can_assess_learner(_assessor uuid, _learner uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _assessor IS NOT NULL AND _learner IS NOT NULL AND (
    public.is_ops_training_admin(_assessor)
    OR EXISTS (
      SELECT 1
      FROM public.organisation_members a
      JOIN public.organisation_members m ON m.organisation_id = a.organisation_id
      WHERE a.user_id = _assessor AND a.ended_at IS NULL AND a.can_assess = true
        AND m.user_id = _learner AND m.ended_at IS NULL
    )
  )
$$;

-- 2) Marks table. Learner text stays in lesson_block_responses; marks live here.
CREATE TABLE public.block_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.lesson_blocks(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assessor_id uuid NOT NULL,
  assessor_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('reflection', 'observation')),
  outcome text NOT NULL CHECK (outcome IN ('met', 'not_yet', 'competent', 'not_competent')),
  comment text,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX block_marks_block_user_idx ON public.block_marks (block_id, user_id, signed_at DESC);
CREATE INDEX block_marks_user_idx ON public.block_marks (user_id);

GRANT SELECT, INSERT ON public.block_marks TO authenticated;
GRANT ALL ON public.block_marks TO service_role;

ALTER TABLE public.block_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can read marks about their own work"
ON public.block_marks FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Assessors can read marks for their learners"
ON public.block_marks FOR SELECT TO authenticated
USING (public.can_assess_learner(auth.uid(), user_id));

CREATE POLICY "Assessors can add marks for their learners"
ON public.block_marks FOR INSERT TO authenticated
WITH CHECK (assessor_id = auth.uid() AND public.can_assess_learner(auth.uid(), user_id));

CREATE POLICY "Training staff manage all marks"
ON public.block_marks FOR ALL TO authenticated
USING (public.is_ops_training_admin(auth.uid()))
WITH CHECK (public.is_ops_training_admin(auth.uid()));

CREATE TRIGGER update_block_marks_updated_at
BEFORE UPDATE ON public.block_marks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Org admins / staff toggle the assess flag (no broad UPDATE policy granted).
CREATE OR REPLACE FUNCTION public.set_member_can_assess(_org uuid, _user uuid, _can boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_platform_staff(auth.uid()) OR public.is_org_admin(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'Not permitted to change assessors for this organisation'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.organisation_members
  SET can_assess = COALESCE(_can, false), updated_at = now()
  WHERE organisation_id = _org AND user_id = _user AND ended_at IS NULL;

  RETURN true;
END;
$$;

-- 4) Marking queue: submitted reflections and assessed checklists.
CREATE OR REPLACE FUNCTION public.get_marking_queue(_org uuid DEFAULT NULL)
RETURNS TABLE(
  block_id uuid,
  lesson_id uuid,
  course_id uuid,
  user_id uuid,
  full_name text,
  email text,
  course_title text,
  lesson_title text,
  block_type text,
  payload jsonb,
  response jsonb,
  submitted_at timestamp with time zone,
  mark_id uuid,
  mark_outcome text,
  mark_comment text,
  mark_signed_at timestamp with time zone,
  marked boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _org IS NULL THEN
    IF NOT public.is_ops_training_admin(auth.uid()) THEN
      RAISE EXCEPTION 'not authorised' USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSE
    IF NOT (
      public.is_platform_staff(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.organisation_members m
        WHERE m.organisation_id = _org AND m.user_id = auth.uid()
          AND m.ended_at IS NULL AND m.can_assess = true
      )
    ) THEN
      RAISE EXCEPTION 'not authorised' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN QUERY
  WITH items AS (
    SELECT r.block_id, r.lesson_id, r.user_id, r.response, r.updated_at,
           b.block_type, b.payload, l.course_id, l.title AS lesson_title
    FROM public.lesson_block_responses r
    JOIN public.lesson_blocks b ON b.id = r.block_id
    JOIN public.lessons l ON l.id = b.lesson_id
    WHERE r.state = 'complete'
      AND (
        b.block_type = 'reflection'
        OR (b.block_type = 'checklist' AND coalesce(b.payload->>'mode', 'reference') = 'assessed')
      )
      AND (
        _org IS NULL OR r.user_id IN (
          SELECT m.user_id FROM public.organisation_members m
          WHERE m.organisation_id = _org AND m.ended_at IS NULL
        )
      )
  ),
  latest AS (
    SELECT DISTINCT ON (bm.block_id, bm.user_id)
           bm.block_id, bm.user_id, bm.id, bm.outcome, bm.comment, bm.signed_at
    FROM public.block_marks bm
    JOIN items i ON i.block_id = bm.block_id AND i.user_id = bm.user_id
    ORDER BY bm.block_id, bm.user_id, bm.signed_at DESC
  )
  SELECT i.block_id, i.lesson_id, i.course_id, i.user_id,
         p.full_name, u.email::text, c.title, i.lesson_title,
         i.block_type, i.payload, i.response, i.updated_at,
         la.id, la.outcome, la.comment, la.signed_at,
         (la.id IS NOT NULL AND la.signed_at >= i.updated_at)
  FROM items i
  JOIN public.courses c ON c.id = i.course_id
  LEFT JOIN public.profiles p ON p.user_id = i.user_id
  LEFT JOIN auth.users u ON u.id = i.user_id
  LEFT JOIN latest la ON la.block_id = i.block_id AND la.user_id = i.user_id
  ORDER BY i.updated_at DESC;
END;
$$;

-- 5) Record a reflection mark.
CREATE OR REPLACE FUNCTION public.record_reflection_mark(
  _block_id uuid,
  _user_id uuid,
  _outcome text,
  _assessor_name text,
  _comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessor uuid := auth.uid();
  v_lesson uuid;
  v_course uuid;
  v_type text;
  v_id uuid;
BEGIN
  IF v_assessor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.can_assess_learner(v_assessor, _user_id) THEN
    RAISE EXCEPTION 'Not permitted to mark this learner' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _outcome NOT IN ('met', 'not_yet') THEN
    RAISE EXCEPTION 'A reflection is either met or not yet' USING ERRCODE = 'check_violation';
  END IF;
  IF coalesce(trim(_assessor_name), '') = '' THEN
    RAISE EXCEPTION 'Type your name to sign this mark' USING ERRCODE = 'check_violation';
  END IF;

  SELECT b.lesson_id, b.block_type, l.course_id INTO v_lesson, v_type, v_course
  FROM public.lesson_blocks b JOIN public.lessons l ON l.id = b.lesson_id
  WHERE b.id = _block_id;

  IF v_lesson IS NULL THEN
    RAISE EXCEPTION 'block_not_found';
  END IF;
  IF v_type <> 'reflection' THEN
    RAISE EXCEPTION 'This activity is not a reflection' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.block_marks
    (block_id, lesson_id, course_id, user_id, assessor_id, assessor_name, kind, outcome, comment)
  VALUES
    (_block_id, v_lesson, v_course, _user_id, v_assessor, trim(_assessor_name), 'reflection', _outcome, _comment)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 6) Record a practical observation against an assessed checklist.
CREATE OR REPLACE FUNCTION public.record_observation(
  _block_id uuid,
  _user_id uuid,
  _criteria jsonb,
  _assessor_name text,
  _comment text DEFAULT NULL
)
RETURNS TABLE(mark_id uuid, outcome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessor uuid := auth.uid();
  v_lesson uuid;
  v_course uuid;
  v_type text;
  v_payload jsonb;
  v_total int;
  v_met int;
  v_outcome text;
  v_requires boolean;
  v_id uuid;
BEGIN
  IF v_assessor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.can_assess_learner(v_assessor, _user_id) THEN
    RAISE EXCEPTION 'Not permitted to assess this learner' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF coalesce(trim(_assessor_name), '') = '' THEN
    RAISE EXCEPTION 'Type your name to sign this observation' USING ERRCODE = 'check_violation';
  END IF;

  SELECT b.lesson_id, b.block_type, b.payload, l.course_id
    INTO v_lesson, v_type, v_payload, v_course
  FROM public.lesson_blocks b JOIN public.lessons l ON l.id = b.lesson_id
  WHERE b.id = _block_id;

  IF v_lesson IS NULL THEN
    RAISE EXCEPTION 'block_not_found';
  END IF;
  IF v_type <> 'checklist' OR coalesce(v_payload->>'mode', 'reference') <> 'assessed' THEN
    RAISE EXCEPTION 'This checklist is a study reference, not an assessed one'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*)::int INTO v_total
  FROM jsonb_array_elements(coalesce(v_payload->'steps', '[]'::jsonb)) s;

  SELECT count(*)::int INTO v_met
  FROM jsonb_array_elements(coalesce(v_payload->'steps', '[]'::jsonb)) s
  WHERE coalesce((_criteria->>(s.value->>'id'))::boolean, false);

  IF v_total = 0 THEN
    RAISE EXCEPTION 'This checklist has no steps to assess' USING ERRCODE = 'check_violation';
  END IF;

  v_outcome := CASE WHEN v_met >= v_total THEN 'competent' ELSE 'not_competent' END;

  INSERT INTO public.block_marks
    (block_id, lesson_id, course_id, user_id, assessor_id, assessor_name, kind, outcome, comment, criteria)
  VALUES
    (_block_id, v_lesson, v_course, _user_id, v_assessor, trim(_assessor_name), 'observation',
     v_outcome, _comment, coalesce(_criteria, '{}'::jsonb))
  RETURNING id INTO v_id;

  SELECT c.requires_practical_signoff INTO v_requires FROM public.courses c WHERE c.id = v_course;

  IF v_outcome = 'competent' AND coalesce(v_requires, false) THEN
    INSERT INTO public.competency_signoffs
      (user_id, course_id, assessor_id, outcome, assessor_notes, signed_off_at)
    VALUES (_user_id, v_course, v_assessor, 'competent', _comment, now())
    ON CONFLICT (user_id, course_id) DO UPDATE
      SET assessor_id = EXCLUDED.assessor_id,
          outcome = 'competent',
          assessor_notes = COALESCE(EXCLUDED.assessor_notes, public.competency_signoffs.assessor_notes),
          signed_off_at = now(),
          updated_at = now();
  END IF;

  RETURN QUERY SELECT v_id, v_outcome;
END;
$$;