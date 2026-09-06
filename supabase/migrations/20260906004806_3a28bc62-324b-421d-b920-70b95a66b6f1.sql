-- 1. question_bank
CREATE TABLE public.question_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NULL,
  version int NOT NULL DEFAULT 1,
  stem text NOT NULL,
  options jsonb NOT NULL,
  correct_id text NOT NULL,
  explanation text,
  tags text[] NOT NULL DEFAULT '{}',
  standard_code text,
  difficulty text CHECK (difficulty IN ('easy','medium','hard')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bank TO authenticated;
GRANT ALL ON public.question_bank TO service_role;

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read the question bank"
ON public.question_bank FOR SELECT TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Staff can create bank questions"
ON public.question_bank FOR INSERT TO authenticated
WITH CHECK (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Staff can update bank questions"
ON public.question_bank FOR UPDATE TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'))
WITH CHECK (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Staff can delete bank questions"
ON public.question_bank FOR DELETE TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE INDEX question_bank_tags_idx ON public.question_bank USING GIN (tags);
CREATE INDEX question_bank_standard_idx ON public.question_bank (standard_code);

CREATE TRIGGER update_question_bank_updated_at
BEFORE UPDATE ON public.question_bank
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. question_bank_usages
CREATE TABLE public.question_bank_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  bank_version int NOT NULL,
  lesson_block_id uuid NULL REFERENCES public.lesson_blocks(id) ON DELETE CASCADE,
  quiz_question_id uuid NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_bank_usages_one_ref CHECK (
    (lesson_block_id IS NOT NULL AND quiz_question_id IS NULL)
    OR (lesson_block_id IS NULL AND quiz_question_id IS NOT NULL)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bank_usages TO authenticated;
GRANT ALL ON public.question_bank_usages TO service_role;

ALTER TABLE public.question_bank_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read bank usages"
ON public.question_bank_usages FOR SELECT TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Staff can create bank usages"
ON public.question_bank_usages FOR INSERT TO authenticated
WITH CHECK (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Staff can update bank usages"
ON public.question_bank_usages FOR UPDATE TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'))
WITH CHECK (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Staff can delete bank usages"
ON public.question_bank_usages FOR DELETE TO authenticated
USING (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'));

CREATE INDEX question_bank_usages_bank_idx ON public.question_bank_usages (bank_id, bank_version);

-- 3 & 4. additive columns
ALTER TABLE public.quiz_questions ADD COLUMN question_payload jsonb;
ALTER TABLE public.quiz_attempts ADD COLUMN question_snapshot jsonb;

-- 5. start_quiz_attempt with pool materialisation
CREATE OR REPLACE FUNCTION public.start_quiz_attempt(_quiz_id uuid)
RETURNS TABLE(session_id uuid, attempts_used integer, attempts_allowed integer, unlimited boolean, passing_score integer, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_course uuid;
  v_allowed int;
  v_pass int;
  v_unlimited boolean;
  v_used int;
  v_session public.quiz_attempt_sessions;
  v_drawn jsonb := '[]'::jsonb;
  v_q record;
  v_tags text[];
  v_draw int;
  v_found int;
  v_bank record;
  v_n int;
  v_labels jsonb;
  v_correct int;
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

  FOR v_q IN
    SELECT qq.id, qq.question_type, qq.options, qq.order_index, qq.question_payload
    FROM public.quiz_questions qq
    WHERE qq.quiz_id = _quiz_id
    ORDER BY qq.order_index, qq.id
  LOOP
    IF coalesce(v_q.question_type, 'multiple_choice') = 'pool' THEN
      v_tags := ARRAY(SELECT jsonb_array_elements_text(coalesce(v_q.question_payload->'pool_tags', '[]'::jsonb)));
      v_draw := coalesce((v_q.question_payload->>'draw_count')::int, 0);

      IF v_draw <= 0 OR array_length(v_tags, 1) IS NULL THEN
        RAISE EXCEPTION 'pool_underfilled';
      END IF;

      SELECT count(*) INTO v_found
      FROM public.question_bank b
      WHERE b.org_id IS NULL AND b.tags && v_tags;

      IF v_found < v_draw THEN
        RAISE EXCEPTION 'pool_underfilled';
      END IF;

      v_n := 0;
      FOR v_bank IN
        SELECT b.* FROM public.question_bank b
        WHERE b.org_id IS NULL AND b.tags && v_tags
        ORDER BY random()
        LIMIT v_draw
      LOOP
        SELECT coalesce(jsonb_agg(o.value->>'label' ORDER BY o.ordinality), '[]'::jsonb)
          INTO v_labels
        FROM jsonb_array_elements(v_bank.options) WITH ORDINALITY AS o(value, ordinality);

        SELECT (o.ordinality - 1)::int INTO v_correct
        FROM jsonb_array_elements(v_bank.options) WITH ORDINALITY AS o(value, ordinality)
        WHERE o.value->>'id' = v_bank.correct_id;

        IF v_correct IS NULL THEN
          RAISE EXCEPTION 'pool_underfilled';
        END IF;

        v_drawn := v_drawn || jsonb_build_array(jsonb_build_object(
          'question_id', v_q.id::text || ':' || v_n::text,
          'pool_question_id', v_q.id,
          'bank_id', v_bank.id,
          'bank_version', v_bank.version,
          'stem', v_bank.stem,
          'options', v_labels,
          'correct_index', v_correct,
          'explanation', v_bank.explanation,
          'option_order', (
            SELECT coalesce(jsonb_agg(idx ORDER BY random()), '[]'::jsonb)
            FROM generate_series(0, jsonb_array_length(v_labels) - 1) AS idx
          )
        ));
        v_n := v_n + 1;
      END LOOP;
    ELSE
      v_drawn := v_drawn || jsonb_build_array(jsonb_build_object(
        'question_id', v_q.id::text,
        'option_order', (
          SELECT coalesce(jsonb_agg(idx ORDER BY random()), '[]'::jsonb)
          FROM generate_series(0, jsonb_array_length(v_q.options) - 1) AS idx
        )
      ));
    END IF;
  END LOOP;

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
$function$;

REVOKE ALL ON FUNCTION public.start_quiz_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_quiz_attempt(uuid) TO authenticated;

-- get_quiz_for_attempt: snapshot-aware
CREATE OR REPLACE FUNCTION public.get_quiz_for_attempt(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_session public.quiz_attempt_sessions;
  v_quiz public.quizzes;
  v_questions jsonb := '[]'::jsonb;
  v_item jsonb;
  v_opts jsonb;
  v_text text;
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

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_session.drawn) LOOP
    IF v_item ? 'bank_id' THEN
      v_text := v_item->>'stem';
      SELECT coalesce(jsonb_agg(v_item->'options'->(o.value)::int ORDER BY o.ordinality), '[]'::jsonb)
        INTO v_opts
      FROM jsonb_array_elements_text(v_item->'option_order') WITH ORDINALITY AS o(value, ordinality);
    ELSE
      SELECT qq.question,
        (SELECT coalesce(jsonb_agg(qq.options -> (o.value)::int ORDER BY o.ordinality), '[]'::jsonb)
         FROM jsonb_array_elements_text(v_item->'option_order') WITH ORDINALITY AS o(value, ordinality))
        INTO v_text, v_opts
      FROM public.quiz_questions qq
      WHERE qq.id = (v_item->>'question_id')::uuid;
    END IF;

    v_questions := v_questions || jsonb_build_array(jsonb_build_object(
      'question_id', v_item->>'question_id',
      'question_text', v_text,
      'explanation', NULL,
      'options', coalesce(v_opts, '[]'::jsonb)
    ));
  END LOOP;

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
$function$;

REVOKE ALL ON FUNCTION public.get_quiz_for_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_for_attempt(uuid) TO authenticated;

-- check_quiz_answer: text question ids (accepts uuid strings and pool synthetic ids)
DROP FUNCTION IF EXISTS public.check_quiz_answer(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.check_quiz_answer(_session_id uuid, _question_id text, _selected integer)
RETURNS TABLE(is_correct boolean, correct_displayed_index integer, explanation text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_session public.quiz_attempt_sessions;
  v_item jsonb;
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

  SELECT d.item INTO v_item
  FROM jsonb_array_elements(v_session.drawn) AS d(item)
  WHERE d.item->>'question_id' = _question_id;

  IF v_item IS NULL THEN
    RAISE EXCEPTION 'question_not_in_session';
  END IF;

  v_order := v_item->'option_order';

  IF _selected IS NULL OR _selected < 0 OR _selected >= jsonb_array_length(v_order) THEN
    RAISE EXCEPTION 'invalid_option_index';
  END IF;

  v_stored_selected := (v_order -> _selected)::int;

  IF v_item ? 'bank_id' THEN
    v_correct := (v_item->>'correct_index')::int;
    v_explanation := v_item->>'explanation';
  ELSE
    SELECT qq.correct_answer, qq.explanation INTO v_correct, v_explanation
    FROM public.quiz_questions qq WHERE qq.id = (v_item->>'question_id')::uuid;
  END IF;

  SELECT (o.ordinality - 1)::int INTO v_correct_displayed
  FROM jsonb_array_elements_text(v_order) WITH ORDINALITY AS o(value, ordinality)
  WHERE (o.value)::int = v_correct;

  RETURN QUERY SELECT (v_stored_selected = v_correct), v_correct_displayed, v_explanation;
END;
$function$;

REVOKE ALL ON FUNCTION public.check_quiz_answer(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_quiz_answer(uuid, text, integer) TO authenticated;

-- submit_quiz_attempt: snapshot-aware grading + question_snapshot copy
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_session_id uuid, _answers jsonb)
RETURNS TABLE(attempt_id uuid, score integer, passed boolean, correct_count integer, total integer, attempts_used integer, attempts_allowed integer, unlimited boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_qid text;
  v_order jsonb;
  v_stored_idx int;
  v_answer int;
  v_correct_idx int;
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
    v_qid := v_item->>'question_id';
    v_order := v_item->'option_order';
    v_answer := NULL;
    BEGIN
      v_answer := (_answers->>v_qid)::int;
    EXCEPTION WHEN others THEN
      v_answer := NULL;
    END;

    IF v_item ? 'bank_id' THEN
      v_correct_idx := (v_item->>'correct_index')::int;
    ELSE
      SELECT correct_answer INTO v_correct_idx
      FROM public.quiz_questions WHERE id = (v_qid)::uuid;
    END IF;

    IF v_answer IS NOT NULL AND v_answer >= 0 AND v_answer < jsonb_array_length(v_order) THEN
      v_stored_idx := (v_order -> v_answer)::int;
      -- Store the STORED option index so existing readers of
      -- quiz_attempts.answers see exactly the shape they saw before.
      v_stored := v_stored || jsonb_build_object(v_qid, v_stored_idx);
      IF v_stored_idx = v_correct_idx THEN
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
    INSERT INTO public.quiz_attempts (quiz_id, user_id, score, passed, answers, question_snapshot)
    VALUES (v_session.quiz_id, v_user, v_score, v_passed, v_stored, v_session.drawn)
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
$function$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

-- counts include pool draw_count
CREATE OR REPLACE FUNCTION public.get_quiz_question_counts(_course_id uuid)
RETURNS TABLE(quiz_id uuid, lesson_id uuid, question_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT q.id, q.lesson_id,
    coalesce(sum(
      CASE WHEN coalesce(qq.question_type, 'multiple_choice') = 'pool'
        THEN greatest(coalesce((qq.question_payload->>'draw_count')::int, 0), 0)
        ELSE 1 END
    ), 0)::int
  FROM public.quizzes q
  JOIN public.lessons l ON l.id = q.lesson_id
  LEFT JOIN public.quiz_questions qq ON qq.quiz_id = q.id
  WHERE l.course_id = _course_id
  GROUP BY q.id, q.lesson_id
$function$;

-- 6. copy_bank_question_to_quiz
CREATE OR REPLACE FUNCTION public.copy_bank_question_to_quiz(_bank_id uuid, _quiz_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_bank public.question_bank;
  v_labels jsonb;
  v_correct int;
  v_order int;
  v_new uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT (public.is_ops_training_admin(v_user) OR public.has_role(v_user, 'trainer')) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;

  SELECT * INTO v_bank FROM public.question_bank WHERE id = _bank_id;
  IF v_bank.id IS NULL THEN
    RAISE EXCEPTION 'bank_question_not_found';
  END IF;

  SELECT coalesce(jsonb_agg(o.value->>'label' ORDER BY o.ordinality), '[]'::jsonb)
    INTO v_labels
  FROM jsonb_array_elements(v_bank.options) WITH ORDINALITY AS o(value, ordinality);

  SELECT (o.ordinality - 1)::int INTO v_correct
  FROM jsonb_array_elements(v_bank.options) WITH ORDINALITY AS o(value, ordinality)
  WHERE o.value->>'id' = v_bank.correct_id;

  IF v_correct IS NULL THEN
    RAISE EXCEPTION 'bank_question_has_no_correct_option';
  END IF;

  SELECT coalesce(max(order_index) + 1, 0) INTO v_order
  FROM public.quiz_questions WHERE quiz_id = _quiz_id;

  INSERT INTO public.quiz_questions
    (quiz_id, question, question_type, options, correct_answer, explanation, order_index)
  VALUES
    (_quiz_id, v_bank.stem, 'multiple_choice', v_labels, v_correct, v_bank.explanation, v_order)
  RETURNING id INTO v_new;

  INSERT INTO public.question_bank_usages (bank_id, bank_version, quiz_question_id)
  VALUES (_bank_id, v_bank.version, v_new);

  RETURN v_new;
END;
$function$;

REVOKE ALL ON FUNCTION public.copy_bank_question_to_quiz(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.copy_bank_question_to_quiz(uuid, uuid) TO authenticated;

-- 7. get_bank_usage_summary
CREATE OR REPLACE FUNCTION public.get_bank_usage_summary(_bank_id uuid)
RETURNS TABLE(usage_id uuid, kind text, title text, course_title text, lesson_block_id uuid, quiz_question_id uuid, bank_version integer, outdated boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.id,
    CASE WHEN u.lesson_block_id IS NOT NULL THEN 'lesson_block' ELSE 'quiz' END,
    coalesce(bl.title, ql.title, 'Untitled'),
    coalesce(bc.title, qc.title, ''),
    u.lesson_block_id,
    u.quiz_question_id,
    u.bank_version,
    (u.bank_version < b.version)
  FROM public.question_bank_usages u
  JOIN public.question_bank b ON b.id = u.bank_id
  LEFT JOIN public.lesson_blocks lb ON lb.id = u.lesson_block_id
  LEFT JOIN public.lessons bl ON bl.id = lb.lesson_id
  LEFT JOIN public.courses bc ON bc.id = bl.course_id
  LEFT JOIN public.quiz_questions qq ON qq.id = u.quiz_question_id
  LEFT JOIN public.quizzes qz ON qz.id = qq.quiz_id
  LEFT JOIN public.lessons ql ON ql.id = qz.lesson_id
  LEFT JOIN public.courses qc ON qc.id = ql.course_id
  WHERE u.bank_id = _bank_id
    AND (public.is_ops_training_admin(auth.uid()) OR public.has_role(auth.uid(), 'trainer'))
  ORDER BY u.created_at
$function$;

REVOKE ALL ON FUNCTION public.get_bank_usage_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bank_usage_summary(uuid) TO authenticated;