
ALTER TABLE lessons DROP CONSTRAINT lessons_lesson_type_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_lesson_type_check CHECK (lesson_type = ANY (ARRAY['video','pdf','quiz','practical','text','scenario','scorm']));
