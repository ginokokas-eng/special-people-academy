-- Allow admins to delete enrollments (for reassigning training)
CREATE POLICY "Admins can delete enrollments"
ON public.enrollments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert enrollments on behalf of users
CREATE POLICY "Admins can create enrollments"
ON public.enrollments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));