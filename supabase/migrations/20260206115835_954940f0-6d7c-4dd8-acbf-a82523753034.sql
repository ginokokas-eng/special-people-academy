-- Add missing columns to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS certificate_expiry_months integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cpd_eligible boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cpd_certified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published'));

-- Update existing courses to have draft status
UPDATE public.courses SET status = 'draft' WHERE status IS NULL;

-- Create lesson_steps table for step-by-step lessons
CREATE TABLE IF NOT EXISTS public.lesson_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    order_index integer NOT NULL DEFAULT 0,
    step_title text NOT NULL,
    instruction text,
    safety_note text,
    what_to_record text,
    created_at timestamp with time zone DEFAULT now()
);

-- Create lesson_resources table
CREATE TABLE IF NOT EXISTS public.lesson_resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    file_url text NOT NULL,
    file_type text NOT NULL,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Add missing columns to quizzes table
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS attempts_allowed integer DEFAULT 3;

-- Add missing columns to quiz_questions table
ALTER TABLE public.quiz_questions 
ADD COLUMN IF NOT EXISTS question_type text DEFAULT 'multiple_choice',
ADD COLUMN IF NOT EXISTS explanation text;

-- Enable RLS on new tables
ALTER TABLE public.lesson_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

-- RLS policies for lesson_steps
CREATE POLICY "Admins can manage lesson steps"
ON public.lesson_steps
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view lesson steps of published courses"
ON public.lesson_steps
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM lessons l
    JOIN courses c ON c.id = l.course_id
    WHERE l.id = lesson_steps.lesson_id
    AND (c.is_published = true OR has_role(auth.uid(), 'admin'::app_role))
));

-- RLS policies for lesson_resources
CREATE POLICY "Admins can manage lesson resources"
ON public.lesson_resources
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view lesson resources of published courses"
ON public.lesson_resources
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM lessons l
    JOIN courses c ON c.id = l.course_id
    WHERE l.id = lesson_resources.lesson_id
    AND (c.is_published = true OR has_role(auth.uid(), 'admin'::app_role))
));