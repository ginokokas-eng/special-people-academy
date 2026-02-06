-- Add can_sign_off_competency column to staff_profiles
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS can_sign_off_competency boolean DEFAULT false;

-- Create career_applications table
CREATE TABLE public.career_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  role_applied_for text NOT NULL,
  cv_file_url text,
  message text,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on career_applications
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (submit application)
CREATE POLICY "Anyone can submit career applications"
ON public.career_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Super admins can view all applications
CREATE POLICY "Super admins can view applications"
ON public.career_applications
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Super admins can update applications (review, add notes)
CREATE POLICY "Super admins can update applications"
ON public.career_applications
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Super admins can delete applications
CREATE POLICY "Super admins can delete applications"
ON public.career_applications
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));