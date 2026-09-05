CREATE TABLE public.ai_authoring_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid,
  mode text NOT NULL,
  input_chars int,
  output_chars int,
  model text,
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_authoring_runs TO authenticated;
GRANT ALL ON public.ai_authoring_runs TO service_role;

ALTER TABLE public.ai_authoring_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Training staff can read AI authoring runs"
ON public.ai_authoring_runs
FOR SELECT
TO authenticated
USING (public.is_ops_training_admin(auth.uid()));

CREATE INDEX ai_authoring_runs_user_created_idx
ON public.ai_authoring_runs (user_id, created_at DESC);