-- Lesson media (video blocks) live in the private `lesson-media` bucket.
-- Object paths: {course_id}/{lesson_id}/{uuid}.{ext}
-- Write access: ops/training admins + trainers only. No learner SELECT: learners
-- receive short-lived signed URLs from the lesson-media-url edge function.

DROP POLICY IF EXISTS "lesson_media_admin_insert" ON storage.objects;
CREATE POLICY "lesson_media_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lesson-media' AND public.is_ops_training_admin(auth.uid()));

DROP POLICY IF EXISTS "lesson_media_admin_update" ON storage.objects;
CREATE POLICY "lesson_media_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lesson-media' AND public.is_ops_training_admin(auth.uid()))
WITH CHECK (bucket_id = 'lesson-media' AND public.is_ops_training_admin(auth.uid()));

DROP POLICY IF EXISTS "lesson_media_admin_delete" ON storage.objects;
CREATE POLICY "lesson_media_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lesson-media' AND public.is_ops_training_admin(auth.uid()));

DROP POLICY IF EXISTS "lesson_media_admin_select" ON storage.objects;
CREATE POLICY "lesson_media_admin_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lesson-media' AND public.is_ops_training_admin(auth.uid()));