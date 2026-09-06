CREATE OR REPLACE FUNCTION public.draw_refresher_questions(_course uuid, _limit int DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
  v_codes text[];
  v_tags text[];
  v_ids uuid[];
  v_bank record;
  v_blk record;
  v_labels jsonb;
  v_correct int;
BEGIN
  SELECT array_agg(DISTINCT s.code) INTO v_codes
  FROM public.standard_links sl
  JOIN public.standards s ON s.id = sl.standard_id
  WHERE sl.course_id = _course
     OR sl.lesson_id IN (SELECT l.id FROM public.lessons l WHERE l.course_id = _course);

  -- SQL sanity: courses.programmes is integer[] and courses.training_ids is text[],
  -- so every source is cast element-wise to text before concatenation.
  SELECT array_agg(DISTINCT lower(t)) INTO v_tags
  FROM (
    SELECT unnest(
      coalesce((SELECT array_agg(p::text) FROM unnest(c.programmes) AS p), '{}'::text[])
      || coalesce((SELECT array_agg(x::text) FROM unnest(c.training_ids) AS x), '{}'::text[])
      || ARRAY[coalesce(c.category, '')]
    ) AS t
    FROM public.courses c WHERE c.id = _course
  ) x
  WHERE t IS NOT NULL AND t <> '';

  IF v_codes IS NOT NULL THEN
    SELECT array_agg(id) INTO v_ids FROM (
      SELECT b.id FROM public.question_bank b
      WHERE b.org_id IS NULL AND b.standard_code = ANY(v_codes)
      ORDER BY random() LIMIT _limit
    ) t;
  END IF;

  IF coalesce(array_length(v_ids, 1), 0) = 0 AND v_tags IS NOT NULL THEN
    SELECT array_agg(id) INTO v_ids FROM (
      SELECT b.id FROM public.question_bank b
      WHERE b.org_id IS NULL AND b.tags && v_tags
      ORDER BY random() LIMIT _limit
    ) t;
  END IF;

  IF coalesce(array_length(v_ids, 1), 0) > 0 THEN
    FOR v_bank IN
      SELECT b.* FROM public.question_bank b WHERE b.id = ANY(v_ids)
    LOOP
      SELECT coalesce(jsonb_agg(o.value->>'label' ORDER BY o.ordinality), '[]'::jsonb)
        INTO v_labels
      FROM jsonb_array_elements(v_bank.options) WITH ORDINALITY AS o(value, ordinality);

      SELECT (o.ordinality - 1)::int INTO v_correct
      FROM jsonb_array_elements(v_bank.options) WITH ORDINALITY AS o(value, ordinality)
      WHERE o.value->>'id' = v_bank.correct_id;

      IF v_correct IS NULL OR jsonb_array_length(v_labels) < 2 THEN
        CONTINUE;
      END IF;

      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'question_id', 'bank:' || v_bank.id::text,
        'source', 'bank',
        'stem', v_bank.stem,
        'options', v_labels,
        'correct_index', v_correct,
        'explanation', v_bank.explanation,
        'option_order', (
          SELECT coalesce(jsonb_agg(idx ORDER BY random()), '[]'::jsonb)
          FROM generate_series(0, jsonb_array_length(v_labels) - 1) AS idx
        )
      ));
    END LOOP;
  END IF;

  IF jsonb_array_length(v_out) = 0 THEN
    FOR v_blk IN
      SELECT lb.id, lb.payload
      FROM public.lesson_blocks lb
      JOIN public.lessons l ON l.id = lb.lesson_id
      WHERE l.course_id = _course AND lb.block_type = 'mcq'
      ORDER BY random() LIMIT _limit
    LOOP
      SELECT coalesce(jsonb_agg(o.value->>'label' ORDER BY o.ordinality), '[]'::jsonb)
        INTO v_labels
      FROM jsonb_array_elements(coalesce(v_blk.payload->'options', '[]'::jsonb)) WITH ORDINALITY AS o(value, ordinality);

      SELECT (o.ordinality - 1)::int INTO v_correct
      FROM jsonb_array_elements(coalesce(v_blk.payload->'options', '[]'::jsonb)) WITH ORDINALITY AS o(value, ordinality)
      WHERE o.value->>'id' = (v_blk.payload->>'correct_id');

      IF v_correct IS NULL OR jsonb_array_length(v_labels) < 2 THEN
        CONTINUE;
      END IF;

      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'question_id', 'block:' || v_blk.id::text,
        'source', 'block',
        'stem', coalesce(v_blk.payload->>'question', ''),
        'options', v_labels,
        'correct_index', v_correct,
        'explanation', coalesce(v_blk.payload->>'explanation', NULL),
        'option_order', (
          SELECT coalesce(jsonb_agg(idx ORDER BY random()), '[]'::jsonb)
          FROM generate_series(0, jsonb_array_length(v_labels) - 1) AS idx
        )
      ));
    END LOOP;
  END IF;

  RETURN v_out;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.draw_refresher_questions(uuid, int) FROM PUBLIC, anon, authenticated;