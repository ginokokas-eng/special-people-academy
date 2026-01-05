-- Fix course level constraint to use new labels
-- (previous attempts failed because the old constraint blocked updates)

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_level_check;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_level_check_new;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_level_check_new2;

-- Map old values to the new values
UPDATE public.courses SET level = 'New Joiner' WHERE level = 'Beginner' OR level IS NULL;
UPDATE public.courses SET level = 'Enhanced' WHERE level = 'Intermediate';
UPDATE public.courses SET level = 'Complex' WHERE level = 'Advanced';

-- Update default for new rows
ALTER TABLE public.courses ALTER COLUMN level SET DEFAULT 'New Joiner';

-- Re-add constraint (allow NULL just in case older rows exist)
ALTER TABLE public.courses
ADD CONSTRAINT courses_level_check
CHECK (level IS NULL OR level IN ('New Joiner', 'Enhanced', 'Complex'));
