DO $do$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_learner_evidence_pack';

  IF d IS NULL THEN
    RAISE EXCEPTION 'get_learner_evidence_pack is missing';
  END IF;
  IF position('m.kind = ''checklist''' in d) = 0 THEN
    RAISE EXCEPTION 'checklist filter not found — nothing to change';
  END IF;

  d := replace(d, 'm.kind = ''checklist''', 'm.kind IN (''observation'', ''checklist'')');
  EXECUTE d;
END $do$;

REVOKE ALL ON FUNCTION public.get_learner_evidence_pack(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_learner_evidence_pack(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_learner_evidence_pack(uuid, uuid, uuid) TO authenticated;