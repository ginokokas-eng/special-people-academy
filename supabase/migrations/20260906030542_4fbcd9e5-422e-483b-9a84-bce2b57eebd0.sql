-- A1. get_learner_standard_evidence referenced quiz_attempts.completed_at, which
-- does not exist (the column is attempted_at). SQL sanity check for future edits:
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='quiz_attempts';
--   -> id, user_id, quiz_id, score, passed, answers, attempted_at, question_snapshot
-- Every other column referenced below is verified present:
--   lesson_progress.completed / completed_at, lesson_block_responses.is_correct /
--   updated_at, standard_links.lesson_id, standards.framework/code/title/sort.
CREATE OR REPLACE FUNCTION public.get_learner_standard_evidence(_user uuid DEFAULT auth.uid())
 RETURNS TABLE(framework text, code text, title text, lessons_total integer, lessons_completed integer, blocks_attempted integer, blocks_correct integer, quiz_best_score integer, last_activity timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT max(a.score)::int AS best_score, max(a.attempted_at) AS last_at
    FROM public.quiz_attempts a
    JOIN public.quizzes q ON q.id = a.quiz_id
    WHERE q.lesson_id = k.lesson_id AND a.user_id = _user
  ) qa ON true
  GROUP BY s.framework, s.code, s.title, s.sort
  ORDER BY s.framework, s.sort, s.code;
END;
$function$;

-- A2. An organisation assessor must never be able to mark their own work. The
-- platform-staff branch is unchanged. block_marks INSERT policy and the
-- record_observation / record_reflection_mark RPCs all call this function, so
-- they inherit the self-guard.
CREATE OR REPLACE FUNCTION public.can_assess_learner(_assessor uuid, _learner uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _assessor IS NOT NULL AND _learner IS NOT NULL AND (
    public.is_ops_training_admin(_assessor)
    OR (
      _assessor <> _learner
      AND EXISTS (
        SELECT 1
        FROM public.organisation_members a
        JOIN public.organisation_members m ON m.organisation_id = a.organisation_id
        WHERE a.user_id = _assessor AND a.ended_at IS NULL AND a.can_assess = true
          AND m.user_id = _learner AND m.ended_at IS NULL
      )
    )
  )
$function$;

-- K3. Reviewer comments on lesson blocks. Keyed on the block's STABLE client id
-- (lesson_blocks rows are rewritten on save), so comments survive reordering.
CREATE TABLE public.block_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  block_client_id text NOT NULL,
  author uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  resolved_by uuid NULL
);

CREATE INDEX block_comments_lesson_idx ON public.block_comments (lesson_id, block_client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_comments TO authenticated;
GRANT ALL ON public.block_comments TO service_role;

ALTER TABLE public.block_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read block comments"
ON public.block_comments FOR SELECT TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Staff can add block comments"
ON public.block_comments FOR INSERT TO authenticated
WITH CHECK (
  author = auth.uid()
  AND (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'))
);

CREATE POLICY "Staff can resolve block comments"
ON public.block_comments FOR UPDATE TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'))
WITH CHECK (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Staff can delete block comments"
ON public.block_comments FOR DELETE TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));