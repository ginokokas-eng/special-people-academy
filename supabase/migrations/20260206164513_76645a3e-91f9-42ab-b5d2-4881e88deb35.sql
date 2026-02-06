-- Add calendar_last_error field for storing sync error messages
ALTER TABLE public.practical_sessions 
  ADD COLUMN IF NOT EXISTS calendar_last_error text;

-- Set default value for outlook_calendar_owner
ALTER TABLE public.practical_sessions 
  ALTER COLUMN outlook_calendar_owner SET DEFAULT 'training@specialpeople.org.uk';

-- Add comment for documentation
COMMENT ON COLUMN public.practical_sessions.calendar_last_error IS 'Last error message from calendar sync attempt';
COMMENT ON COLUMN public.practical_sessions.calendar_sync_status IS 'Status: ok, failed, not_configured';