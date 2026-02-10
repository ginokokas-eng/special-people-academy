
-- SCORM version enum
CREATE TYPE public.scorm_version AS ENUM ('1.2', '2004');

-- SCORM registration status enum
CREATE TYPE public.scorm_status AS ENUM ('not_attempted', 'in_progress', 'completed', 'passed', 'failed');

-- 1) scorm_packages
CREATE TABLE public.scorm_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  version public.scorm_version NOT NULL DEFAULT '1.2',
  storage_zip_path TEXT NOT NULL,
  storage_extracted_path TEXT NOT NULL,
  launch_path TEXT NOT NULL,
  manifest_json JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scorm_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scorm_packages"
  ON public.scorm_packages FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view scorm_packages"
  ON public.scorm_packages FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2) scorm_registrations
CREATE TABLE public.scorm_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scorm_package_id UUID NOT NULL REFERENCES public.scorm_packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id),
  lesson_id UUID REFERENCES public.lessons(id),
  status public.scorm_status NOT NULL DEFAULT 'not_attempted',
  score NUMERIC,
  total_time_seconds INTEGER,
  lesson_location TEXT,
  suspend_data TEXT,
  last_commit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scorm_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations"
  ON public.scorm_registrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own registrations"
  ON public.scorm_registrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all registrations"
  ON public.scorm_registrations FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "System can insert registrations"
  ON public.scorm_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_scorm_registrations_updated_at
  BEFORE UPDATE ON public.scorm_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3) scorm_runtime_kv (audit/debug)
CREATE TABLE public.scorm_runtime_kv (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID NOT NULL REFERENCES public.scorm_registrations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scorm_runtime_kv ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own kv"
  ON public.scorm_runtime_kv FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.scorm_registrations r
      WHERE r.id = registration_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all kv"
  ON public.scorm_runtime_kv FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- Add scorm_package_id to lessons table
ALTER TABLE public.lessons ADD COLUMN scorm_package_id UUID REFERENCES public.scorm_packages(id);

-- Storage buckets for SCORM
INSERT INTO storage.buckets (id, name, public) VALUES ('scorm', 'scorm', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('scorm-extracted', 'scorm-extracted', true);

-- Storage policies for scorm bucket (admin upload)
CREATE POLICY "Admins can upload SCORM packages"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'scorm' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can read SCORM packages"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'scorm' AND public.is_super_admin(auth.uid()));

-- Storage policies for scorm-extracted bucket (public read for iframe)
CREATE POLICY "Anyone can read extracted SCORM content"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'scorm-extracted');

CREATE POLICY "Admins can upload extracted SCORM content"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'scorm-extracted' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete extracted SCORM content"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'scorm-extracted' AND public.is_super_admin(auth.uid()));
