-- ============================================================
-- Phase A: server-side quiz grading
-- ============================================================

-- 1) Attempt sessions -----------------------------------------------------
CREATE TABLE public.quiz_attempt_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  drawn jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  submitted_attempt_id uuid NULL REFERENCES public.quiz_attempts(id) ON DELETE SET NULL
);

GRANT SELECT ON public.quiz_attempt_sessions TO authenticated;
GRANT ALL ON public.quiz_attempt_sessions TO service_role;

ALTER TABLE public.quiz_attempt_sessions ENABLE ROW LEVEL SECURITY;

-- Read-only for the owning learner. No INSERT/UPDATE/DELETE policies:
-- every write happens inside the SECURITY DEFINER functions below.
CREATE POLICY "Learners read own attempt sessions"
  ON public.quiz_attempt_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_quiz_attempt_sessions_user_quiz
  ON public.quiz_attempt_sessions (user_id, quiz_id);

-- One live (unsubmitted) session per learner per quiz.
CREATE UNIQUE INDEX idx_quiz_attempt_sessions_one_live
  ON public.quiz_attempt_sessions (user_id, quiz_id)
  WHERE submitted_attempt_id IS NULL;

-- 2) Unlimited-attempts rule, single source of truth ---------------------
-- NULL, <= 0, or >= 99 all mean "unlimited". The 99 sentinel used to live in
-- the client only, so the trigger enforced it literally; now they agree.
CREATE OR REPLACE FUNCTION public.quiz_attempts_unlimited(_allowed integer)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _allowed IS NULL OR _allowed <= 0 OR _allowed >= 99
$$;

REVOKE ALL ON FUNCTION public.quiz_attempts_unlimited(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quiz_attempts_unlimited(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_quiz_attempts_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed integer;
  v_count integer;
BEGIN
  SELECT attempts_allowed INTO v_allowed
  FROM public.quizzes
  WHERE id = NEW.quiz_id;

  IF public.quiz_attempts_unlimited(v_allowed) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.quiz_attempts
  WHERE quiz_id = NEW.quiz_id
    AND user_id = NEW.user_id;

  IF v_count >= v_allowed THEN
    RAISE EXCEPTION 'Attempt limit reached for this quiz (% of % allowed)', v_count, v_allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- 3) start_quiz_attempt --------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_quiz_attempt(_quiz_id uuid)
RETURNS TABLE(
  session_id uuid,
  attempts_used int,
  attempts_allowed int,
  unlimited boolean,
  passing_score int,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_course uuid;
  v_allowed int;
  v_pass int;
  v_unlimited boolean;
  v_used int;
  v_session public.quiz_attempt_sessions;
  v_drawn jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT l.course_id, q.attempts_allowed, coalesce(q.passing_score, 0)
    INTO v_course, v_allowed, v_pass
  FROM public.quizzes q
  JOIN public.lessons l ON l.id = q.lesson_id
  WHERE q.id = _quiz_id;

  IF v_course IS NULL THEN
    RAISE EXCEPTION 'quiz_not_found';
  END IF;

  IF NOT public.can_access_course(v_user, v_course)
     AND NOT public.is_enrolled(v_user, v_course)
     AND NOT public.is_platform_staff(v_user) THEN
    RAISE EXCEPTION 'no_course_access';
  END IF;

  v_unlimited := public.quiz_attempts_unlimited(v_allowed);

  SELECT count(*) INTO v_used
  FROM public.quiz_attempts
  WHERE quiz_id = _quiz_id AND user_id = v_user;

  IF NOT v_unlimited AND v_used >= v_allowed THEN
    RAISE EXCEPTION 'attempt_limit_reached';
  END IF;

  -- Reuse an unexpired live session (page reload keeps the same draw).
  SELECT * INTO v_session
  FROM public.quiz_attempt_sessions s
  WHERE s.user_id = v_user
    AND s.quiz_id = _quiz_id
    AND s.submitted_attempt_id IS NULL
  LIMIT 1;

  IF v_session.id IS NOT NULL AND v_session.expires_at > now() THEN
    RETURN QUERY SELECT v_session.id, v_used,
      CASE WHEN v_unlimited THEN NULL::int ELSE v_allowed END,
      v_unlimited, v_pass, v_session.expires_at;
    RETURN;
  END IF;

  IF v_session.id IS NOT NULL THEN
    DELETE FROM public.quiz_attempt_sessions WHERE id = v_session.id;
  END IF;

  -- v1: draw every question in authored order, permute the options.
  SELECT coalesce(jsonb_agg(row ORDER BY row->>'order_index'), '[]'::jsonb)
    INTO v_drawn
  FROM (
    SELECT jsonb_build_object(
      'question_id', qq.id,
      'order_index', lpad(qq.order_index::text, 6, '0'),
      'option_order', (
        SELECT coalesce(jsonb_agg(idx ORDER BY random()), '[]'::jsonb)
        FROM generate_series(0, jsonb_array_length(qq.options) - 1) AS idx
      )
    ) AS row
    FROM public.quiz_questions qq
    WHERE qq.quiz_id = _quiz_id
  ) src;

  IF jsonb_array_length(v_drawn) = 0 THEN
    RAISE EXCEPTION 'quiz_has_no_questions';
  END IF;

  INSERT INTO public.quiz_attempt_sessions (quiz_id, user_id, drawn, expires_at)
  VALUES (_quiz_id, v_user, v_drawn, now() + interval '4 hours')
  RETURNING * INTO v_session;

  RETURN QUERY SELECT v_session.id, v_used,
    CASE WHEN v_unlimited THEN NULL::int ELSE v_allowed END,
    v_unlimited, v_pass, v_session.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.start_quiz_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_quiz_attempt(uuid) TO authenticated;

-- 4) get_quiz_for_attempt ------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_quiz_for_attempt(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session public.quiz_attempt_sessions;
  v_quiz public.quizzes;
  v_questions jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_session FROM public.quiz_attempt_sessions
  WHERE id = _session_id AND user_id = v_user;
  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_session.quiz_id;

  SELECT coalesce(jsonb_agg(q ORDER BY ord), '[]'::jsonb) INTO v_questions
  FROM (
    SELECT d.ord,
      jsonb_build_object(
        'question_id', qq.id,
        'question_text', qq.question,
        'explanation', NULL,
        'options', (
          SELECT coalesce(jsonb_agg(qq.options -> (o.value)::int ORDER BY o.ordinality), '[]'::jsonb)
          FROM jsonb_array_elements_text(d.item->'option_order')
               WITH ORDINALITY AS o(value, ordinality)
        )
      ) AS q
    FROM jsonb_array_elements(v_session.drawn) WITH ORDINALITY AS d(item, ord)
    JOIN public.quiz_questions qq ON qq.id = (d.item->>'question_id')::uuid
  ) src;

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'quiz_id', v_quiz.id,
    'title', v_quiz.title,
    'passing_score', coalesce(v_quiz.passing_score, 0),
    'submitted', v_session.submitted_attempt_id IS NOT NULL,
    'expires_at', v_session.expires_at,
    'questions', v_questions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_for_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_for_attempt(uuid) TO authenticated;

-- 5) check_quiz_answer ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_quiz_answer(
  _session_id uuid, _question_id uuid, _selected int
)
RETURNS TABLE(is_correct boolean, correct_displayed_index int, explanation text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session public.quiz_attempt_sessions;
  v_order jsonb;
  v_stored_selected int;
  v_correct int;
  v_correct_displayed int;
  v_explanation text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_session FROM public.quiz_attempt_sessions
  WHERE id = _session_id AND user_id = v_user;
  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_session.submitted_attempt_id IS NOT NULL THEN
    RAISE EXCEPTION 'session_already_submitted';
  END IF;

  SELECT d.item->'option_order' INTO v_order
  FROM jsonb_array_elements(v_session.drawn) AS d(item)
  WHERE (d.item->>'question_id')::uuid = _question_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'question_not_in_session';
  END IF;

  IF _selected IS NULL OR _selected < 0 OR _selected >= jsonb_array_length(v_order) THEN
    RAISE EXCEPTION 'invalid_option_index';
  END IF;

  v_stored_selected := (v_order -> _selected)::int;

  SELECT qq.correct_answer, qq.explanation INTO v_correct, v_explanation
  FROM public.quiz_questions qq WHERE qq.id = _question_id;

  SELECT (o.ordinality - 1)::int INTO v_correct_displayed
  FROM jsonb_array_elements_text(v_order) WITH ORDINALITY AS o(value, ordinality)
  WHERE (o.value)::int = v_correct;

  RETURN QUERY SELECT (v_stored_selected = v_correct), v_correct_displayed, v_explanation;
END;
$$;

REVOKE ALL ON FUNCTION public.check_quiz_answer(uuid, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_quiz_answer(uuid, uuid, int) TO authenticated;

-- 6) submit_quiz_attempt -------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_session_id uuid, _answers jsonb)
RETURNS TABLE(
  attempt_id uuid, score int, passed boolean,
  correct_count int, total int,
  attempts_used int, attempts_allowed int, unlimited boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_session public.quiz_attempt_sessions;
  v_lesson uuid;
  v_pass int;
  v_allowed int;
  v_unlimited boolean;
  v_total int := 0;
  v_correct int := 0;
  v_stored jsonb := '{}'::jsonb;
  v_item jsonb;
  v_qid uuid;
  v_order jsonb;
  v_displayed int;
  v_stored_idx int;
  v_answer int;
  v_score int;
  v_passed boolean;
  v_attempt uuid;
  v_used int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_session FROM public.quiz_attempt_sessions
  WHERE id = _session_id AND user_id = v_user;
  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;
  IF v_session.submitted_attempt_id IS NOT NULL THEN
    RAISE EXCEPTION 'session_already_submitted';
  END IF;

  SELECT q.lesson_id, coalesce(q.passing_score, 0), q.attempts_allowed
    INTO v_lesson, v_pass, v_allowed
  FROM public.quizzes q WHERE q.id = v_session.quiz_id;

  v_unlimited := public.quiz_attempts_unlimited(v_allowed);

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_session.drawn) LOOP
    v_total := v_total + 1;
    v_qid := (v_item->>'question_id')::uuid;
    v_order := v_item->'option_order';
    v_answer := NULL;
    BEGIN
      v_answer := (_answers->>(v_qid::text))::int;
    EXCEPTION WHEN others THEN
      v_answer := NULL;
    END;

    IF v_answer IS NOT NULL AND v_answer >= 0 AND v_answer < jsonb_array_length(v_order) THEN
      v_stored_idx := (v_order -> v_answer)::int;
      -- Store the STORED option index so existing readers of
      -- quiz_attempts.answers see exactly the shape they saw before.
      v_stored := v_stored || jsonb_build_object(v_qid::text, v_stored_idx);
      IF v_stored_idx = (SELECT correct_answer FROM public.quiz_questions WHERE id = v_qid) THEN
        v_correct := v_correct + 1;
      END IF;
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'quiz_has_no_questions';
  END IF;

  v_score := round(100.0 * v_correct / v_total);
  -- Mirrors the client's isUngraded branch: pass mark 0 => ungraded => passed.
  v_passed := (v_pass = 0) OR (v_score >= v_pass);

  BEGIN
    INSERT INTO public.quiz_attempts (quiz_id, user_id, score, passed, answers)
    VALUES (v_session.quiz_id, v_user, v_score, v_passed, v_stored)
    RETURNING id INTO v_attempt;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'attempt_limit_reached';
  END;

  IF v_passed AND v_lesson IS NOT NULL THEN
    INSERT INTO public.lesson_progress (lesson_id, user_id, completed, completed_at)
    VALUES (v_lesson, v_user, true, now())
    ON CONFLICT (lesson_id, user_id)
    DO UPDATE SET completed = true, completed_at = now();
  END IF;

  UPDATE public.quiz_attempt_sessions
     SET submitted_attempt_id = v_attempt
   WHERE id = v_session.id;

  SELECT count(*) INTO v_used
  FROM public.quiz_attempts
  WHERE quiz_id = v_session.quiz_id AND user_id = v_user;

  RETURN QUERY SELECT v_attempt, v_score, v_passed, v_correct, v_total, v_used,
    CASE WHEN v_unlimited THEN NULL::int ELSE v_allowed END, v_unlimited;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

-- 7) get_quiz_question_counts -------------------------------------------
CREATE OR REPLACE FUNCTION public.get_quiz_question_counts(_course_id uuid)
RETURNS TABLE(quiz_id uuid, lesson_id uuid, question_count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.lesson_id, count(qq.id)::int
  FROM public.quizzes q
  JOIN public.lessons l ON l.id = q.lesson_id
  LEFT JOIN public.quiz_questions qq ON qq.quiz_id = q.id
  WHERE l.course_id = _course_id
  GROUP BY q.id, q.lesson_id
$$;

REVOKE ALL ON FUNCTION public.get_quiz_question_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_question_counts(uuid) TO authenticated;