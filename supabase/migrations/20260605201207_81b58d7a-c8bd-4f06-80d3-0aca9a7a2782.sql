ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS training_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS programmes int[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mandatory_category text,
  ADD COLUMN IF NOT EXISTS evidence_type text,
  ADD COLUMN IF NOT EXISTS renewal_months int,
  ADD COLUMN IF NOT EXISTS warning_days int,
  ADD COLUMN IF NOT EXISTS completion_deadline_days int;

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_mandatory_category_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_mandatory_category_check
  CHECK (mandatory_category IS NULL OR mandatory_category IN ('core','role_based','client_specific','elderly_care','manager','office'));

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_evidence_type_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_evidence_type_check
  CHECK (evidence_type IS NULL OR evidence_type IN ('online','blended','practical_competency','certificate_upload','sign_off','policy_acknowledgement'));