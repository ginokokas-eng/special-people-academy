-- Create private storage bucket for course resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-resources', 'course-resources', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users enrolled in a course to download resources
CREATE POLICY "Enrolled users can download course resources"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'course-resources' AND
  auth.uid() IS NOT NULL AND (
    -- Check if user is enrolled in the course (folder name is course_id)
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE user_id = auth.uid()
      AND course_id::text = (storage.foldername(name))[1]
    )
    OR
    -- Admins can access all resources
    public.has_role(auth.uid(), 'admin')
    OR
    -- Trainers can access resources for courses they train
    EXISTS (
      SELECT 1 FROM public.practical_sessions ps
      WHERE ps.trainer_id = auth.uid()
      AND ps.course_id::text = (storage.foldername(name))[1]
    )
  )
);

-- Policy: Admins can upload resources
CREATE POLICY "Admins can upload course resources"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-resources' AND
  public.has_role(auth.uid(), 'admin')
);

-- Policy: Admins can update resources
CREATE POLICY "Admins can update course resources"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-resources' AND
  public.has_role(auth.uid(), 'admin')
);

-- Policy: Admins can delete resources
CREATE POLICY "Admins can delete course resources"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-resources' AND
  public.has_role(auth.uid(), 'admin')
);