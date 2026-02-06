-- Add Outlook calendar fields to practical_sessions (replacing Google fields)
ALTER TABLE public.practical_sessions 
  ADD COLUMN IF NOT EXISTS outlook_event_id text,
  ADD COLUMN IF NOT EXISTS outlook_calendar_owner text;

-- Remove Google-specific columns if they exist
ALTER TABLE public.practical_sessions 
  DROP COLUMN IF EXISTS google_event_id,
  DROP COLUMN IF EXISTS google_calendar_id;

-- Add comment for documentation
COMMENT ON COLUMN public.practical_sessions.outlook_event_id IS 'Microsoft Graph event ID for the synced Outlook calendar event';
COMMENT ON COLUMN public.practical_sessions.outlook_calendar_owner IS 'Email of the calendar owner account (e.g., training@specialpeople.org.uk)';
COMMENT ON COLUMN public.practical_sessions.calendar_sync_status IS 'Status: synced, failed, pending, not_synced';