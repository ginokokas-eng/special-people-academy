
-- Lesson transcripts
CREATE TABLE public.lesson_transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  language_code text NOT NULL DEFAULT 'en',
  language_label text NOT NULL DEFAULT 'English',
  transcript_text text,
  vtt_url text,
  segments jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, language_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_transcripts TO authenticated;
GRANT ALL ON public.lesson_transcripts TO service_role;
ALTER TABLE public.lesson_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled learners can read transcripts"
ON public.lesson_transcripts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = lesson_transcripts.lesson_id
      AND public.is_enrolled(auth.uid(), l.course_id)
  )
  OR public.is_ops_training_admin(auth.uid())
);

CREATE POLICY "Trainers and admins can manage transcripts"
ON public.lesson_transcripts FOR ALL TO authenticated
USING (public.is_ops_training_admin(auth.uid()))
WITH CHECK (public.is_ops_training_admin(auth.uid()));

CREATE TRIGGER update_lesson_transcripts_updated_at
BEFORE UPDATE ON public.lesson_transcripts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lesson video sources
CREATE TABLE public.lesson_video_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  quality_label text NOT NULL DEFAULT 'Auto',
  source_url text NOT NULL,
  mime_type text,
  width integer,
  height integer,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_video_sources TO authenticated;
GRANT ALL ON public.lesson_video_sources TO service_role;
ALTER TABLE public.lesson_video_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled learners can read video sources"
ON public.lesson_video_sources FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = lesson_video_sources.lesson_id
      AND public.is_enrolled(auth.uid(), l.course_id)
  )
  OR public.is_ops_training_admin(auth.uid())
);

CREATE POLICY "Trainers and admins can manage video sources"
ON public.lesson_video_sources FOR ALL TO authenticated
USING (public.is_ops_training_admin(auth.uid()))
WITH CHECK (public.is_ops_training_admin(auth.uid()));

CREATE TRIGGER update_lesson_video_sources_updated_at
BEFORE UPDATE ON public.lesson_video_sources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lesson issue reports
CREATE TABLE public.lesson_issue_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  issue_type text NOT NULL DEFAULT 'other',
  message text,
  playback_time_seconds integer,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_issue_reports TO authenticated;
GRANT ALL ON public.lesson_issue_reports TO service_role;
ALTER TABLE public.lesson_issue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can create their own reports"
ON public.lesson_issue_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Learners can view their own reports"
ON public.lesson_issue_reports FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_ops_training_admin(auth.uid()));

CREATE POLICY "Admins can update reports"
ON public.lesson_issue_reports FOR UPDATE TO authenticated
USING (public.is_ops_training_admin(auth.uid()))
WITH CHECK (public.is_ops_training_admin(auth.uid()));
