INSERT INTO public.user_roles (user_id, role)
SELECT u.id, COALESCE(NULLIF(u.raw_user_meta_data->>'role','')::public.app_role, 'student'::public.app_role)
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL;

INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;