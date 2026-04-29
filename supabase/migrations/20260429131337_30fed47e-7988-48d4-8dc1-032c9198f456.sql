-- Make student courses page read-only by removing self-enrollment ability
DROP POLICY IF EXISTS enrollments_self_insert ON public.enrollments;

-- Allow lecturers to manage enrollments for courses they teach (optional, helpful)
CREATE POLICY enrollments_lecturer_manage
  ON public.enrollments
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = enrollments.course_id AND c.lecturer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = enrollments.course_id AND c.lecturer_id = auth.uid()));

-- Lock down parent_links so students can ONLY read theirs; admins manage
DROP POLICY IF EXISTS parent_links_student_manage ON public.parent_links;
-- parent_links_student_read remains (already exists)

-- Update handle_new_user to also insert primary + optional secondary guardian
-- from signup metadata (parent1_name/phone/email/relationship, parent2_*)
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
  v_p1_name text;
  v_p1_phone text;
  v_p1_email text;
  v_p1_rel  text;
  v_p2_name text;
  v_p2_phone text;
  v_p2_email text;
  v_p2_rel  text;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');

  BEGIN
    v_dept := NULLIF(NEW.raw_user_meta_data->>'department_id','')::uuid;
  EXCEPTION WHEN others THEN
    v_dept := NULL;
  END;

  v_matric := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'matric_number','')), '');
  v_phone  := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone','')), '');
  v_level  := CASE WHEN v_role = 'student' THEN 100 ELSE NULL END;

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

  -- Parent/guardian links (students only)
  IF v_role = 'student' THEN
    v_p1_name  := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'parent1_name','')), '');
    v_p1_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'parent1_phone','')), '');
    v_p1_email := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'parent1_email','')), '');
    v_p1_rel   := COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'parent1_relationship','')), ''), 'guardian');

    IF v_p1_name IS NOT NULL AND v_p1_phone IS NOT NULL THEN
      INSERT INTO public.parent_links (student_id, parent_name, parent_phone, parent_email, relationship, is_primary)
      VALUES (NEW.id, v_p1_name, v_p1_phone, v_p1_email, v_p1_rel, true);
    END IF;

    v_p2_name  := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'parent2_name','')), '');
    v_p2_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'parent2_phone','')), '');
    v_p2_email := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'parent2_email','')), '');
    v_p2_rel   := COALESCE(NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'parent2_relationship','')), ''), 'guardian');

    IF v_p2_name IS NOT NULL AND v_p2_phone IS NOT NULL THEN
      INSERT INTO public.parent_links (student_id, parent_name, parent_phone, parent_email, relationship, is_primary)
      VALUES (NEW.id, v_p2_name, v_p2_phone, v_p2_email, v_p2_rel, false);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;