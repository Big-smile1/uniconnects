
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'lecturer', 'student', 'parent');
CREATE TYPE public.result_status AS ENUM ('draft', 'submitted', 'hod_approved', 'admin_approved', 'rejected');

-- Departments
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  faculty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  matric_number TEXT UNIQUE,
  phone TEXT,
  level INT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- has_role helper (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  credit_units INT NOT NULL DEFAULT 3,
  semester TEXT NOT NULL CHECK (semester IN ('first', 'second')),
  level INT NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  lecturer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session TEXT NOT NULL, -- e.g. 2024/2025
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id, session)
);

-- Results
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('first', 'second')),
  ca_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (ca_score >= 0 AND ca_score <= 40),
  exam_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (exam_score >= 0 AND exam_score <= 70),
  total NUMERIC(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
  grade TEXT,
  grade_point NUMERIC(3,2),
  status public.result_status NOT NULL DEFAULT 'draft',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hod_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id)
);

-- Auto compute grade and point on insert/update
CREATE OR REPLACE FUNCTION public.compute_grade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  t NUMERIC := COALESCE(NEW.ca_score,0) + COALESCE(NEW.exam_score,0);
BEGIN
  IF t >= 70 THEN NEW.grade := 'A'; NEW.grade_point := 5.00;
  ELSIF t >= 60 THEN NEW.grade := 'B'; NEW.grade_point := 4.00;
  ELSIF t >= 50 THEN NEW.grade := 'C'; NEW.grade_point := 3.00;
  ELSIF t >= 45 THEN NEW.grade := 'D'; NEW.grade_point := 2.00;
  ELSIF t >= 40 THEN NEW.grade := 'E'; NEW.grade_point := 1.00;
  ELSE NEW.grade := 'F'; NEW.grade_point := 0.00;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_grade
BEFORE INSERT OR UPDATE OF ca_score, exam_score ON public.results
FOR EACH ROW EXECUTE FUNCTION public.compute_grade();

-- Parent links
CREATE TABLE public.parent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  relationship TEXT NOT NULL DEFAULT 'guardian',
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','students','lecturers','parents')),
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification log
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_link_id UUID REFERENCES public.parent_links(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms','email')),
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_response JSONB,
  session TEXT,
  semester TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- handle_new_user trigger: creates a profile + default 'student' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, matric_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'matric_number'
  );

  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== RLS =====
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Departments: read for any authenticated, manage by admin
CREATE POLICY "departments_read_authenticated" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_admin_all" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_lecturer_read_students" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'lecturer'));

-- user_roles: user reads their own roles, admin manages
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Courses: authenticated read; admin manage; lecturers can see their courses (covered by read-all)
CREATE POLICY "courses_read_authenticated" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "courses_admin_all" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enrollments
CREATE POLICY "enrollments_self_read" ON public.enrollments FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "enrollments_lecturer_read" ON public.enrollments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.lecturer_id = auth.uid()));
CREATE POLICY "enrollments_admin_all" ON public.enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "enrollments_self_insert" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

-- Results
CREATE POLICY "results_student_read_approved" ON public.results FOR SELECT TO authenticated
  USING (student_id = auth.uid() AND status = 'admin_approved');
CREATE POLICY "results_lecturer_manage" ON public.results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.lecturer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.lecturer_id = auth.uid()));
CREATE POLICY "results_admin_all" ON public.results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "results_parent_read_approved" ON public.results FOR SELECT TO authenticated
  USING (
    status = 'admin_approved' AND EXISTS (
      SELECT 1 FROM public.parent_links pl
      WHERE pl.student_id = results.student_id AND pl.parent_user_id = auth.uid()
    )
  );

-- Parent links
CREATE POLICY "parent_links_student_read" ON public.parent_links FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "parent_links_student_manage" ON public.parent_links FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "parent_links_admin_all" ON public.parent_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "parent_links_parent_read" ON public.parent_links FOR SELECT TO authenticated USING (parent_user_id = auth.uid());

-- Announcements
CREATE POLICY "announcements_read_authenticated" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_admin_all" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "announcements_lecturer_insert" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'lecturer') AND posted_by = auth.uid());

-- Notification log: admin only
CREATE POLICY "notification_log_admin" ON public.notification_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed a couple of departments for convenience
INSERT INTO public.departments (name, code, faculty) VALUES
 ('Computer Science', 'CSC', 'Science'),
 ('Electrical Engineering', 'EEE', 'Engineering'),
 ('Mass Communication', 'MAC', 'Arts');
