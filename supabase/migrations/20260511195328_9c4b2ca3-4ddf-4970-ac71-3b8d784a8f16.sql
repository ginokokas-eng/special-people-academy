
-- Add Fountain identifiers to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS source_system text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS fountain_applicant_id text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_fountain_applicant_id_key
  ON public.profiles(fountain_applicant_id)
  WHERE fountain_applicant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_source_system_idx
  ON public.profiles(source_system);

-- Sync log table
CREATE TABLE IF NOT EXISTS public.user_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  external_id text,
  email text,
  user_id uuid,
  status text NOT NULL, -- created | updated | skipped | failed
  message text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_sync_log_created_at_idx
  ON public.user_sync_log(created_at DESC);

CREATE INDEX IF NOT EXISTS user_sync_log_external_id_idx
  ON public.user_sync_log(source_system, external_id);

ALTER TABLE public.user_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync log"
  ON public.user_sync_log
  FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR is_ops_training_admin(auth.uid()));

CREATE POLICY "Admins can insert sync log"
  ON public.user_sync_log
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR is_ops_training_admin(auth.uid()));
