UPDATE public.platform_settings
SET settings = jsonb_set(settings, '{platformName}', '"Special People Training"'),
    updated_at = now()
WHERE section = 'branding'
  AND settings->>'platformName' = 'Special People Academy';