-- 1. Schedules -------------------------------------------------------------
CREATE TABLE public.refresher_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('7d','30d')),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','done','skipped')),
  questions jsonb NULL,
  materialised_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id, kind)
);

GRANT SELECT ON public.refresher_schedules TO authenticated;
GRANT ALL ON public.refresher_schedules TO service_role;

ALTER TABLE public.refresher_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners read own refresher schedules"
  ON public.refresher_schedules FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff read all refresher schedules"
  ON public.refresher_schedules FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));

CREATE INDEX refresher_schedules_due_idx
  ON public.refresher_schedules (user_id, status, due_at);

-- 3. Attempts --------------------------------------------------------------
CREATE TABLE public.refresher_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.refresher_schedules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL,
  correct_count int NOT NULL,
  total int NOT NULL,
  score int NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.refresher_attempts TO authenticated;
GRANT ALL ON public.refresher_attempts TO service_role;

ALTER TABLE public.refresher_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners read own refresher attempts"
  ON public.refresher_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff read all refresher attempts"
  ON public.refresher_attempts FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));

CREATE INDEX refresher_attempts_schedule_idx
  ON public.refresher_attempts (schedule_id);

-- 2. Trigger: every writer of completion gets schedules --------------------
CREATE OR REPLACE FUNCTION public.tg_schedule_refreshers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.refresher_schedules (user_id, course_id, kind, due_at)
  VALUES
    (NEW.user_id, NEW.course_id, '7d',  NEW.completed_at + interval '7 days'),
    (NEW.user_id, NEW.course_id, '30d', NEW.completed_at + interval '30 days')
  ON CONFLICT (user_id, course_id, kind) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_schedule_refreshers() FROM anon, authenticated;

CREATE TRIGGER enrollments_schedule_refreshers_upd
  AFTER UPDATE OF completed_at ON public.enrollments
  FOR EACH ROW
  WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION public.tg_schedule_refreshers();

CREATE TRIGGER enrollments_schedule_refreshers_ins
  AFTER INSERT ON public.enrollments
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION public.tg_schedule_refreshers();

-- No backfill: past completions deliberately get no refresher schedules.

-- 4a. Question draw --------------------------------------------------------
-- Priority: platform bank rows matching the course's linked standards, then
-- platform bank rows whose tags overlap the course's own tags, then the
-- course's own MCQ lesson blocks. Never fabricates a question.
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

  SELECT array_agg(DISTINCT lower(t)) INTO v_tags
  FROM (
    SELECT unnest(
      coalesce(c.programmes, '{}'::text[])
      || coalesce(c.training_ids, '{}'::text[])
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

REVOKE EXECUTE ON FUNCTION public.draw_refresher_questions(uuid, int) FROM anon, authenticated;

-- 4b. Due refreshers (lazy materialisation) --------------------------------
CREATE OR REPLACE FUNCTION public.get_due_refreshers(_user uuid DEFAULT auth.uid())
RETURNS TABLE(
  schedule_id uuid,
  course_id uuid,
  course_title text,
  kind text,
  due_at timestamptz,
  status text,
  question_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_row record;
  v_q jsonb;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;
  -- Service role (no auth.uid()) may ask for any learner; a signed-in user may
  -- only ask for themselves unless they are platform staff.
  IF v_caller IS NOT NULL AND v_caller <> _user AND NOT public.is_platform_staff(v_caller) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  UPDATE public.refresher_schedules s
     SET status = 'skipped'
   WHERE s.user_id = _user
     AND s.status IN ('pending','ready')
     AND s.due_at < now() - interval '21 days';

  FOR v_row IN
    SELECT s.* FROM public.refresher_schedules s
    WHERE s.user_id = _user AND s.status = 'pending' AND s.due_at <= now()
  LOOP
    v_q := public.draw_refresher_questions(v_row.course_id, 3);
    IF jsonb_array_length(v_q) > 0 THEN
      UPDATE public.refresher_schedules
         SET questions = v_q, status = 'ready', materialised_at = now()
       WHERE id = v_row.id;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT s.id, s.course_id, c.title, s.kind, s.due_at, s.status,
         coalesce(jsonb_array_length(s.questions), 0)::int
  FROM public.refresher_schedules s
  JOIN public.courses c ON c.id = s.course_id
  WHERE s.user_id = _user
    AND (
      (s.status IN ('ready','done') AND s.due_at >= now() - interval '45 days')
      OR (s.status = 'pending' AND s.due_at > now())
    )
  ORDER BY s.due_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_due_refreshers(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_due_refreshers(uuid) TO authenticated;

-- 5. Start / submit --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_refresher(_schedule_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.refresher_schedules;
  v_title text;
  v_item jsonb;
  v_opts jsonb;
  v_qs jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_row FROM public.refresher_schedules
  WHERE id = _schedule_id AND user_id = v_user;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'refresher_not_found';
  END IF;
  IF v_row.status <> 'ready' THEN
    RAISE EXCEPTION 'refresher_not_ready';
  END IF;

  SELECT title INTO v_title FROM public.courses WHERE id = v_row.course_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(v_row.questions, '[]'::jsonb)) LOOP
    SELECT coalesce(jsonb_agg(v_item->'options'->(o.value)::int ORDER BY o.ordinality), '[]'::jsonb)
      INTO v_opts
    FROM jsonb_array_elements_text(v_item->'option_order') WITH ORDINALITY AS o(value, ordinality);

    -- correct_index is deliberately NOT returned.
    v_qs := v_qs || jsonb_build_array(jsonb_build_object(
      'question_id', v_item->>'question_id',
      'stem', v_item->>'stem',
      'options', coalesce(v_opts, '[]'::jsonb)
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'schedule_id', v_row.id,
    'course_id', v_row.course_id,
    'course_title', v_title,
    'kind', v_row.kind,
    'due_at', v_row.due_at,
    'questions', v_qs
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_refresher(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_refresher(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_refresher(_schedule_id uuid, _answers jsonb)
RETURNS TABLE(score int, correct_count int, total int, results jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.refresher_schedules;
  v_item jsonb;
  v_qid text;
  v_order jsonb;
  v_answer int;
  v_stored int;
  v_correct_idx int;
  v_total int := 0;
  v_correct int := 0;
  v_stored_answers jsonb := '{}'::jsonb;
  v_results jsonb := '[]'::jsonb;
  v_score int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_row FROM public.refresher_schedules
  WHERE id = _schedule_id AND user_id = v_user;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'refresher_not_found';
  END IF;
  IF v_row.status = 'done' THEN
    RAISE EXCEPTION 'refresher_already_done';
  END IF;
  IF v_row.status <> 'ready' THEN
    RAISE EXCEPTION 'refresher_not_ready';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(v_row.questions, '[]'::jsonb)) LOOP
    v_total := v_total + 1;
    v_qid := v_item->>'question_id';
    v_order := v_item->'option_order';
    v_correct_idx := (v_item->>'correct_index')::int;
    v_answer := NULL;
    BEGIN
      v_answer := (_answers->>v_qid)::int;
    EXCEPTION WHEN others THEN
      v_answer := NULL;
    END;

    v_stored := NULL;
    IF v_answer IS NOT NULL AND v_answer >= 0 AND v_answer < jsonb_array_length(v_order) THEN
      v_stored := (v_order -> v_answer)::int;
      v_stored_answers := v_stored_answers || jsonb_build_object(v_qid, v_stored);
      IF v_stored = v_correct_idx THEN
        v_correct := v_correct + 1;
      END IF;
    END IF;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'question_id', v_qid,
      'stem', v_item->>'stem',
      'is_correct', coalesce(v_stored = v_correct_idx, false),
      'correct_label', v_item->'options'->v_correct_idx,
      'explanation', v_item->>'explanation'
    ));
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'refresher_has_no_questions';
  END IF;

  v_score := round(100.0 * v_correct / v_total);

  INSERT INTO public.refresher_attempts (schedule_id, user_id, answers, correct_count, total, score)
  VALUES (v_row.id, v_user, v_stored_answers, v_correct, v_total, v_score);

  UPDATE public.refresher_schedules SET status = 'done' WHERE id = v_row.id;

  RETURN QUERY SELECT v_score, v_correct, v_total, v_results;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_refresher(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_refresher(uuid, jsonb) TO authenticated;

-- 6. Retention reporting ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_course_retention(_course uuid)
RETURNS TABLE(kind text, scheduled int, ready int, done int, skipped int, avg_score numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_staff(auth.uid()) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
  SELECT k.kind,
         count(s.id)::int,
         count(s.id) FILTER (WHERE s.status = 'ready')::int,
         count(s.id) FILTER (WHERE s.status = 'done')::int,
         count(s.id) FILTER (WHERE s.status = 'skipped')::int,
         round(avg(a.score), 1)
  FROM (VALUES ('7d'), ('30d')) AS k(kind)
  LEFT JOIN public.refresher_schedules s
    ON s.kind = k.kind AND s.course_id = _course
  LEFT JOIN public.refresher_attempts a ON a.schedule_id = s.id
  GROUP BY k.kind
  ORDER BY k.kind DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_course_retention(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_course_retention(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_org_retention(_org uuid)
RETURNS TABLE(
  course_id uuid,
  course_title text,
  kind text,
  scheduled int,
  ready int,
  done int,
  skipped int,
  avg_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_platform_staff(auth.uid()) OR public.is_org_admin(auth.uid(), _org)) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
  SELECT s.course_id, c.title, s.kind,
         count(s.id)::int,
         count(s.id) FILTER (WHERE s.status = 'ready')::int,
         count(s.id) FILTER (WHERE s.status = 'done')::int,
         count(s.id) FILTER (WHERE s.status = 'skipped')::int,
         round(avg(a.score), 1)
  FROM public.refresher_schedules s
  JOIN public.courses c ON c.id = s.course_id
  JOIN public.organisation_members m ON m.user_id = s.user_id AND m.organisation_id = _org
  LEFT JOIN public.refresher_attempts a ON a.schedule_id = s.id
  GROUP BY s.course_id, c.title, s.kind
  ORDER BY c.title, s.kind DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_org_retention(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_org_retention(uuid) TO authenticated;