-- Add certificate_type column to certificates table for tracking completion vs competency
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS certificate_type TEXT DEFAULT 'completion';

-- Add competency_signed_by and competency_signed_at for practical sign-off tracking
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS competency_signed_by UUID REFERENCES public.staff_profiles(id);
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS competency_signed_at TIMESTAMP WITH TIME ZONE;

-- Add constraint for certificate types
ALTER TABLE public.certificates ADD CONSTRAINT certificates_type_check 
CHECK (certificate_type IN ('completion', 'competency'));