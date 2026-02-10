-- Add prerequisite course support
ALTER TABLE public.courses ADD COLUMN prerequisite_course_id UUID REFERENCES public.courses(id);
ALTER TABLE public.courses ADD COLUMN prerequisite_required BOOLEAN NOT NULL DEFAULT false;

-- Set the Awareness course as prerequisite for Competency
UPDATE public.courses 
SET prerequisite_course_id = (SELECT id FROM public.courses WHERE slug = 'medication-administration-awareness'),
    prerequisite_required = false
WHERE slug = 'medication-administration-competency';