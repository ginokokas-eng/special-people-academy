-- Allow anyone to read branding settings (public-facing data)
CREATE POLICY "Anyone can read branding settings"
ON public.platform_settings FOR SELECT
USING (section = 'branding');