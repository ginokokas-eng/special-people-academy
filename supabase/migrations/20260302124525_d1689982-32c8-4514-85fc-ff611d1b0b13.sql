
-- Platform settings table (key-value per section)
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(section)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Settings audit log
CREATE TABLE public.settings_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  previous_value jsonb,
  new_value jsonb,
  change_summary text
);

ALTER TABLE public.settings_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.settings_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit log"
  ON public.settings_audit_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default security settings
INSERT INTO public.platform_settings (section, settings) VALUES (
  'security',
  '{
    "enableEmailPassword": true,
    "enableMicrosoftLogin": false,
    "enableGoogleLogin": true,
    "restrictStaffAccountsToDomains": true,
    "staffAllowedDomains": ["specialpeople.org.uk"],
    "sessionTimeoutHours": 8,
    "logoutRedirectUrl": "/",
    "loginRedirectUrl": "/dashboard"
  }'::jsonb
);
