-- Learner evidence pack (wave 2, part 6a): one read-only aggregate used by the
-- PDF renderer in 6b. Aggregates only what the learner already has evidence for.
CREATE OR REPLACE FUNCTION public.get_learner_evidence_pack(
  _user uuid,
  _course uuid DEFAULT NULL,
  _standard uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _result jsonb;
BEGIN
  -- Fence first: self, training admin, or the org admin of this member.
  IF _user IS NULL OR NOT (
    auth.uid() = _user
    OR public.is_ops_training_admin(auth.uid())
    OR public.is_org_admin_of_member(auth.uid(), _user)
  ) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  WITH scope AS (
    -- The learner's enrolments, narrowed by course and/or standard.
    SELECT e.course_id, e.enrolled_at, e.completed_at
    FROM public.enrollments e
    WHERE e.user_id = _user
      AND (_course IS NULL OR e.course_id = _course)
      AND (
        _standard IS NULL
        OR EXISTS (
          SELECT 1 FROM public.standard_links sl
          WHERE sl.standard_id = _standard
            AND (
              sl.course_id = e.course_id
              OR sl.lesson_id IN (SELECT l.id FROM public.lessons l WHERE l.course_id = e.course_id)
            )
        )
      )
  ),
  scope_lessons AS (
    SELECT l.id AS lesson_id, l.course_id, l.title AS lesson_title
    FROM public.lessons l
    JOIN scope s ON s.course_id = l.course_id
    WHERE _standard IS NULL
       OR EXISTS (
         SELECT 1 FROM public.standard_links sl
         WHERE sl.standard_id = _standard
           AND (sl.lesson_id = l.id OR sl.course_id = l.course_id)
       )
  ),
  learner AS (
    SELECT jsonb_build_object(
      'user_id', _user,
      'name', COALESCE(NULLIF(btrim(p.full_name), ''), u.email::text),
      'email', u.email::text,
      'organisation', (
        SELECT jsonb_build_object('id', o.id, 'name', o.name)
        FROM public.organisation_members m
        JOIN public.organisations o ON o.id = m.organisation_id
        WHERE m.user_id = _user AND m.ended_at IS NULL
        ORDER BY m.started_at DESC NULLS LAST
        LIMIT 1
      )
    ) AS j
    FROM (SELECT 1) one
    LEFT JOIN public.profiles p ON p.user_id = _user
    LEFT JOIN auth.users u ON u.id = _user
  ),
  course_rows AS (
    SELECT c.title AS sort_title, jsonb_build_object(
      'course_id', c.id,
      'title', c.title,
      'category', c.category,
      'level', c.level,
      'delivery_type', c.delivery_type,
      'cpd_hours', c.cpd_hours,
      'enrolled_at', s.enrolled_at,
      'completed_at', s.completed_at,
      'lessons_total', (SELECT count(*) FROM public.lessons l WHERE l.course_id = c.id),
      'lessons_completed', (
        SELECT count(*) FROM public.lesson_progress lp
        JOIN public.lessons l ON l.id = lp.lesson_id
        WHERE l.course_id = c.id AND lp.user_id = _user AND lp.completed
      ),
      'certificate', (
        SELECT jsonb_build_object(
          'certificate_number', cert.certificate_number,
          'certificate_type', COALESCE(cert.certificate_type, 'completion'),
          'issued_at', cert.issued_at,
          'expires_at', cert.expires_at,
          'verification_code', cert.verification_code
        )
        FROM public.certificates cert
        WHERE cert.user_id = _user AND cert.course_id = c.id
        ORDER BY cert.issued_at DESC NULLS LAST
        LIMIT 1
      ),
      'standards', COALESCE((
        SELECT jsonb_agg(x.j ORDER BY x.framework, x.code)
        FROM (
          SELECT st.framework, st.code, jsonb_build_object(
            'framework', st.framework,
            'code', st.code,
            'title', st.title,
            'lesson_titles', COALESCE((
              SELECT jsonb_agg(DISTINCT l2.title)
              FROM public.standard_links sl2
              JOIN public.lessons l2 ON l2.id = sl2.lesson_id
              WHERE sl2.standard_id = st.id AND l2.course_id = c.id
            ), '[]'::jsonb)
          ) AS j
          FROM public.standards st
          WHERE EXISTS (
            SELECT 1 FROM public.standard_links sl
            WHERE sl.standard_id = st.id
              AND (sl.course_id = c.id OR sl.lesson_id IN (SELECT l3.id FROM public.lessons l3 WHERE l3.course_id = c.id))
          )
          AND (_standard IS NULL OR st.id = _standard)
        ) x
      ), '[]'::jsonb)
    ) AS j
    FROM scope s
    JOIN public.courses c ON c.id = s.course_id
  ),
  reflections AS (
    -- Reflective answers, with the assessor's mark when one exists.
    SELECT COALESCE(m.signed_at, r.updated_at) AS sort_at, jsonb_build_object(
      'course_title', c.title,
      'lesson_title', sl.lesson_title,
      'block_id', b.id,
      'prompt', b.payload->>'prompt',
      'criteria_labels', COALESCE((
        SELECT jsonb_agg(t) FROM jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(b.payload->'criteria') = 'array' THEN b.payload->'criteria' ELSE '[]'::jsonb END
        ) t
      ), '[]'::jsonb),
      'learner_answer', r.response->>'text',
      'answered_at', r.updated_at,
      'mark', CASE WHEN m.id IS NULL THEN NULL ELSE jsonb_build_object(
        'outcome', m.outcome,
        'assessor_name', COALESCE(
          NULLIF(btrim(m.assessor_name), ''),
          (SELECT COALESCE(NULLIF(btrim(p2.full_name), ''), u2.email::text)
             FROM auth.users u2 LEFT JOIN public.profiles p2 ON p2.user_id = u2.id
            WHERE u2.id = m.assessor_id)
        ),
        'signed_at', m.signed_at,
        'criteria', COALESCE(m.criteria, '{}'::jsonb),
        'comment', m.comment
      ) END
    ) AS j
    FROM public.lesson_blocks b
    JOIN scope_lessons sl ON sl.lesson_id = b.lesson_id
    JOIN public.courses c ON c.id = sl.course_id
    LEFT JOIN public.lesson_block_responses r ON r.block_id = b.id AND r.user_id = _user
    LEFT JOIN public.block_marks m ON m.block_id = b.id AND m.user_id = _user AND m.kind = 'reflection'
    WHERE b.block_type = 'reflection'
      AND (r.id IS NOT NULL OR m.id IS NOT NULL)
  ),
  checklists AS (
    SELECT m.signed_at AS sort_at, jsonb_build_object(
      'course_title', c.title,
      'lesson_title', sl.lesson_title,
      'block_id', m.block_id,
      'heading', b.payload->>'heading',
      'steps', COALESCE((
        SELECT jsonb_agg(step->>'step_title')
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(b.payload->'steps') = 'array' THEN b.payload->'steps' ELSE '[]'::jsonb END
        ) step
      ), '[]'::jsonb),
      'outcome', m.outcome,
      'assessor_name', COALESCE(
        NULLIF(btrim(m.assessor_name), ''),
        (SELECT COALESCE(NULLIF(btrim(p2.full_name), ''), u2.email::text)
           FROM auth.users u2 LEFT JOIN public.profiles p2 ON p2.user_id = u2.id
          WHERE u2.id = m.assessor_id)
      ),
      'signed_at', m.signed_at,
      'criteria', COALESCE(m.criteria, '{}'::jsonb),
      'comment', m.comment
    ) AS j
    FROM public.block_marks m
    JOIN scope_lessons sl ON sl.lesson_id = m.lesson_id
    JOIN public.courses c ON c.id = sl.course_id
    LEFT JOIN public.lesson_blocks b ON b.id = m.block_id
    WHERE m.user_id = _user AND m.kind = 'checklist'
  ),
  quiz_results AS (
    SELECT c.title AS sort_title, q.title AS sort_quiz, jsonb_build_object(
      'course_title', c.title,
      'quiz_title', q.title,
      'passing_score', q.passing_score,
      'attempts', agg.attempts,
      'best_score', agg.best_score,
      'best_passed', agg.best_passed,
      'latest_score', latest.score,
      'latest_passed', latest.passed,
      'latest_at', latest.attempted_at
    ) AS j
    FROM public.quizzes q
    JOIN scope_lessons sl ON sl.lesson_id = q.lesson_id
    JOIN public.courses c ON c.id = sl.course_id
    JOIN LATERAL (
      SELECT count(*)::int AS attempts,
             max(a.score)::int AS best_score,
             bool_or(a.passed) AS best_passed
      FROM public.quiz_attempts a
      WHERE a.quiz_id = q.id AND a.user_id = _user
    ) agg ON agg.attempts > 0
    LEFT JOIN LATERAL (
      SELECT a.score, a.passed, a.attempted_at
      FROM public.quiz_attempts a
      WHERE a.quiz_id = q.id AND a.user_id = _user
      ORDER BY a.attempted_at DESC
      LIMIT 1
    ) latest ON true
  ),
  practical AS (
    SELECT ps.session_date AS sort_at, jsonb_build_object(
      'course_title', c.title,
      'session_date', ps.session_date,
      'location', ps.location,
      'attended', pa.attended,
      'competency_outcome', pa.competency_outcome,
      'marked_at', pa.marked_at,
      'marked_by_name', (
        SELECT COALESCE(NULLIF(btrim(p2.full_name), ''), u2.email::text)
        FROM auth.users u2 LEFT JOIN public.profiles p2 ON p2.user_id = u2.id
        WHERE u2.id = pa.marked_by
      ),
      'notes', pa.notes
    ) AS j
    FROM public.practical_attendance pa
    JOIN public.practical_sessions ps ON ps.id = pa.session_id
    JOIN scope s ON s.course_id = ps.course_id
    JOIN public.courses c ON c.id = ps.course_id
    WHERE pa.user_id = _user
  ),
  signoffs AS (
    SELECT sort_at, j FROM (
      -- Enteral feeding competency (no per-domain comments on this table).
      SELECT g.signed_off_at AS sort_at, jsonb_build_object(
        'kind', 'competency',
        'course_title', c.title,
        'outcome', g.outcome,
        'assessed_at', g.signed_off_at,
        'assessor_name', (
          SELECT COALESCE(NULLIF(btrim(p2.full_name), ''), u2.email::text)
          FROM auth.users u2 LEFT JOIN public.profiles p2 ON p2.user_id = u2.id
          WHERE u2.id = g.assessor_id
        ),
        'assessor_notes', g.assessor_notes,
        'action_plan', NULL,
        'reassessment_date', NULL,
        'attempt_number', NULL,
        'location', NULL,
        'domains', jsonb_build_array(
          jsonb_build_object('name', 'Tube identification', 'result', g.tube_identification, 'comments', NULL),
          jsonb_build_object('name', 'Pump set-up', 'result', g.pump_setup, 'comments', NULL),
          jsonb_build_object('name', 'Bolus method', 'result', g.bolus_method, 'comments', NULL),
          jsonb_build_object('name', 'Flushing and medication', 'result', g.flushing_medication, 'comments', NULL),
          jsonb_build_object('name', 'Routine care', 'result', g.routine_care, 'comments', NULL),
          jsonb_build_object('name', 'Troubleshooting', 'result', g.troubleshooting, 'comments', NULL),
          jsonb_build_object('name', 'Documentation standard', 'result', g.documentation_standard, 'comments', NULL)
        )
      ) AS j
      FROM public.competency_signoffs g
      JOIN scope s ON s.course_id = g.course_id
      JOIN public.courses c ON c.id = g.course_id
      WHERE g.user_id = _user

      UNION ALL
      SELECT g.assessed_at AS sort_at, jsonb_build_object(
        'kind', 'bls',
        'course_title', c.title,
        'outcome', g.outcome,
        'assessed_at', g.assessed_at,
        'assessor_name', (
          SELECT COALESCE(NULLIF(btrim(p2.full_name), ''), u2.email::text)
          FROM auth.users u2 LEFT JOIN public.profiles p2 ON p2.user_id = u2.id
          WHERE u2.id = g.assessor_id
        ),
        'assessor_notes', g.assessor_notes,
        'action_plan', g.action_plan,
        'reassessment_date', g.reassessment_date,
        'attempt_number', g.attempt_number,
        'location', g.location,
        'domains', jsonb_build_array(
          jsonb_build_object('name', 'Scene safety', 'result', g.scene_safety, 'comments', g.scene_safety_comments),
          jsonb_build_object('name', 'Breathing check', 'result', g.breathing_check, 'comments', g.breathing_check_comments),
          jsonb_build_object('name', 'Chest compressions', 'result', g.chest_compressions, 'comments', g.chest_compressions_comments),
          jsonb_build_object('name', 'Rescue breaths', 'result', g.rescue_breaths, 'comments', g.rescue_breaths_comments),
          jsonb_build_object('name', 'AED use', 'result', g.aed_use, 'comments', g.aed_use_comments),
          jsonb_build_object('name', 'Choking response', 'result', g.choking_response, 'comments', g.choking_response_comments),
          jsonb_build_object('name', 'Recovery position', 'result', g.recovery_position, 'comments', g.recovery_position_comments),
          jsonb_build_object('name', 'Handover and reporting', 'result', g.handover_reporting, 'comments', g.handover_reporting_comments)
        )
      ) AS j
      FROM public.bls_competency_signoffs g
      JOIN scope s ON s.course_id = g.course_id
      JOIN public.courses c ON c.id = g.course_id
      WHERE g.user_id = _user

      UNION ALL
      SELECT g.assessed_at AS sort_at, jsonb_build_object(
        'kind', 'medication',
        'course_title', c.title,
        'outcome', g.outcome,
        'assessed_at', g.assessed_at,
        'assessor_name', (
          SELECT COALESCE(NULLIF(btrim(p2.full_name), ''), u2.email::text)
          FROM auth.users u2 LEFT JOIN public.profiles p2 ON p2.user_id = u2.id
          WHERE u2.id = g.assessor_id
        ),
        'assessor_notes', g.assessor_notes,
        'action_plan', g.action_plan,
        'reassessment_date', g.reassessment_date,
        'attempt_number', g.attempt_number,
        'location', g.location,
        'domains', jsonb_build_array(
          jsonb_build_object('name', 'Pre-administration checks', 'result', g.pre_admin_checks, 'comments', g.pre_admin_checks_comments),
          jsonb_build_object('name', 'Communication', 'result', g.communication, 'comments', g.communication_comments),
          jsonb_build_object('name', 'Administration process', 'result', g.admin_process, 'comments', g.admin_process_comments),
          jsonb_build_object('name', 'MAR documentation', 'result', g.mar_documentation, 'comments', g.mar_documentation_comments),
          jsonb_build_object('name', 'Refusal handling', 'result', g.refusal_handling, 'comments', g.refusal_handling_comments),
          jsonb_build_object('name', 'PRN handling', 'result', g.prn_handling, 'comments', g.prn_handling_comments),
          jsonb_build_object('name', 'Storage awareness', 'result', g.storage_awareness, 'comments', g.storage_awareness_comments),
          jsonb_build_object('name', 'Incident escalation', 'result', g.incident_escalation, 'comments', g.incident_escalation_comments)
        )
      ) AS j
      FROM public.medication_competency_signoffs g
      JOIN scope s ON s.course_id = g.course_id
      JOIN public.courses c ON c.id = g.course_id
      WHERE g.user_id = _user

      UNION ALL
      SELECT g.assessed_at AS sort_at, jsonb_build_object(
        'kind', 'respiratory',
        'course_title', c.title,
        'outcome', g.outcome,
        'assessed_at', g.assessed_at,
        'assessor_name', (
          SELECT COALESCE(NULLIF(btrim(p2.full_name), ''), u2.email::text)
          FROM auth.users u2 LEFT JOIN public.profiles p2 ON p2.user_id = u2.id
          WHERE u2.id = g.assessor_id
        ),
        'assessor_notes', g.assessor_notes,
        'action_plan', g.action_plan,
        'reassessment_date', g.reassessment_date,
        'attempt_number', g.attempt_number,
        'location', g.location,
        'domains', jsonb_build_array(
          jsonb_build_object('name', 'Scope and boundaries', 'result', g.scope_boundaries, 'comments', g.scope_boundaries_comments),
          jsonb_build_object('name', 'Respiratory red flags', 'result', g.respiratory_red_flags, 'comments', g.respiratory_red_flags_comments),
          jsonb_build_object('name', 'Pulse oximetry', 'result', g.pulse_oximetry, 'comments', g.pulse_oximetry_comments),
          jsonb_build_object('name', 'Oxygen safety', 'result', g.oxygen_safety, 'comments', g.oxygen_safety_comments),
          jsonb_build_object('name', 'Oxygen support', 'result', g.oxygen_support, 'comments', g.oxygen_support_comments),
          jsonb_build_object('name', 'Oral suction', 'result', g.oral_suction, 'comments', g.oral_suction_comments),
          jsonb_build_object('name', 'Infection prevention', 'result', g.infection_prevention, 'comments', g.infection_prevention_comments),
          jsonb_build_object('name', 'Equipment checks', 'result', g.equipment_checks, 'comments', g.equipment_checks_comments),
          jsonb_build_object('name', 'Documentation and handover', 'result', g.documentation_handover, 'comments', g.documentation_handover_comments)
        )
      ) AS j
      FROM public.respiratory_competency_signoffs g
      JOIN scope s ON s.course_id = g.course_id
      JOIN public.courses c ON c.id = g.course_id
      WHERE g.user_id = _user
    ) all_signoffs
  ),
  standards_summary AS (
    SELECT st.framework AS f, st.code AS cd, jsonb_build_object(
      'framework', st.framework,
      'code', st.code,
      'title', st.title,
      'courses', COALESCE((
        SELECT jsonb_agg(DISTINCT c2.title)
        FROM scope s2
        JOIN public.courses c2 ON c2.id = s2.course_id
        WHERE EXISTS (
          SELECT 1 FROM public.standard_links sl2
          WHERE sl2.standard_id = st.id
            AND (sl2.course_id = c2.id OR sl2.lesson_id IN (SELECT l4.id FROM public.lessons l4 WHERE l4.course_id = c2.id))
        )
      ), '[]'::jsonb),
      'evidence_count', (
        SELECT count(DISTINCT sl3.lesson_id)
        FROM scope_lessons sl3
        WHERE EXISTS (
            SELECT 1 FROM public.standard_links sl4
            WHERE sl4.standard_id = st.id AND sl4.lesson_id = sl3.lesson_id
          )
          AND (
            EXISTS (SELECT 1 FROM public.lesson_progress lp WHERE lp.lesson_id = sl3.lesson_id AND lp.user_id = _user AND lp.completed)
            OR EXISTS (
              SELECT 1 FROM public.lesson_block_responses r2
              JOIN public.lesson_blocks b2 ON b2.id = r2.block_id
              WHERE b2.lesson_id = sl3.lesson_id AND r2.user_id = _user
            )
            OR EXISTS (
              SELECT 1 FROM public.quiz_attempts a2
              JOIN public.quizzes q2 ON q2.id = a2.quiz_id
              WHERE q2.lesson_id = sl3.lesson_id AND a2.user_id = _user
            )
          )
      )
    ) AS j
    FROM public.standards st
    WHERE (_standard IS NULL OR st.id = _standard)
      AND EXISTS (
        SELECT 1 FROM scope s3
        JOIN public.standard_links sl5 ON sl5.standard_id = st.id
        WHERE sl5.course_id = s3.course_id
           OR sl5.lesson_id IN (SELECT l5.id FROM public.lessons l5 WHERE l5.course_id = s3.course_id)
      )
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'filters', jsonb_build_object('course_id', _course, 'standard_id', _standard),
    'learner', (SELECT j FROM learner),
    'courses', COALESCE((SELECT jsonb_agg(j ORDER BY sort_title) FROM course_rows), '[]'::jsonb),
    'reflections', COALESCE((SELECT jsonb_agg(j ORDER BY sort_at DESC NULLS LAST) FROM reflections), '[]'::jsonb),
    'checklists', COALESCE((SELECT jsonb_agg(j ORDER BY sort_at DESC NULLS LAST) FROM checklists), '[]'::jsonb),
    'quiz_results', COALESCE((SELECT jsonb_agg(j ORDER BY sort_title, sort_quiz) FROM quiz_results), '[]'::jsonb),
    'practical', COALESCE((SELECT jsonb_agg(j ORDER BY sort_at DESC NULLS LAST) FROM practical), '[]'::jsonb),
    'signoffs', COALESCE((SELECT jsonb_agg(j ORDER BY sort_at DESC NULLS LAST) FROM signoffs), '[]'::jsonb),
    'standards_summary', COALESCE((SELECT jsonb_agg(j ORDER BY f, cd) FROM standards_summary), '[]'::jsonb)
  )
  INTO _result;

  RETURN _result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_learner_evidence_pack(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_learner_evidence_pack(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_learner_evidence_pack(uuid, uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.get_learner_evidence_pack(uuid, uuid, uuid) IS
  'Wave 2 part 6a: read-only evidence aggregate for one learner (self, training admin, or org admin of the member). The PDF renderer in 6b consumes this shape.';