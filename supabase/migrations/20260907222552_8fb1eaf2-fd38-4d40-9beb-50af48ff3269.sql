-- Third correction: scorm_packages has no lesson_id (lessons.scorm_package_id points at it),
-- and registrations/runtime rows must go before the packages themselves.
CREATE OR REPLACE FUNCTION public.e2e_delete_course(_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
  v_counts jsonb := '{}'::jsonb;
  v_n bigint;
  v_lessons uuid[];
  v_blocks uuid[];
  v_quizzes uuid[];
  v_questions uuid[];
  v_scorm uuid[];
  v_regs uuid[];
  v_orgs uuid[];
BEGIN
  IF NOT public.is_ops_training_admin(auth.uid()) THEN
    RAISE EXCEPTION 'e2e_delete_course: training admin role required';
  END IF;

  SELECT title INTO v_title FROM public.courses WHERE id = _course_id;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'e2e_delete_course: course % not found', _course_id;
  END IF;
  IF v_title NOT LIKE 'E2E %' THEN
    RAISE EXCEPTION 'e2e_delete_course: refusing to delete course "%" — only titles starting with "E2E " may be removed', v_title;
  END IF;

  SELECT coalesce(array_agg(id), '{}') INTO v_lessons FROM public.lessons WHERE course_id = _course_id;
  SELECT coalesce(array_agg(DISTINCT scorm_package_id), '{}') INTO v_scorm
    FROM public.lessons WHERE course_id = _course_id AND scorm_package_id IS NOT NULL;
  SELECT coalesce(array_agg(id), '{}') INTO v_blocks FROM public.lesson_blocks WHERE lesson_id = ANY(v_lessons);
  SELECT coalesce(array_agg(id), '{}') INTO v_quizzes FROM public.quizzes WHERE lesson_id = ANY(v_lessons);
  SELECT coalesce(array_agg(id), '{}') INTO v_questions FROM public.quiz_questions WHERE quiz_id = ANY(v_quizzes);
  SELECT coalesce(array_agg(id), '{}') INTO v_regs
    FROM public.scorm_registrations WHERE course_id = _course_id OR lesson_id = ANY(v_lessons);
  SELECT coalesce(array_agg(DISTINCT organisation_id), '{}') INTO v_orgs
    FROM public.licences WHERE course_id = _course_id AND organisation_id IS NOT NULL;

  DELETE FROM public.lesson_block_responses WHERE block_id = ANY(v_blocks);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_block_responses', v_n);

  DELETE FROM public.block_marks WHERE block_id = ANY(v_blocks) OR lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('block_marks', v_n);

  DELETE FROM public.block_comments WHERE lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('block_comments', v_n);

  DELETE FROM public.question_bank_usages
   WHERE lesson_block_id = ANY(v_blocks) OR quiz_question_id = ANY(v_questions);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('question_bank_usages', v_n);

  DELETE FROM public.lesson_progress WHERE lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_progress', v_n);

  DELETE FROM public.quiz_attempt_sessions WHERE quiz_id = ANY(v_quizzes);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('quiz_attempt_sessions', v_n);

  DELETE FROM public.quiz_attempts WHERE quiz_id = ANY(v_quizzes);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('quiz_attempts', v_n);

  DELETE FROM public.quiz_questions WHERE quiz_id = ANY(v_quizzes);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('quiz_questions', v_n);

  DELETE FROM public.quizzes WHERE id = ANY(v_quizzes);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('quizzes', v_n);

  DELETE FROM public.lesson_blocks WHERE id = ANY(v_blocks);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_blocks', v_n);

  DELETE FROM public.lesson_transcripts WHERE lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_transcripts', v_n);

  DELETE FROM public.lesson_translations WHERE lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_translations', v_n);

  DELETE FROM public.lesson_resources WHERE lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_resources', v_n);

  DELETE FROM public.lesson_steps WHERE lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_steps', v_n);

  DELETE FROM public.lesson_video_sources WHERE lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_video_sources', v_n);

  DELETE FROM public.lesson_issue_reports WHERE lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lesson_issue_reports', v_n);

  DELETE FROM public.learner_notes WHERE lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('learner_notes', v_n);

  DELETE FROM public.scorm_runtime_kv WHERE registration_id = ANY(v_regs);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('scorm_runtime_kv', v_n);

  DELETE FROM public.scorm_registrations WHERE id = ANY(v_regs) OR scorm_package_id = ANY(v_scorm);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('scorm_registrations', v_n);

  DELETE FROM public.standard_links WHERE course_id = _course_id OR lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('standard_links', v_n);

  DELETE FROM public.course_resources WHERE course_id = _course_id OR lesson_id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('course_resources', v_n);

  DELETE FROM public.lessons WHERE id = ANY(v_lessons);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lessons', v_n);

  DELETE FROM public.scorm_packages WHERE id = ANY(v_scorm);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('scorm_packages', v_n);

  DELETE FROM public.modules WHERE course_id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('modules', v_n);

  DELETE FROM public.refresher_attempts WHERE schedule_id IN (
    SELECT id FROM public.refresher_schedules WHERE course_id = _course_id
  );
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('refresher_attempts', v_n);

  DELETE FROM public.refresher_schedules WHERE course_id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('refresher_schedules', v_n);

  DELETE FROM public.certificates WHERE course_id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('certificates', v_n);

  DELETE FROM public.enrollments WHERE course_id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('enrollments', v_n);

  DELETE FROM public.licence_seats WHERE licence_id IN (
    SELECT id FROM public.licences WHERE course_id = _course_id
  );
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('licence_seats', v_n);

  DELETE FROM public.licences WHERE course_id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('licences', v_n);

  DELETE FROM public.cart_items WHERE course_id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('cart_items', v_n);

  DELETE FROM public.course_offerings WHERE course_id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('course_offerings', v_n);

  DELETE FROM public.course_trainers WHERE course_id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('course_trainers', v_n);

  DELETE FROM public.course_reviews WHERE course_id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('course_reviews', v_n);

  DELETE FROM public.course_versions WHERE course_id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('course_versions', v_n);

  DELETE FROM public.courses WHERE id = _course_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('courses', v_n);

  -- Test organisations are only removed once nothing else points at them.
  DELETE FROM public.organisation_invitations WHERE organisation_id = ANY(v_orgs)
    AND EXISTS (SELECT 1 FROM public.organisations o WHERE o.id = organisation_id AND o.name LIKE 'E2E %');
  DELETE FROM public.organisation_members WHERE organisation_id = ANY(v_orgs)
    AND EXISTS (SELECT 1 FROM public.organisations o WHERE o.id = organisation_id AND o.name LIKE 'E2E %');

  DELETE FROM public.organisations o
   WHERE o.id = ANY(v_orgs)
     AND o.name LIKE 'E2E %'
     AND NOT EXISTS (SELECT 1 FROM public.licences l WHERE l.organisation_id = o.id);
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('organisations', v_n);

  RETURN v_counts;
END;
$function$;

REVOKE ALL ON FUNCTION public.e2e_delete_course(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.e2e_delete_course(uuid) TO authenticated;