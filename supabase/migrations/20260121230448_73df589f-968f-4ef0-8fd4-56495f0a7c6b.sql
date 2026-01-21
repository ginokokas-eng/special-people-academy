-- Add is_featured column to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Create index for efficient featured course queries
CREATE INDEX IF NOT EXISTS idx_courses_featured ON public.courses (is_featured) WHERE is_featured = true;