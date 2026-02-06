-- Add Google Calendar sync fields to practical_sessions
ALTER TABLE public.practical_sessions
ADD COLUMN IF NOT EXISTS google_event_id text,
ADD COLUMN IF NOT EXISTS google_calendar_id text,
ADD COLUMN IF NOT EXISTS calendar_sync_status text DEFAULT 'not_synced',
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

-- Add index for faster lookups by google_event_id
CREATE INDEX IF NOT EXISTS idx_practical_sessions_google_event_id 
ON public.practical_sessions(google_event_id) 
WHERE google_event_id IS NOT NULL;