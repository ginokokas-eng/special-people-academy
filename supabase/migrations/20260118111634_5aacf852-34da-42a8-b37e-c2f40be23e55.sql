-- Create instructors table
CREATE TABLE public.instructors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  job_title TEXT,
  credentials TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Anyone can view instructors
CREATE POLICY "Anyone can view instructors"
ON public.instructors FOR SELECT
USING (true);

-- Admins can manage instructors
CREATE POLICY "Admins can manage instructors"
ON public.instructors FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create modules table (course sections/modules)
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Anyone can view modules of published courses
CREATE POLICY "Anyone can view modules of published courses"
ON public.modules FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses 
  WHERE courses.id = modules.course_id 
  AND (courses.is_published = true OR has_role(auth.uid(), 'admin'::app_role))
));

-- Admins can manage modules
CREATE POLICY "Admins can manage modules"
ON public.modules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add module_id to lessons (nullable for backward compatibility)
ALTER TABLE public.lessons ADD COLUMN module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL;
ALTER TABLE public.lessons ADD COLUMN lesson_type TEXT DEFAULT 'video' CHECK (lesson_type IN ('video', 'pdf', 'quiz', 'practical'));

-- Create course_resources table
CREATE TABLE public.course_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf', 'document', 'link', 'video')),
  url TEXT,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;

-- Anyone can view resources of published courses
CREATE POLICY "Anyone can view resources of published courses"
ON public.course_resources FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses 
  WHERE courses.id = course_resources.course_id 
  AND (courses.is_published = true OR has_role(auth.uid(), 'admin'::app_role))
));

-- Admins can manage resources
CREATE POLICY "Admins can manage resources"
ON public.course_resources FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create course_reviews table
CREATE TABLE public.course_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
ON public.course_reviews FOR SELECT
USING (is_approved = true OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Users can create their own reviews
CREATE POLICY "Users can create their own reviews"
ON public.course_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage reviews
CREATE POLICY "Admins can manage reviews"
ON public.course_reviews FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add additional columns to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.instructors(id);
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'online' CHECK (delivery_type IN ('online', 'blended', 'in-person'));
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT true;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS has_certificate BOOLEAN DEFAULT true;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cpd_hours NUMERIC DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS pass_mark INTEGER DEFAULT 70;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS overview TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS learning_outcomes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS practical_details TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS assessment_details TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS certificate_details TEXT;

-- Create practical_sessions table for scheduling
CREATE TABLE public.practical_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_date TIMESTAMP WITH TIME ZONE,
  location TEXT,
  max_attendees INTEGER DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practical_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view practical sessions of published courses
CREATE POLICY "Anyone can view practical sessions"
ON public.practical_sessions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses 
  WHERE courses.id = practical_sessions.course_id 
  AND (courses.is_published = true OR has_role(auth.uid(), 'admin'::app_role))
));

-- Admins can manage practical sessions
CREATE POLICY "Admins can manage practical sessions"
ON public.practical_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert sample instructor
INSERT INTO public.instructors (full_name, bio, job_title, credentials)
VALUES (
  'Elisa Bianco',
  'Elisa is a certified Paediatric First Aid instructor with over 10 years of experience in healthcare training. She specializes in working with care providers supporting children and young people with complex needs.',
  'Senior Training Facilitator',
  'RGN, BSc Nursing, Level 3 Award in Education and Training'
);