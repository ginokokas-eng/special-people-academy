REVOKE EXECUTE ON FUNCTION public.refresh_lesson_available_langs(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_refresh_available_langs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_blocks_refresh_available_langs() FROM anon, authenticated;