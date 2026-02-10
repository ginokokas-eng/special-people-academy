
-- BLS Competency Sign-off table with 8 checklist sections
CREATE TABLE public.bls_competency_signoffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id),
  assessor_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  attempt_number INT NOT NULL DEFAULT 1,
  location TEXT,
  assessed_at TIMESTAMPTZ,
  
  -- Section 1: Scene safety
  scene_safety BOOLEAN DEFAULT FALSE,
  scene_safety_comments TEXT,
  
  -- Section 2: Breathing check
  breathing_check BOOLEAN DEFAULT FALSE,
  breathing_check_comments TEXT,
  
  -- Section 3: High-quality compressions
  chest_compressions BOOLEAN DEFAULT FALSE,
  chest_compressions_comments TEXT,
  
  -- Section 4: Rescue breaths / compression-only
  rescue_breaths BOOLEAN DEFAULT FALSE,
  rescue_breaths_comments TEXT,
  
  -- Section 5: AED use
  aed_use BOOLEAN DEFAULT FALSE,
  aed_use_comments TEXT,
  
  -- Section 6: Choking response
  choking_response BOOLEAN DEFAULT FALSE,
  choking_response_comments TEXT,
  
  -- Section 7: Recovery position
  recovery_position BOOLEAN DEFAULT FALSE,
  recovery_position_comments TEXT,
  
  -- Section 8: Handover and reporting
  handover_reporting BOOLEAN DEFAULT FALSE,
  handover_reporting_comments TEXT,
  
  -- Outcome fields
  assessor_notes TEXT,
  outcome TEXT DEFAULT 'pending',
  action_plan TEXT,
  reassessment_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bls_competency_signoffs ENABLE ROW LEVEL SECURITY;

-- Trainers/admins can view all sign-offs
CREATE POLICY "Trainers and admins can view BLS sign-offs"
ON public.bls_competency_signoffs
FOR SELECT
TO authenticated
USING (
  public.is_ops_training_admin(auth.uid()) OR auth.uid() = user_id
);

-- Only authorized sign-off staff can insert
CREATE POLICY "Authorized staff can insert BLS sign-offs"
ON public.bls_competency_signoffs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_ops_training_admin(auth.uid())
);

-- Only authorized staff can update
CREATE POLICY "Authorized staff can update BLS sign-offs"
ON public.bls_competency_signoffs
FOR UPDATE
TO authenticated
USING (
  public.is_ops_training_admin(auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_bls_competency_signoffs_updated_at
BEFORE UPDATE ON public.bls_competency_signoffs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
