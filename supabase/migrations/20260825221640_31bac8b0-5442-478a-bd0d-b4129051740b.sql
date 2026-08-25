REVOKE EXECUTE ON FUNCTION public.is_platform_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin_of_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_licence_seat(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_licence(uuid, uuid, uuid, integer, timestamptz, timestamptz, text, text, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_seat(uuid, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_seat(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_expired_invitation_seats() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_platform_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin_of_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_licence_seat(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_licence(uuid, uuid, uuid, integer, timestamptz, timestamptz, text, text, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_seat(uuid, uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_seat(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_invitation_seats() TO authenticated, service_role;
