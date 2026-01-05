-- Drop the restrictive policy and recreate as permissive for public access
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;

CREATE POLICY "Anyone can view published courses"
ON public.courses
FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- Keep admin access separate
DROP POLICY IF EXISTS "Admins can view all courses" ON public.courses;

CREATE POLICY "Admins can view all courses"
ON public.courses
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));