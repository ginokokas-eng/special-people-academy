ALTER TABLE public.courses
  ADD COLUMN cloned_from_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX idx_courses_cloned_from_course_id
  ON public.courses (cloned_from_course_id);

COMMENT ON COLUMN public.courses.cloned_from_course_id IS
  'Course this one was copied from (public.clone_course). Set null if the source is deleted.';

CREATE OR REPLACE FUNCTION public.clone_course(
  _course_id uuid,
  _new_title text DEFAULT NULL,
  _copy_translations boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_new_course uuid := gen_random_uuid();
  v_src_title text;
  v_src_slug text;
  v_slug text;
  v_n int := 1;
  v_counts jsonb;
  v_media jsonb;
BEGIN
  IF NOT public.is_ops_training_admin(auth.uid()) THEN
    RAISE EXCEPTION 'training admin role required';
  END IF;

  SELECT title, slug INTO v_src_title, v_src_slug FROM public.courses WHERE id = _course_id;
  IF v_src_title IS NULL THEN
    RAISE EXCEPTION 'clone_course: course % not found', _course_id;
  END IF;

  -- Tags every copied row in content_history as a material change with this note.
  PERFORM public.set_content_change_context(true, 'Cloned from ' || v_src_title);

  -- Unique slug: <slug>-copy, then -copy-2, -copy-3, …
  IF NULLIF(v_src_slug, '') IS NOT NULL THEN
    v_slug := v_src_slug || '-copy';
    WHILE EXISTS (SELECT 1 FROM public.courses WHERE slug = v_slug) LOOP
      v_n := v_n + 1;
      v_slug := v_src_slug || '-copy-' || v_n;
    END LOOP;
  END IF;

  CREATE TEMP TABLE _clone_mod (old uuid PRIMARY KEY, new uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE _clone_les (old uuid PRIMARY KEY, new uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE _clone_blk (old uuid PRIMARY KEY, new uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE _clone_quiz (old uuid PRIMARY KEY, new uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE _clone_qq (old uuid PRIMARY KEY, new uuid NOT NULL) ON COMMIT DROP;

  ---------------------------------------------------------------- course
  INSERT INTO public.courses
  SELECT (jsonb_populate_record(
    NULL::public.courses,
    to_jsonb(c) || jsonb_build_object(
      'id', v_new_course,
      'title', COALESCE(NULLIF(btrim(_new_title), ''), 'Copy of ' || c.title),
      'slug', v_slug,
      'is_published', false,
      'status', 'draft',
      'is_featured', false,
      'featured_rank', NULL,
      'cloned_from_course_id', _course_id,
      'created_by', auth.uid(),
      'created_at', now(),
      'updated_at', now(),
      'last_updated', now()
    )
  )).*
  FROM public.courses c
  WHERE c.id = _course_id;

  ---------------------------------------------------------------- modules
  INSERT INTO _clone_mod (old, new)
  SELECT id, gen_random_uuid() FROM public.modules WHERE course_id = _course_id;

  INSERT INTO public.modules (id, course_id, title, description, order_index, created_at)
  SELECT mm.new, v_new_course, s.title, s.description, s.order_index, now()
  FROM public.modules s JOIN _clone_mod mm ON mm.old = s.id;

  ---------------------------------------------------------------- lessons
  INSERT INTO _clone_les (old, new)
  SELECT id, gen_random_uuid() FROM public.lessons WHERE course_id = _course_id;

  INSERT INTO public.lessons
  SELECT (jsonb_populate_record(
    NULL::public.lessons,
    to_jsonb(s) || jsonb_build_object(
      'id', lm.new,
      'course_id', v_new_course,
      'module_id', (SELECT mm.new FROM _clone_mod mm WHERE mm.old = s.module_id),
      'created_at', now(),
      'updated_at', now(),
      'content_version', 1
    )
  )).*
  FROM public.lessons s JOIN _clone_les lm ON lm.old = s.id;

  ---------------------------------------------------------------- blocks
  INSERT INTO _clone_blk (old, new)
  SELECT b.id, gen_random_uuid()
  FROM public.lesson_blocks b JOIN _clone_les lm ON lm.old = b.lesson_id;

  INSERT INTO public.lesson_blocks
    (id, lesson_id, order_index, block_type, payload, is_graded,
     contributes_to_completion, created_at, updated_at)
  SELECT bm.new, lm.new, b.order_index, b.block_type, b.payload, b.is_graded,
         b.contributes_to_completion, now(), now()
  FROM public.lesson_blocks b
  JOIN _clone_blk bm ON bm.old = b.id
  JOIN _clone_les lm ON lm.old = b.lesson_id;

  -- Conditional visibility points at another block in the same lesson: re-point it
  -- at the copy, and drop the rule when the referenced block was not copied.
  UPDATE public.lesson_blocks nb
  SET payload = CASE
        WHEN tgt.new IS NOT NULL
          THEN jsonb_set(nb.payload, '{visibility,block_id}', to_jsonb(tgt.new::text))
        ELSE nb.payload - 'visibility'
      END
  FROM _clone_blk bm
  JOIN public.lesson_blocks ob ON ob.id = bm.old
  LEFT JOIN _clone_blk tgt ON tgt.old::text = ob.payload -> 'visibility' ->> 'block_id'
  WHERE nb.id = bm.new
    AND ob.payload -> 'visibility' ->> 'block_id' IS NOT NULL;

  ---------------------------------------------------------------- quizzes
  INSERT INTO _clone_quiz (old, new)
  SELECT q.id, gen_random_uuid()
  FROM public.quizzes q JOIN _clone_les lm ON lm.old = q.lesson_id;

  INSERT INTO public.quizzes (id, lesson_id, title, passing_score, attempts_allowed, created_at)
  SELECT qm.new, lm.new, q.title, q.passing_score, q.attempts_allowed, now()
  FROM public.quizzes q
  JOIN _clone_quiz qm ON qm.old = q.id
  JOIN _clone_les lm ON lm.old = q.lesson_id;

  INSERT INTO _clone_qq (old, new)
  SELECT qq.id, gen_random_uuid()
  FROM public.quiz_questions qq JOIN _clone_quiz qm ON qm.old = qq.quiz_id;

  INSERT INTO public.quiz_questions
    (id, quiz_id, question, options, correct_answer, order_index, question_type,
     explanation, question_payload, created_at)
  SELECT qqm.new, qm.new, qq.question, qq.options, qq.correct_answer, qq.order_index,
         qq.question_type, qq.explanation, qq.question_payload, now()
  FROM public.quiz_questions qq
  JOIN _clone_qq qqm ON qqm.old = qq.id
  JOIN _clone_quiz qm ON qm.old = qq.quiz_id;

  ---------------------------------------------------------------- lesson extras
  INSERT INTO public.lesson_transcripts
    (id, lesson_id, language_code, language_label, transcript_text, vtt_url, segments,
     chapters, created_at, updated_at)
  SELECT gen_random_uuid(), lm.new, t.language_code, t.language_label, t.transcript_text,
         t.vtt_url, t.segments, t.chapters, now(), now()
  FROM public.lesson_transcripts t JOIN _clone_les lm ON lm.old = t.lesson_id;

  INSERT INTO public.lesson_video_sources
    (id, lesson_id, quality_label, source_url, mime_type, width, height, is_default,
     created_at, updated_at)
  SELECT gen_random_uuid(), lm.new, v.quality_label, v.source_url, v.mime_type, v.width,
         v.height, v.is_default, now(), now()
  FROM public.lesson_video_sources v JOIN _clone_les lm ON lm.old = v.lesson_id;

  INSERT INTO public.lesson_steps
    (id, lesson_id, order_index, step_title, instruction, safety_note, what_to_record, created_at)
  SELECT gen_random_uuid(), lm.new, s.order_index, s.step_title, s.instruction,
         s.safety_note, s.what_to_record, now()
  FROM public.lesson_steps s JOIN _clone_les lm ON lm.old = s.lesson_id;

  INSERT INTO public.lesson_resources (id, lesson_id, file_url, file_type, title, created_at)
  SELECT gen_random_uuid(), lm.new, r.file_url, r.file_type, r.title, now()
  FROM public.lesson_resources r JOIN _clone_les lm ON lm.old = r.lesson_id;

  IF _copy_translations THEN
    INSERT INTO public.lesson_translations
      (id, lesson_id, lang, block_id, source_hash, overrides, status, model, created_by,
       reviewed_by, reviewed_at, created_at, updated_at)
    SELECT gen_random_uuid(), lm.new, tr.lang, bm.new, tr.source_hash, tr.overrides,
           'draft', tr.model, auth.uid(), NULL, NULL, now(), now()
    FROM public.lesson_translations tr
    JOIN _clone_les lm ON lm.old = tr.lesson_id
    JOIN _clone_blk bm ON bm.old = tr.block_id;
  END IF;

  ---------------------------------------------------------------- course extras
  INSERT INTO public.course_resources
    (id, course_id, lesson_id, title, resource_type, url, description, order_index, created_at)
  SELECT gen_random_uuid(), v_new_course,
         (SELECT lm.new FROM _clone_les lm WHERE lm.old = r.lesson_id),
         r.title, r.resource_type, r.url, r.description, r.order_index, now()
  FROM public.course_resources r WHERE r.course_id = _course_id;

  INSERT INTO public.standard_links (id, standard_id, course_id, lesson_id, bank_id, created_by, created_at)
  SELECT gen_random_uuid(), sl.standard_id,
         CASE WHEN sl.course_id IS NOT NULL THEN v_new_course ELSE NULL END,
         (SELECT lm.new FROM _clone_les lm WHERE lm.old = sl.lesson_id),
         sl.bank_id, auth.uid(), now()
  FROM public.standard_links sl
  WHERE sl.course_id = _course_id
     OR sl.lesson_id IN (SELECT old FROM _clone_les);

  INSERT INTO public.course_offerings
    (id, course_id, offering_type, base_price_gbp, max_participants, active, available_to,
     created_at, updated_at)
  SELECT gen_random_uuid(), v_new_course, o.offering_type, o.base_price_gbp,
         o.max_participants, o.active, o.available_to, now(), now()
  FROM public.course_offerings o WHERE o.course_id = _course_id;

  INSERT INTO public.course_trainers (id, course_id, staff_id, can_sign_off, created_at)
  SELECT gen_random_uuid(), v_new_course, t.staff_id, t.can_sign_off, now()
  FROM public.course_trainers t WHERE t.course_id = _course_id;

  -- Bank provenance follows the copies so the bank still lists every use.
  INSERT INTO public.question_bank_usages
    (id, bank_id, bank_version, lesson_block_id, quiz_question_id, created_at)
  SELECT gen_random_uuid(), u.bank_id, u.bank_version,
         (SELECT bm.new FROM _clone_blk bm WHERE bm.old = u.lesson_block_id),
         (SELECT qqm.new FROM _clone_qq qqm WHERE qqm.old = u.quiz_question_id),
         now()
  FROM public.question_bank_usages u
  WHERE u.lesson_block_id IN (SELECT old FROM _clone_blk)
     OR u.quiz_question_id IN (SELECT old FROM _clone_qq);

  ---------------------------------------------------------------- result
  SELECT jsonb_build_object(
    'modules', (SELECT count(*) FROM _clone_mod),
    'lessons', (SELECT count(*) FROM _clone_les),
    'blocks', (SELECT count(*) FROM _clone_blk),
    'quizzes', (SELECT count(*) FROM _clone_quiz),
    'quiz_questions', (SELECT count(*) FROM _clone_qq),
    'standard_links', (SELECT count(*) FROM public.standard_links
                        WHERE course_id = v_new_course
                           OR lesson_id IN (SELECT new FROM _clone_les)),
    'translations', (SELECT count(*) FROM public.lesson_translations
                      WHERE lesson_id IN (SELECT new FROM _clone_les))
  ) INTO v_counts;

  -- Media is NOT copied in this step: paths still point at the source course's
  -- folder. Every one of them is listed so the follow-up copy step can move them.
  WITH block_media AS (
    SELECT bm.new AS block_id, bm.old AS old_block_id, b.lesson_id AS old_lesson_id,
           lm.new AS new_lesson_id,
           COALESCE(b.payload ->> 'path',
                    b.payload -> 'media' ->> 'path',
                    b.payload -> 'image' ->> 'path') AS path
    FROM public.lesson_blocks b
    JOIN _clone_blk bm ON bm.old = b.id
    JOIN _clone_les lm ON lm.old = b.lesson_id
  ), video_media AS (
    SELECT NULL::uuid AS block_id, NULL::uuid AS old_block_id, v.lesson_id AS old_lesson_id,
           lm.new AS new_lesson_id, v.source_url AS path
    FROM public.lesson_video_sources v
    JOIN _clone_les lm ON lm.old = v.lesson_id
    WHERE v.source_url NOT LIKE 'http%'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'block_id', block_id,
           'old_lesson_id', old_lesson_id,
           'new_lesson_id', new_lesson_id,
           'path', path
         )), '[]'::jsonb)
  INTO v_media
  FROM (SELECT * FROM block_media WHERE path IS NOT NULL
        UNION ALL
        SELECT * FROM video_media WHERE path IS NOT NULL) m;

  RETURN jsonb_build_object('course_id', v_new_course, 'counts', v_counts, 'media', v_media);
END;
$function$;

REVOKE ALL ON FUNCTION public.clone_course(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clone_course(uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.clone_course(uuid, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.clone_course(uuid, text, boolean) IS
  'Staff-only deep copy of a course into a fresh draft. Copies content only (no learner data) and does not copy storage objects: the returned media list names every path that still points at the source course.';