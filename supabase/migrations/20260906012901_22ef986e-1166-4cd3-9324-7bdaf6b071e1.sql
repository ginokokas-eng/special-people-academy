REVOKE EXECUTE ON FUNCTION public.can_assess_learner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_member_can_assess(uuid, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_marking_queue(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_reflection_mark(uuid, uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_observation(uuid, uuid, jsonb, text, text) FROM anon;