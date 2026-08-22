CREATE TABLE public.lesson_block_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES public.lesson_blocks(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'in_progress',
  is_correct boolean,
  attempt_count integer NOT NULL DEFAULT 0,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_block_responses_state_check CHECK (state IN ('in_progress','complete')),
  CONSTRAINT lesson_block_responses_user_block_key UNIQUE (user_id, block_id)
);

CREATE INDEX lesson_block_responses_user_lesson_idx ON public.lesson_block_responses(user_id, lesson_id);
CREATE INDEX lesson_block_responses_block_idx ON public.lesson_block_responses(block_id);

GRANT SELECT, INSERT, UPDATE ON public.lesson_block_responses TO authenticated;
GRANT ALL ON public.lesson_block_responses TO service_role;

ALTER TABLE public.lesson_block_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners view their own block responses"
ON public.lesson_block_responses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Learners insert their own block responses"
ON public.lesson_block_responses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Learners update their own block responses"
ON public.lesson_block_responses FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff view all block responses"
ON public.lesson_block_responses FOR SELECT TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE TRIGGER update_lesson_block_responses_updated_at
BEFORE UPDATE ON public.lesson_block_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();