-- Phase 5 — expiry locks the content, never the certificate.
--
-- Phase 2 gated ENROLMENT on entitlement, but lesson content was gated on
-- is_enrolled() alone. An enrolment row outlives the licence that justified it,
-- so an expired or revoked licence left the course fully readable — the paywall
-- had no back edge.
--
-- can_access_course() is the same question used at enrolment: an active seat,
-- internal membership, or a grandfathered enrolment. Using it here means access
-- ends when entitlement ends, for every audience at once.
--
-- What deliberately does NOT change: the `certificates` policies. A certificate
-- is a historical fact about something the learner completed, not a rented
-- asset. Its own expires_at already carries validity, verify_certificate()
-- already reports status to third parties, and locking a carer out of proof of
-- their own training is the most damaging thing this design could do.

DROP POLICY IF EXISTS "Enrolled learners can view lesson blocks" ON public.lesson_blocks;

CREATE POLICY "Entitled learners can view lesson blocks"
  ON public.lesson_blocks
  FOR SELECT
  USING (
    public.is_ops_training_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_blocks.lesson_id
        AND public.can_access_course(auth.uid(), l.course_id)
    )
  );

-- Progress is the learner's own record of what they did. It stays readable
-- after expiry — they keep sight of how far they got — but it can no longer be
-- ADVANCED without entitlement, so an expired learner cannot quietly keep
-- completing lessons toward a certificate they are no longer paying for.
DROP POLICY IF EXISTS "Users can update own progress" ON public.lesson_progress;

CREATE POLICY "Entitled users can record progress"
  ON public.lesson_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_progress.lesson_id
        AND public.can_access_course(auth.uid(), l.course_id)
    )
  );

DROP POLICY IF EXISTS "Users can modify own progress" ON public.lesson_progress;

CREATE POLICY "Entitled users can modify own progress"
  ON public.lesson_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_progress.lesson_id
        AND public.can_access_course(auth.uid(), l.course_id)
    )
  );
