
-- Seed platform_settings with general section
INSERT INTO public.platform_settings (section, settings)
VALUES ('general', '{
  "organisationName": "Special People Academy",
  "supportEmail": "training@specialpeople.org.uk",
  "supportPhone": "",
  "address": "",
  "timezone": "Europe/London",
  "currency": "GBP",
  "defaultCertificateExpiryMonthsAwareness": 24,
  "defaultCertificateExpiryMonthsCompetency": 12,
  "defaultQuizPassMark": 80,
  "defaultQuizAttempts": 2,
  "learnerCoursesNavDestination": "my-courses",
  "enableCareerApplications": false
}'::jsonb)
ON CONFLICT DO NOTHING;

-- Allow anyone to read general settings (needed for nav behaviour, feature toggles)
CREATE POLICY "Anyone can read general settings"
ON public.platform_settings FOR SELECT
USING (section = 'general');
