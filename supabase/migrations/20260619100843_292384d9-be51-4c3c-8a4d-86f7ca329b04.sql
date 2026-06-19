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

  -- NULL or non-positive means unlimited attempts
  IF v_allowed IS NULL OR v_allowed <= 0 THEN
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

DROP TRIGGER IF EXISTS trg_enforce_quiz_attempts_limit ON public.quiz_attempts;
CREATE TRIGGER trg_enforce_quiz_attempts_limit
BEFORE INSERT ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_quiz_attempts_limit();