-- The public catalogue rendered every published course as empty ("0 lessons",
-- "0 min", "Course content coming soon") because this policy — despite being
-- named "Anyone can view lessons of published courses" — was granted to
-- {authenticated} only. Its siblings on courses ({anon,authenticated}) and
-- modules ({public}) were always public, so a signed-out visitor could see a
-- course and its module titles but none of the 292 lessons underneath.
-- The USING clause is unchanged: still published-courses-only, plus admins.
DROP POLICY IF EXISTS "Anyone can view lessons of published courses" ON public.lessons;

CREATE POLICY "Anyone can view lessons of published courses"
  ON public.lessons
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
        AND (courses.is_published = true OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

GRANT SELECT ON public.lessons TO anon;

DO $assert$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='lessons'
      AND policyname='Anyone can view lessons of published courses'
      AND 'anon' = ANY (roles)
  ) THEN
    RAISE EXCEPTION 'lessons SELECT policy still excludes anon — catalogue stays empty';
  END IF;
END
$assert$;