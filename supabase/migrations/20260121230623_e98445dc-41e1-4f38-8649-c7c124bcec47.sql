-- Add featured_rank column for manual ordering of featured courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS featured_rank integer DEFAULT 0;

-- Create index for efficient ordering of featured courses
CREATE INDEX IF NOT EXISTS idx_courses_featured_rank ON public.courses (featured_rank DESC) WHERE is_featured = true;

-- Add comment for documentation
COMMENT ON COLUMN public.courses.featured_rank IS 'Manual ordering for featured courses display (higher = more prominent)';