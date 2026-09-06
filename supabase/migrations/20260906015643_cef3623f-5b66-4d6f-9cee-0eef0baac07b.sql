REVOKE ALL ON FUNCTION public.log_content_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stamp_progress_content_version() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_content_change_context(boolean, text) FROM anon;
REVOKE ALL ON FUNCTION public.publish_course_version(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_changed_since_completion(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_org_changed_since_completion(uuid) FROM anon;