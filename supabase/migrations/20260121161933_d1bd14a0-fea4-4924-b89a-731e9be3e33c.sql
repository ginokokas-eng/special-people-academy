-- Add requires_practical_signoff column to courses table
ALTER TABLE public.courses 
ADD COLUMN requires_practical_signoff boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.courses.requires_practical_signoff IS 'When true, learners must complete practical sign-off to finish the course';