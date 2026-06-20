ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS duration_seconds integer;

COMMENT ON COLUMN public.lessons.duration_seconds IS 'Exact media duration in seconds for video/scorm lessons. Drives sidebar/module duration display (rounded up to the nearest minute, minimum 1 min). NULL means duration is unknown and no placeholder should be shown.';