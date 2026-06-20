revoke execute on function public.get_course_competency_assessors(uuid) from public;
revoke execute on function public.get_course_competency_assessors(uuid) from anon;
grant execute on function public.get_course_competency_assessors(uuid) to authenticated;