
-- Respiratory Management practical sign-off checklist
CREATE TABLE public.respiratory_competency_signoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id),
  assessor_id uuid NOT NULL REFERENCES public.staff_profiles(id),
  attempt_number integer NOT NULL DEFAULT 1,
  
  -- 9 checklist items
  scope_boundaries boolean DEFAULT false,
  scope_boundaries_comments text,
  respiratory_red_flags boolean DEFAULT false,
  respiratory_red_flags_comments text,
  pulse_oximetry boolean DEFAULT false,
  pulse_oximetry_comments text,
  oxygen_safety boolean DEFAULT false,
  oxygen_safety_comments text,
  oxygen_support boolean DEFAULT false,
  oxygen_support_comments text,
  oral_suction boolean DEFAULT false,
  oral_suction_comments text,
  infection_prevention boolean DEFAULT false,
  infection_prevention_comments text,
  equipment_checks boolean DEFAULT false,
  equipment_checks_comments text,
  documentation_handover boolean DEFAULT false,
  documentation_handover_comments text,
  
  -- Meta fields
  outcome text DEFAULT 'pending',
  action_plan text,
  reassessment_date date,
  location text,
  assessor_notes text,
  assessed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.respiratory_competency_signoffs ENABLE ROW LEVEL SECURITY;

-- Trainers & admins with sign-off authority can manage
CREATE POLICY "Authorized staff can manage respiratory signoffs"
ON public.respiratory_competency_signoffs
FOR ALL
USING (
  (EXISTS (
    SELECT 1 FROM staff_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.can_sign_off_competency = true
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Learners can view their own
CREATE POLICY "Learners can view own respiratory signoffs"
ON public.respiratory_competency_signoffs
FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view all (for trainer portal)
CREATE POLICY "Staff can view respiratory signoffs"
ON public.respiratory_competency_signoffs
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM staff_profiles sp WHERE sp.user_id = auth.uid()
  )) OR has_role(auth.uid(), 'admin'::app_role)
);
