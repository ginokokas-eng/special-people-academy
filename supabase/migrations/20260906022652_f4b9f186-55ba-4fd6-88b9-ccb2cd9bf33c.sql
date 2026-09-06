CREATE TABLE public.standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework text NOT NULL CHECK (framework IN ('care_certificate','cqc')),
  code text NOT NULL,
  title text NOT NULL,
  parent_code text NULL,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (framework, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.standards TO authenticated;
GRANT ALL ON public.standards TO service_role;
ALTER TABLE public.standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read standards"
  ON public.standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Training admins manage standards"
  ON public.standards FOR ALL TO authenticated
  USING (public.is_ops_training_admin(auth.uid()))
  WITH CHECK (public.is_ops_training_admin(auth.uid()));

INSERT INTO public.standards (framework, code, title, sort) VALUES
  ('care_certificate','1','Understand your role',1),
  ('care_certificate','2','Your personal development',2),
  ('care_certificate','3','Duty of care',3),
  ('care_certificate','4','Equality and diversity',4),
  ('care_certificate','5','Work in a person-centred way',5),
  ('care_certificate','6','Communication',6),
  ('care_certificate','7','Privacy and dignity',7),
  ('care_certificate','8','Fluids and nutrition',8),
  ('care_certificate','9','Awareness of mental health, dementia and learning disability',9),
  ('care_certificate','10','Safeguarding adults',10),
  ('care_certificate','11','Safeguarding children',11),
  ('care_certificate','12','Basic life support',12),
  ('care_certificate','13','Health and safety',13),
  ('care_certificate','14','Handling information',14),
  ('care_certificate','15','Infection prevention and control',15),
  ('cqc','safe','Safe',1),
  ('cqc','effective','Effective',2),
  ('cqc','caring','Caring',3),
  ('cqc','responsive','Responsive',4),
  ('cqc','well_led','Well-led',5);

CREATE TABLE public.standard_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id uuid NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
  course_id uuid NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  bank_id uuid NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(course_id, lesson_id, bank_id) = 1),
  UNIQUE (standard_id, course_id, lesson_id, bank_id)
);

CREATE INDEX idx_standard_links_standard ON public.standard_links(standard_id);
CREATE INDEX idx_standard_links_course ON public.standard_links(course_id);
CREATE INDEX idx_standard_links_lesson ON public.standard_links(lesson_id);
CREATE INDEX idx_standard_links_bank ON public.standard_links(bank_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.standard_links TO authenticated;
GRANT ALL ON public.standard_links TO service_role;
ALTER TABLE public.standard_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read standard links"
  ON public.standard_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage standard links"
  ON public.standard_links FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));

-- Backfill from the denormalised question_bank.standard_code mirror.
INSERT INTO public.standard_links (standard_id, bank_id)
SELECT s.id, qb.id
FROM public.question_bank qb
JOIN public.standards s
  ON s.framework = 'care_certificate' AND s.code = btrim(qb.standard_code)
WHERE qb.standard_code IS NOT NULL AND btrim(qb.standard_code) <> ''
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_course_standard_coverage(_course uuid)
RETURNS TABLE(framework text, code text, title text, linked_at_course boolean, lesson_count int, lesson_titles text[])
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH links AS (
    SELECT sl.standard_id, sl.course_id, sl.lesson_id
    FROM public.standard_links sl
    LEFT JOIN public.lessons le ON le.id = sl.lesson_id
    WHERE sl.course_id = _course OR le.course_id = _course
  )
  SELECT s.framework, s.code, s.title,
         bool_or(l.course_id IS NOT NULL) AS linked_at_course,
         count(DISTINCT l.lesson_id)::int AS lesson_count,
         COALESCE(array_agg(DISTINCT le2.title) FILTER (WHERE le2.title IS NOT NULL), '{}'::text[]) AS lesson_titles
  FROM links l
  JOIN public.standards s ON s.id = l.standard_id
  LEFT JOIN public.lessons le2 ON le2.id = l.lesson_id
  GROUP BY s.framework, s.code, s.title, s.sort
  ORDER BY s.framework, s.sort, s.code;
$$;

REVOKE ALL ON FUNCTION public.get_course_standard_coverage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_course_standard_coverage(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_learner_standard_evidence(_user uuid DEFAULT auth.uid())
RETURNS TABLE(framework text, code text, title text, lessons_total int, lessons_completed int,
              blocks_attempted int, blocks_correct int, quiz_best_score int, last_activity timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user IS NULL OR NOT (
      _user = auth.uid()
      OR public.is_platform_staff(auth.uid())
      OR public.can_assess_learner(auth.uid(), _user)
  ) THEN
    RAISE EXCEPTION 'Not permitted to view this evidence' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH linked AS (
    SELECT sl.standard_id, sl.lesson_id
    FROM public.standard_links sl
    WHERE sl.lesson_id IS NOT NULL
  )
  SELECT s.framework, s.code, s.title,
         count(DISTINCT k.lesson_id)::int AS lessons_total,
         count(DISTINCT lp.lesson_id) FILTER (WHERE lp.completed)::int AS lessons_completed,
         COALESCE(sum(bs.attempted), 0)::int AS blocks_attempted,
         COALESCE(sum(bs.correct), 0)::int AS blocks_correct,
         max(qa.best_score)::int AS quiz_best_score,
         greatest(max(lp.completed_at), max(bs.last_at), max(qa.last_at)) AS last_activity
  FROM linked k
  JOIN public.standards s ON s.id = k.standard_id
  LEFT JOIN public.lesson_progress lp ON lp.lesson_id = k.lesson_id AND lp.user_id = _user
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS attempted,
           count(*) FILTER (WHERE r.is_correct)::int AS correct,
           max(r.updated_at) AS last_at
    FROM public.lesson_block_responses r
    JOIN public.lesson_blocks b ON b.id = r.block_id
    WHERE b.lesson_id = k.lesson_id AND r.user_id = _user
  ) bs ON true
  LEFT JOIN LATERAL (
    SELECT max(a.score)::int AS best_score, max(a.completed_at) AS last_at
    FROM public.quiz_attempts a
    JOIN public.quizzes q ON q.id = a.quiz_id
    WHERE q.lesson_id = k.lesson_id AND a.user_id = _user
  ) qa ON true
  GROUP BY s.framework, s.code, s.title, s.sort
  ORDER BY s.framework, s.sort, s.code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_learner_standard_evidence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_learner_standard_evidence(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_org_standard_results(_org uuid)
RETURNS TABLE(framework text, code text, title text, learners int, learners_complete int, avg_correct_pct numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT c.id AS course_id
    FROM public.courses c
    WHERE v_internal AND c.is_mandatory AND c.is_published
    UNION
    SELECT DISTINCT l.course_id
    FROM public.licences l
    WHERE NOT v_internal AND l.organisation_id = _org AND l.status = 'active'
  ),
  linked AS (
    SELECT sl.standard_id, sl.lesson_id
    FROM public.standard_links sl
    JOIN public.lessons le ON le.id = sl.lesson_id
    JOIN org_courses oc ON oc.course_id = le.course_id
    WHERE sl.lesson_id IS NOT NULL
  ),
  per_learner AS (
    SELECT k.standard_id, mb.user_id,
           count(DISTINCT k.lesson_id)::int AS lessons_total,
           count(DISTINCT lp.lesson_id) FILTER (WHERE lp.completed)::int AS lessons_completed,
           COALESCE(sum(bs.attempted), 0)::int AS attempted,
           COALESCE(sum(bs.correct), 0)::int AS correct
    FROM members mb
    CROSS JOIN linked k
    LEFT JOIN public.lesson_progress lp ON lp.lesson_id = k.lesson_id AND lp.user_id = mb.user_id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS attempted,
             count(*) FILTER (WHERE r.is_correct)::int AS correct
      FROM public.lesson_block_responses r
      JOIN public.lesson_blocks b ON b.id = r.block_id
      WHERE b.lesson_id = k.lesson_id AND r.user_id = mb.user_id
    ) bs ON true
    GROUP BY k.standard_id, mb.user_id
  )
  SELECT s.framework, s.code, s.title,
         count(DISTINCT pl.user_id)::int AS learners,
         count(DISTINCT pl.user_id) FILTER (
           WHERE pl.lessons_total > 0 AND pl.lessons_completed >= pl.lessons_total
         )::int AS learners_complete,
         CASE WHEN sum(pl.attempted) > 0
              THEN round((sum(pl.correct)::numeric / sum(pl.attempted)) * 100, 1)
              ELSE NULL END AS avg_correct_pct
  FROM per_learner pl
  JOIN public.standards s ON s.id = pl.standard_id
  GROUP BY s.framework, s.code, s.title, s.sort
  ORDER BY s.framework, s.sort, s.code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_standard_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_standard_results(uuid) TO authenticated, service_role;