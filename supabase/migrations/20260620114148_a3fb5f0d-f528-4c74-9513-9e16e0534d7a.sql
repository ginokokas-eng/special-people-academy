create or replace function public.get_course_competency_assessors(_course_id uuid)
returns table(full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select sp.full_name
  from public.course_trainers ct
  join public.staff_profiles sp on sp.id = ct.staff_id
  where ct.course_id = _course_id
    and ct.can_sign_off = true
    and sp.is_active = true
    and sp.full_name is not null
  order by sp.full_name;
$$;

grant execute on function public.get_course_competency_assessors(uuid) to authenticated;