-- Make scorm-extracted bucket private to prevent unauthorized public access
UPDATE storage.buckets SET public = false WHERE id = 'scorm-extracted';

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can read extracted SCORM content" ON storage.objects;

-- Allow admins to read SCORM content via authenticated API (for admin tools)
CREATE POLICY "Admins can read SCORM content"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'scorm-extracted' 
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow the service role (edge functions) to read SCORM content - handled implicitly by service role key
-- No additional policy needed for service role access