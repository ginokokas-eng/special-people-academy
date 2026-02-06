-- Create delivery_type enum for standardized values
CREATE TYPE public.course_delivery_type AS ENUM (
  'online_self_paced',
  'live_online',
  'in_person_practical',
  'blended'
);

-- Create course_trainers table to track which trainers can sign off on which courses
CREATE TABLE public.course_trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  can_sign_off BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(course_id, staff_id)
);

-- Enable RLS
ALTER TABLE public.course_trainers ENABLE ROW LEVEL SECURITY;

-- RLS policies for course_trainers
CREATE POLICY "Admins can manage course trainers"
ON public.course_trainers
FOR ALL
USING (public.is_super_admin(auth.uid()) OR public.is_ops_training_admin(auth.uid()));

CREATE POLICY "Anyone can view course trainers"
ON public.course_trainers
FOR SELECT
USING (true);

-- Add available_delivery_types column to courses for multiple delivery options
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS available_delivery_types TEXT[] DEFAULT '{}';

-- Add is_public_purchase column to control visibility in public catalog
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_public_purchase BOOLEAN DEFAULT true;

-- Add scope_notes for additional course information
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS scope_notes TEXT;