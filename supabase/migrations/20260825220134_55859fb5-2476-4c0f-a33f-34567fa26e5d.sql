ALTER TABLE public.sso_replay_guard ADD COLUMN IF NOT EXISTS nonce text;

ALTER TABLE public.sso_replay_guard DROP CONSTRAINT IF EXISTS sso_replay_guard_ariadne_sub_token_iat_key;

ALTER TABLE public.sso_replay_guard ALTER COLUMN token_iat DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sso_replay_guard_ariadne_sub_nonce_key
  ON public.sso_replay_guard (ariadne_sub, nonce)
  WHERE nonce IS NOT NULL;

CREATE INDEX IF NOT EXISTS sso_replay_guard_sub_created_idx
  ON public.sso_replay_guard (ariadne_sub, created_at DESC);