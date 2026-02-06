-- Create staff_profiles table for internal staff management
CREATE TABLE public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  job_title TEXT,
  role app_role NOT NULL DEFAULT 'learner',
  delivery_types TEXT[] DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage staff profiles
CREATE POLICY "Super admins can manage staff profiles"
ON public.staff_profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin')
  )
);

-- Staff can view their own profile
CREATE POLICY "Staff can view own profile"
ON public.staff_profiles
FOR SELECT
USING (user_id = auth.uid());

-- Create helper function for super_admin check
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin')
  )
$$;

-- Create helper function for ops_training_admin check  
CREATE OR REPLACE FUNCTION public.is_ops_training_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'ops_training_admin', 'trainer')
  )
$$;

-- Trigger for updated_at
CREATE TRIGGER update_staff_profiles_updated_at
BEFORE UPDATE ON public.staff_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();