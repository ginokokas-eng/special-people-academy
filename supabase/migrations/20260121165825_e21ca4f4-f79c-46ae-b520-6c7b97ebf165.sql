-- Update storage upload policy to enforce path structure validation
DROP POLICY IF EXISTS "Admins can upload course resources" ON storage.objects;

CREATE POLICY "Admins can upload course resources"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-resources' AND
  public.has_role(auth.uid(), 'admin'::app_role) AND
  -- Enforce path structure: must be exactly {course_id}/{filename} (only 1 folder level)
  array_length(storage.foldername(name), 1) = 1 AND
  -- Validate that the folder name is a valid UUID format
  (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);