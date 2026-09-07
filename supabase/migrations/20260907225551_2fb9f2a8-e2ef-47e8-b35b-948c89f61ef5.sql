ALTER TABLE public.lesson_transcripts ADD COLUMN IF NOT EXISTS chapters jsonb;

COMMENT ON COLUMN public.lesson_transcripts.chapters IS 'Array of {start: seconds, title: text} sorted by start. English ("en") row only for now.';