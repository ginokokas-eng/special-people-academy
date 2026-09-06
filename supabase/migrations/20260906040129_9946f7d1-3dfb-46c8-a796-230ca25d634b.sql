CREATE TABLE public.lesson_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  lang text NOT NULL,
  block_id uuid NOT NULL REFERENCES public.lesson_blocks(id) ON DELETE CASCADE,
  source_hash text NOT NULL,
  overrides jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed')),
  model text,
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, lang, block_id)
);

CREATE INDEX lesson_translations_lesson_lang_idx ON public.lesson_translations (lesson_id, lang);

GRANT SELECT ON public.lesson_translations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lesson_translations TO authenticated;
GRANT ALL ON public.lesson_translations TO service_role;

ALTER TABLE public.lesson_translations ENABLE ROW LEVEL SECURITY;

-- Learners: reviewed rows only, and only for a course they can access.
CREATE POLICY "Learners read reviewed translations"
ON public.lesson_translations FOR SELECT TO authenticated
USING (
  status = 'reviewed'
  AND EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = lesson_translations.lesson_id
      AND public.can_access_course(auth.uid(), m.course_id)
  )
);

CREATE POLICY "Staff manage translations"
ON public.lesson_translations FOR ALL TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'))
WITH CHECK (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE TRIGGER lesson_translations_updated_at
BEFORE UPDATE ON public.lesson_translations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS available_langs text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_lang text;

-- A language is "available" only when EVERY block in the lesson is reviewed.
CREATE OR REPLACE FUNCTION public.refresh_lesson_available_langs(_lesson uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _block_count integer;
BEGIN
  SELECT count(*) INTO _block_count FROM public.lesson_blocks WHERE lesson_id = _lesson;

  UPDATE public.lessons
  SET available_langs = COALESCE((
    SELECT array_agg(lang ORDER BY lang)
    FROM (
      SELECT t.lang
      FROM public.lesson_translations t
      WHERE t.lesson_id = _lesson AND t.status = 'reviewed'
      GROUP BY t.lang
      HAVING _block_count > 0 AND count(DISTINCT t.block_id) = _block_count
    ) complete
  ), '{}')
  WHERE id = _lesson;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_refresh_available_langs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_lesson_available_langs(OLD.lesson_id);
    RETURN OLD;
  END IF;
  PERFORM public.refresh_lesson_available_langs(NEW.lesson_id);
  IF TG_OP = 'UPDATE' AND OLD.lesson_id <> NEW.lesson_id THEN
    PERFORM public.refresh_lesson_available_langs(OLD.lesson_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_translations_available_langs
AFTER INSERT OR UPDATE OR DELETE ON public.lesson_translations
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_available_langs();

-- Adding or removing a block changes the "all blocks reviewed" answer too.
CREATE OR REPLACE FUNCTION public.tg_blocks_refresh_available_langs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_lesson_available_langs(OLD.lesson_id);
    RETURN OLD;
  END IF;
  PERFORM public.refresh_lesson_available_langs(NEW.lesson_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_blocks_available_langs
AFTER INSERT OR DELETE ON public.lesson_blocks
FOR EACH ROW EXECUTE FUNCTION public.tg_blocks_refresh_available_langs();