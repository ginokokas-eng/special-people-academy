ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ariadne_user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_ariadne_user_id_key ON public.profiles (ariadne_user_id) WHERE ariadne_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sso_exchange_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL DEFAULT 'ariadne',
  ariadne_sub uuid,
  email text,
  user_id uuid,
  outcome text NOT NULL,
  detail text,
  provisioned boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sso_exchange_log TO service_role;
ALTER TABLE public.sso_exchange_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view SSO exchange log"
  ON public.sso_exchange_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS sso_exchange_log_sub_created_idx ON public.sso_exchange_log (ariadne_sub, created_at DESC);
CREATE INDEX IF NOT EXISTS sso_exchange_log_ip_created_idx ON public.sso_exchange_log (ip_address, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sso_replay_guard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ariadne_sub uuid NOT NULL,
  token_iat bigint NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ariadne_sub, token_iat)
);

GRANT ALL ON public.sso_replay_guard TO service_role;
ALTER TABLE public.sso_replay_guard ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS sso_replay_guard_expires_idx ON public.sso_replay_guard (expires_at);

INSERT INTO public.platform_settings (section, settings)
SELECT 'ariadne_sso', '{"enabled": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE section = 'ariadne_sso');