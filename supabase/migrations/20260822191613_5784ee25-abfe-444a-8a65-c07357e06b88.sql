INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u WHERE u.email = 'ariadne@local'
ON CONFLICT (user_id, role) DO NOTHING;