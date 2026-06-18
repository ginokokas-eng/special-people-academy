-- Helper: enrollment check (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_enrolled(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = _user_id AND course_id = _course_id
  )
$$;

-- 1. Allow resources to be lesson-level (nullable lesson_id)
ALTER TABLE public.course_resources
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE;

-- 2. Private learner notes
CREATE TABLE public.learner_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  timestamp_seconds integer,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_notes TO authenticated;
GRANT ALL ON public.learner_notes TO service_role;
ALTER TABLE public.learner_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notes"
  ON public.learner_notes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_learner_notes_updated_at
  BEFORE UPDATE ON public.learner_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Course Q&A questions
CREATE TABLE public.course_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_questions TO authenticated;
GRANT ALL ON public.course_questions TO service_role;
ALTER TABLE public.course_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled learners and staff can view questions"
  ON public.course_questions FOR SELECT
  TO authenticated
  USING (public.is_enrolled(auth.uid(), course_id) OR public.is_ops_training_admin(auth.uid()));

CREATE POLICY "Enrolled learners can ask questions"
  ON public.course_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND (public.is_enrolled(auth.uid(), course_id) OR public.is_ops_training_admin(auth.uid())));

CREATE POLICY "Owners and staff can update questions"
  ON public.course_questions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_ops_training_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_ops_training_admin(auth.uid()));

CREATE POLICY "Owners and staff can delete questions"
  ON public.course_questions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_ops_training_admin(auth.uid()));

CREATE TRIGGER update_course_questions_updated_at
  BEFORE UPDATE ON public.course_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Course Q&A replies
CREATE TABLE public.course_question_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.course_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_instructor_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_question_replies TO authenticated;
GRANT ALL ON public.course_question_replies TO service_role;
ALTER TABLE public.course_question_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled learners and staff can view replies"
  ON public.course_question_replies FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_questions q
    WHERE q.id = question_id
      AND (public.is_enrolled(auth.uid(), q.course_id) OR public.is_ops_training_admin(auth.uid()))
  ));

CREATE POLICY "Enrolled learners can reply"
  ON public.course_question_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.course_questions q
    WHERE q.id = question_id
      AND (public.is_enrolled(auth.uid(), q.course_id) OR public.is_ops_training_admin(auth.uid()))
  ));

CREATE POLICY "Owners and staff can update replies"
  ON public.course_question_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_ops_training_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_ops_training_admin(auth.uid()));

CREATE POLICY "Owners and staff can delete replies"
  ON public.course_question_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_ops_training_admin(auth.uid()));