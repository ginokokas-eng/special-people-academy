CREATE TABLE public.content_change_context (
  actor uuid PRIMARY KEY,
  material boolean NOT NULL DEFAULT false,
  note text,
  set_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.content_change_context TO authenticated;
GRANT ALL ON public.content_change_context TO service_role;

ALTER TABLE public.content_change_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can read their own change context"
ON public.content_change_context FOR SELECT TO authenticated
USING (actor = auth.uid());

CREATE OR REPLACE FUNCTION public.set_content_change_context(_material boolean, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  -- Same-transaction consumers read the settings directly.
  PERFORM set_config('app.change_material', CASE WHEN _material THEN 'true' ELSE 'false' END, true);
  PERFORM set_config('app.change_note', COALESCE(_note, ''), true);
  -- Cross-request saves (PostgREST gives each call its own transaction) read the
  -- author's most recent declaration instead.
  INSERT INTO public.content_change_context (actor, material, note, set_at)
  VALUES (auth.uid(), COALESCE(_material, false), _note, now())
  ON CONFLICT (actor) DO UPDATE
    SET material = EXCLUDED.material, note = EXCLUDED.note, set_at = EXCLUDED.set_at;
END;
$$;
REVOKE ALL ON FUNCTION public.set_content_change_context(boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_content_change_context(boolean, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.log_content_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_setting text := NULLIF(current_setting('app.change_material', true), '');
  v_material boolean;
  v_note text := NULLIF(current_setting('app.change_note', true), '');
  v_before jsonb;
  v_after jsonb;
  v_row_id uuid;
  v_lesson uuid;
  v_course uuid;
  v_b jsonb;
  v_a jsonb;
BEGIN
  IF v_setting IS NOT NULL THEN
    v_material := v_setting::boolean;
  ELSE
    SELECT ctx.material, COALESCE(v_note, ctx.note) INTO v_material, v_note
    FROM public.content_change_context ctx
    WHERE ctx.actor = auth.uid() AND ctx.set_at > now() - interval '10 minutes';
  END IF;
  v_material := COALESCE(v_material, false);

  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD); v_after := NULL; v_row_id := OLD.id;
  ELSIF TG_OP = 'INSERT' THEN
    v_before := NULL; v_after := to_jsonb(NEW); v_row_id := NEW.id;
  ELSE
    v_before := to_jsonb(OLD); v_after := to_jsonb(NEW); v_row_id := NEW.id;
    v_b := v_before - 'updated_at' - 'content_version';
    v_a := v_after  - 'updated_at' - 'content_version';
    IF v_b = v_a THEN
      RETURN NULL;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'courses' THEN
    v_course := v_row_id;
  ELSIF TG_TABLE_NAME = 'lessons' THEN
    v_lesson := v_row_id;
    SELECT course_id INTO v_course FROM public.lessons WHERE id = v_row_id;
    IF v_course IS NULL THEN
      v_course := COALESCE((v_before->>'course_id')::uuid, (v_after->>'course_id')::uuid);
    END IF;
  ELSIF TG_TABLE_NAME = 'lesson_blocks' THEN
    v_lesson := COALESCE((v_after->>'lesson_id')::uuid, (v_before->>'lesson_id')::uuid);
    SELECT le.course_id INTO v_course FROM public.lessons le WHERE le.id = v_lesson;
  END IF;

  INSERT INTO public.content_history
    (table_name, row_id, course_id, lesson_id, actor, action, material, note, before, after)
  VALUES
    (TG_TABLE_NAME, v_row_id, v_course, v_lesson, auth.uid(), lower(TG_OP), v_material, v_note, v_before, v_after);

  IF v_material THEN
    IF TG_TABLE_NAME = 'lesson_blocks' AND v_lesson IS NOT NULL THEN
      UPDATE public.lessons SET content_version = content_version + 1 WHERE id = v_lesson;
    ELSIF TG_TABLE_NAME = 'lessons' AND TG_OP = 'UPDATE' THEN
      IF (v_before->>'title') IS DISTINCT FROM (v_after->>'title')
         OR (v_before->>'lesson_type') IS DISTINCT FROM (v_after->>'lesson_type') THEN
        UPDATE public.lessons SET content_version = content_version + 1 WHERE id = v_lesson;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.log_content_change() FROM PUBLIC, anon, authenticated;