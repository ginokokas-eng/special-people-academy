-- Drop and recreate the lesson_type check constraint to support additional types
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_lesson_type_check;

ALTER TABLE lessons ADD CONSTRAINT lessons_lesson_type_check 
CHECK (lesson_type = ANY (ARRAY['video'::text, 'pdf'::text, 'quiz'::text, 'practical'::text, 'text'::text, 'scenario'::text]));