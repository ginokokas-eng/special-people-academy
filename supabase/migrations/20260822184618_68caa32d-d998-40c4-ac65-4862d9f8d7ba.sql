CREATE TABLE public.lesson_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  block_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_graded boolean NOT NULL DEFAULT false,
  contributes_to_completion boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lesson_blocks_lesson_order_idx ON public.lesson_blocks(lesson_id, order_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_blocks TO authenticated;
GRANT ALL ON public.lesson_blocks TO service_role;

ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled learners can view lesson blocks"
ON public.lesson_blocks FOR SELECT TO authenticated
USING (
  public.is_ops_training_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = lesson_blocks.lesson_id
      AND public.is_enrolled(auth.uid(), l.course_id)
  )
);

CREATE POLICY "Training admins can insert lesson blocks"
ON public.lesson_blocks FOR INSERT TO authenticated
WITH CHECK (public.is_ops_training_admin(auth.uid()));

CREATE POLICY "Training admins can update lesson blocks"
ON public.lesson_blocks FOR UPDATE TO authenticated
USING (public.is_ops_training_admin(auth.uid()))
WITH CHECK (public.is_ops_training_admin(auth.uid()));

CREATE POLICY "Training admins can delete lesson blocks"
ON public.lesson_blocks FOR DELETE TO authenticated
USING (public.is_ops_training_admin(auth.uid()));

CREATE TRIGGER update_lesson_blocks_updated_at
BEFORE UPDATE ON public.lesson_blocks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();