-- Add unique constraint on lesson_progress for upsert operations
ALTER TABLE public.lesson_progress 
ADD CONSTRAINT lesson_progress_lesson_user_unique UNIQUE (lesson_id, user_id);