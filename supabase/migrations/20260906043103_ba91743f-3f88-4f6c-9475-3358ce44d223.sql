REVOKE EXECUTE ON FUNCTION public.draw_refresher_questions(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_schedule_refreshers() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_due_refreshers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_due_refreshers(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.start_refresher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_refresher(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_refresher(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_refresher(uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_course_retention(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_course_retention(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_org_retention(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_retention(uuid) TO authenticated;