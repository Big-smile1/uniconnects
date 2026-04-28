CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_dept uuid;
  v_level int;
  v_matric text;
  v_phone text;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');

  BEGIN
    v_dept := NULLIF(NEW.raw_user_meta_data->>'department_id','')::uuid;
  EXCEPTION WHEN others THEN
    v_dept := NULL;
  END;

  v_matric := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'matric_number','')), '');
  v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone','')), '');

  v_level := CASE WHEN v_role = 'student' THEN 100 ELSE NULL END;

  INSERT INTO public.profiles (id, full_name, phone, matric_number, department_id, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_phone,
    v_matric,
    v_dept,
    v_level
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$function$;

-- Ensure the trigger is actually attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();