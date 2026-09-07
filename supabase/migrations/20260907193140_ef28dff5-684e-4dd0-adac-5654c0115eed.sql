-- Quiz grading rollout, Phase B (client lockout).
-- Phase A (shipped 2026-09-06) introduced the SECURITY DEFINER RPCs
-- start_quiz_attempt / get_quiz_for_attempt / check_quiz_answer /
-- submit_quiz_attempt and moved all grading server-side. The lockout was
-- deliberately deferred to Phase B so that any learner still running an older
-- client bundle mid-quiz could finish without errors. That window has long
-- passed, so we now remove the direct client write/read paths.

-- 1. Attempts are written only by submit_quiz_attempt (SECURITY DEFINER)
--    and the service role.
DROP POLICY IF EXISTS "Users can create attempts" ON public.quiz_attempts;
REVOKE INSERT ON public.quiz_attempts FROM authenticated;

-- 2. Question text/answers are served only through attempt sessions.
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
CREATE POLICY "Training staff read quiz questions"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (
  public.is_ops_training_admin(auth.uid())
  OR public.has_role(auth.uid(), 'trainer')
);
