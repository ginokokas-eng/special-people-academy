-- Seed branding defaults into platform_settings
INSERT INTO public.platform_settings (section, settings)
VALUES ('branding', '{
  "platformName": "Special People Academy",
  "platformTagline": "",
  "logoMarkUrl": "",
  "logoFullUrl": "",
  "faviconUrl": "",
  "footerTextLeft": "© {year} Special People Academy. All rights reserved.",
  "footerTextRight": "Made with ❤️ for every learner",
  "socialLinks": {
    "linkedin": "https://linkedin.com/company/YOUR_LINKEDIN_URL",
    "facebook": "",
    "instagram": "",
    "youtube": "https://youtube.com/@YOUR_YOUTUBE_URL",
    "email": "academy@specialpeople.org.uk"
  }
}'::jsonb)
ON CONFLICT DO NOTHING;

-- Create branding-assets storage bucket for logo uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('branding-assets', 'branding-assets', true)
ON CONFLICT DO NOTHING;

-- Allow public read access
CREATE POLICY "Public can view branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding-assets');

-- Admins can upload branding assets
CREATE POLICY "Admins can upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branding-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can update branding assets
CREATE POLICY "Admins can update branding assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branding-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete branding assets
CREATE POLICY "Admins can delete branding assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'branding-assets' AND has_role(auth.uid(), 'admin'::app_role));