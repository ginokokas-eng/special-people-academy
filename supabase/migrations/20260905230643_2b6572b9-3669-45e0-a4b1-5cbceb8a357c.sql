CREATE OR REPLACE FUNCTION public.lesson_block_stats_core(_lesson uuid, _org uuid)
 RETURNS TABLE(block_id uuid, block_type text, "position" integer, learners integer, completed integer, correct integer, correct_without_retry integer, avg_attempts numeric, option_counts jsonb, confusion jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH blk AS (
    SELECT b.id, b.block_type, b.order_index, b.payload
    FROM public.lesson_blocks b
    WHERE b.lesson_id = _lesson
      AND b.block_type IN ('mcq','drag_match','video','hot_graphic','scenario')
  ),
  resp AS (
    SELECT r.block_id, r.user_id, r.state, r.is_correct, r.attempt_count, r.response
    FROM public.lesson_block_responses r
    JOIN blk ON blk.id = r.block_id
    WHERE _org IS NULL OR r.user_id IN (
      SELECT m.user_id FROM public.organisation_members m
      WHERE m.organisation_id = _org AND m.ended_at IS NULL
    )
  ),
  agg AS (
    SELECT r.block_id,
           count(DISTINCT r.user_id)::int AS learners,
           count(DISTINCT r.user_id) FILTER (WHERE r.state = 'complete')::int AS completed,
           count(DISTINCT r.user_id) FILTER (WHERE r.is_correct)::int AS correct,
           count(DISTINCT r.user_id) FILTER (WHERE r.is_correct AND r.attempt_count = 1)::int AS cwr,
           round(avg(NULLIF(r.attempt_count, 0))::numeric, 2) AS avg_attempts
    FROM resp r GROUP BY r.block_id
  ),
  mcq_picks AS (
    SELECT r.block_id, x.option_id
    FROM resp r
    JOIN blk b ON b.id = r.block_id AND b.block_type = 'mcq'
    CROSS JOIN LATERAL (
      SELECT r.response->>'selected_id' AS option_id
      UNION ALL
      SELECT h->'value'->>'selected_id'
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(r.response->'history') = 'array'
             THEN r.response->'history' ELSE '[]'::jsonb END
      ) h
    ) x
    WHERE x.option_id IS NOT NULL
  ),
  mcq_counts AS (
    SELECT t.block_id, jsonb_object_agg(t.option_id, t.c) AS option_counts
    FROM (SELECT block_id, option_id, count(*)::int AS c FROM mcq_picks GROUP BY 1, 2) t
    GROUP BY t.block_id
  ),
  dm_place AS (
    SELECT r.block_id, kv.key AS item_id, kv.value #>> '{}' AS target_id
    FROM resp r
    JOIN blk b ON b.id = r.block_id AND b.block_type = 'drag_match'
    CROSS JOIN LATERAL (
      SELECT r.response AS obj
      UNION ALL
      SELECT h->'value'
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(r.response->'history') = 'array'
             THEN r.response->'history' ELSE '[]'::jsonb END
      ) h
    ) src
    CROSS JOIN LATERAL jsonb_each(
      CASE WHEN jsonb_typeof(src.obj) = 'object' THEN src.obj - 'history' ELSE '{}'::jsonb END
    ) kv
    WHERE jsonb_typeof(kv.value) = 'string'
  ),
  dm_conf AS (
    SELECT t.block_id,
           jsonb_agg(jsonb_build_object('item_id', t.item_id, 'target_id', t.target_id, 'count', t.c)
                     ORDER BY t.c DESC) AS confusion
    FROM (
      SELECT dp.block_id, dp.item_id, dp.target_id, count(*)::int AS c
      FROM dm_place dp
      JOIN blk b ON b.id = dp.block_id
      JOIN LATERAL jsonb_array_elements(COALESCE(b.payload->'items', '[]'::jsonb)) it
        ON it->>'id' = dp.item_id
      WHERE it->>'target_id' IS DISTINCT FROM dp.target_id
      GROUP BY 1, 2, 3
    ) t
    GROUP BY t.block_id
  ),
  sc_runs AS (
    SELECT r.block_id, run
    FROM resp r
    JOIN blk b ON b.id = r.block_id AND b.block_type = 'scenario'
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(r.response->'runs') = 'array'
           THEN r.response->'runs' ELSE '[]'::jsonb END
    ) run
  ),
  sc_choice_counts AS (
    SELECT t.block_id, jsonb_object_agg(t.choice_id, t.c) AS option_counts
    FROM (
      SELECT sr.block_id, step->>'choice_id' AS choice_id, count(*)::int AS c
      FROM sc_runs sr
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(sr.run->'path') = 'array'
             THEN sr.run->'path' ELSE '[]'::jsonb END
      ) step
      WHERE step->>'choice_id' IS NOT NULL
      GROUP BY 1, 2
    ) t
    GROUP BY t.block_id
  ),
  sc_end_counts AS (
    SELECT t.block_id,
           jsonb_agg(jsonb_build_object('item_id', t.end_node_id, 'target_id', t.kind, 'count', t.c)
                     ORDER BY t.c DESC) AS confusion
    FROM (
      SELECT sr.block_id,
             sr.run->>'end_node_id' AS end_node_id,
             CASE WHEN (sr.run->>'is_clean')::boolean THEN 'clean' ELSE 'unsafe' END AS kind,
             count(*)::int AS c
      FROM sc_runs sr
      WHERE sr.run->>'end_node_id' IS NOT NULL
      GROUP BY 1, 2, 3
    ) t
    GROUP BY t.block_id
  ),
  vid AS (
    SELECT r.block_id,
           kv.key AS checkpoint_id,
           COALESCE((kv.value->>'attempts')::int, 1) AS attempts,
           COALESCE((kv.value->>'is_correct')::boolean, false) AS ok
    FROM resp r
    JOIN blk b ON b.id = r.block_id AND b.block_type = 'video'
    CROSS JOIN LATERAL jsonb_each(
      CASE WHEN jsonb_typeof(r.response->'checkpoints') = 'object'
           THEN r.response->'checkpoints' ELSE '{}'::jsonb END
    ) kv
  ),
  vid_counts AS (
    SELECT t.block_id,
           jsonb_object_agg(t.checkpoint_id,
             jsonb_build_object('attempts_sum', t.attempts_sum, 'correct', t.correct)) AS option_counts
    FROM (
      SELECT block_id, checkpoint_id, sum(attempts)::int AS attempts_sum,
             count(*) FILTER (WHERE ok)::int AS correct
      FROM vid GROUP BY 1, 2
    ) t
    GROUP BY t.block_id
  )
  SELECT b.id,
         b.block_type,
         b.order_index,
         COALESCE(a.learners, 0),
         COALESCE(a.completed, 0),
         COALESCE(a.correct, 0),
         COALESCE(a.cwr, 0),
         COALESCE(a.avg_attempts, 0),
         COALESCE(mc.option_counts, vc.option_counts, sc.option_counts, '{}'::jsonb),
         COALESCE(dc.confusion, se.confusion, '[]'::jsonb)
  FROM blk b
  LEFT JOIN agg a ON a.block_id = b.id
  LEFT JOIN mcq_counts mc ON mc.block_id = b.id
  LEFT JOIN vid_counts vc ON vc.block_id = b.id
  LEFT JOIN dm_conf dc ON dc.block_id = b.id
  LEFT JOIN sc_choice_counts sc ON sc.block_id = b.id
  LEFT JOIN sc_end_counts se ON se.block_id = b.id
  ORDER BY b.order_index;
$function$;

REVOKE ALL ON FUNCTION public.lesson_block_stats_core(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lesson_block_stats_core(uuid, uuid) FROM anon, authenticated;