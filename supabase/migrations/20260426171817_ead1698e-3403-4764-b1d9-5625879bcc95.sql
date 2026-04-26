
-- 1) Add avatar_url to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2) Set default level to 100 for students
ALTER TABLE public.profiles
  ALTER COLUMN level SET DEFAULT 100;

-- 3) Update handle_new_user() to:
--    - assign a default level of 100 for students
--    - capture department_id from signup metadata
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
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');

  -- Department (optional — only if user picked one)
  BEGIN
    v_dept := NULLIF(NEW.raw_user_meta_data->>'department_id','')::uuid;
  EXCEPTION WHEN others THEN
    v_dept := NULL;
  END;

  -- Students automatically start at level 100
  v_level := CASE WHEN v_role = 'student' THEN 100 ELSE NULL END;

  INSERT INTO public.profiles (id, full_name, phone, matric_number, department_id, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'matric_number',
    v_dept,
    v_level
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$function$;

-- 4) Make sure the trigger exists (it should, but be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Storage bucket for avatars (public so we can render <img src> easily)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — each user folder = their auth.uid()
DROP POLICY IF EXISTS "Avatar images are publicly viewable" ON storage.objects;
CREATE POLICY "Avatar images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6) Seed Mountain Top University departments
INSERT INTO public.departments (code, name, faculty) VALUES
  ('ACC',  'Accounting',                         'College of Humanities, Management & Social Sciences'),
  ('BFN',  'Banking and Finance',                'College of Humanities, Management & Social Sciences'),
  ('BUS',  'Business Administration',            'College of Humanities, Management & Social Sciences'),
  ('ECO',  'Economics',                          'College of Humanities, Management & Social Sciences'),
  ('MCM',  'Mass Communication',                 'College of Humanities, Management & Social Sciences'),
  ('IRD',  'International Relations & Diplomacy','College of Humanities, Management & Social Sciences'),
  ('POL',  'Political Science',                  'College of Humanities, Management & Social Sciences'),
  ('LAN',  'Languages',                          'College of Humanities, Management & Social Sciences'),
  ('MUS',  'Music',                              'College of Humanities, Management & Social Sciences'),
  ('CSC',  'Computer Science',                   'College of Basic & Applied Sciences'),
  ('MTH',  'Mathematics',                        'College of Basic & Applied Sciences'),
  ('PHY',  'Physics with Electronics',           'College of Basic & Applied Sciences'),
  ('CHM',  'Industrial Chemistry',               'College of Basic & Applied Sciences'),
  ('BIO',  'Biological Sciences',                'College of Basic & Applied Sciences'),
  ('MCB',  'Microbiology',                       'College of Basic & Applied Sciences'),
  ('BCH',  'Biochemistry',                       'College of Basic & Applied Sciences'),
  ('GEO',  'Geosciences',                        'College of Basic & Applied Sciences'),
  ('NSC',  'Nursing Science',                    'College of Basic & Applied Sciences'),
  ('FAA',  'Fine and Applied Arts',              'College of Humanities, Management & Social Sciences')
ON CONFLICT (code) DO NOTHING;
