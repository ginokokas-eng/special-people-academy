
-- Create medication competency signoffs table
CREATE TABLE public.medication_competency_signoffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id),
  assessor_id UUID NOT NULL REFERENCES public.staff_profiles(id),
  
  -- Checklist section 1: Pre-administration checks
  pre_admin_checks BOOLEAN DEFAULT false,
  pre_admin_checks_comments TEXT,
  
  -- Checklist section 2: Communication with the person
  communication BOOLEAN DEFAULT false,
  communication_comments TEXT,
  
  -- Checklist section 3: Administration process
  admin_process BOOLEAN DEFAULT false,
  admin_process_comments TEXT,
  
  -- Checklist section 4: MAR documentation
  mar_documentation BOOLEAN DEFAULT false,
  mar_documentation_comments TEXT,
  
  -- Checklist section 5: Refusal/omission handling
  refusal_handling BOOLEAN DEFAULT false,
  refusal_handling_comments TEXT,
  
  -- Checklist section 6: PRN scenario
  prn_handling BOOLEAN DEFAULT false,
  prn_handling_comments TEXT,
  
  -- Checklist section 7: Storage/keys/fridge awareness
  storage_awareness BOOLEAN DEFAULT false,
  storage_awareness_comments TEXT,
  
  -- Checklist section 8: Incident/escalation scenario
  incident_escalation BOOLEAN DEFAULT false,
  incident_escalation_comments TEXT,
  
  -- Assessment metadata
  location TEXT,
  attempt_number INTEGER DEFAULT 1,
  outcome TEXT DEFAULT 'pending' CHECK (outcome IN ('pending', 'competent', 'not_yet_competent')),
  assessor_notes TEXT,
  
  -- Required if Not Yet Competent
  action_plan TEXT,
  reassessment_date DATE,
  
  -- Timestamps
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one record per user/course/attempt
  UNIQUE(user_id, course_id, attempt_number)
);

-- Enable RLS
ALTER TABLE public.medication_competency_signoffs ENABLE ROW LEVEL SECURITY;

-- Policy: Authorized assessors (can_sign_off_competency = true) can manage signoffs
CREATE POLICY "Authorized assessors can manage medication signoffs"
ON public.medication_competency_signoffs
FOR ALL
USING (
  (EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.can_sign_off_competency = true
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Trainers/staff can view (but not submit final signoff unless authorized)
CREATE POLICY "Staff can view medication signoffs"
ON public.medication_competency_signoffs
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM staff_profiles sp WHERE sp.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Learners can view their own signoffs
CREATE POLICY "Learners can view own medication signoffs"
ON public.medication_competency_signoffs
FOR SELECT
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_medication_signoffs_updated_at
BEFORE UPDATE ON public.medication_competency_signoffs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
