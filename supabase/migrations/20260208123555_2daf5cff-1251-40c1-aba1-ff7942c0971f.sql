-- Create table for practical competency sign-off records
CREATE TABLE public.competency_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assessor_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  
  -- Checklist items (specific to enteral feeding but extensible)
  tube_identification BOOLEAN DEFAULT false,
  bolus_method BOOLEAN DEFAULT false,
  pump_setup BOOLEAN DEFAULT false,
  flushing_medication BOOLEAN DEFAULT false,
  routine_care BOOLEAN DEFAULT false,
  troubleshooting BOOLEAN DEFAULT false,
  documentation_standard BOOLEAN DEFAULT false,
  
  -- Overall outcome
  outcome TEXT CHECK (outcome IN ('competent', 'not_yet_competent', 'pending')) DEFAULT 'pending',
  assessor_notes TEXT,
  
  signed_off_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.competency_signoffs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Learners can view their own signoffs"
ON public.competency_signoffs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authorized assessors can manage signoffs"
ON public.competency_signoffs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.user_id = auth.uid()
    AND sp.can_sign_off_competency = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Trainers can view signoffs for courses they train"
ON public.competency_signoffs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add index for efficient lookups
CREATE INDEX idx_competency_signoffs_user_course ON public.competency_signoffs(user_id, course_id);
CREATE INDEX idx_competency_signoffs_assessor ON public.competency_signoffs(assessor_id);