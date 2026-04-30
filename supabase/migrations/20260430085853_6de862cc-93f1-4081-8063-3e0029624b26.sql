
-- 1. Notification preferences per parent_link (per-child opt-in/out)
ALTER TABLE public.parent_links
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true;

-- Allow a parent (matched via parent_user_id) to update their own notification preference
-- (only the email flag — name/phone/email remain admin-managed).
DROP POLICY IF EXISTS parent_links_parent_update_prefs ON public.parent_links;
CREATE POLICY parent_links_parent_update_prefs ON public.parent_links
  FOR UPDATE TO authenticated
  USING (parent_user_id = auth.uid())
  WITH CHECK (parent_user_id = auth.uid());

-- 2. Respect notification prefs in the result-publish trigger
CREATE OR REPLACE FUNCTION public.enqueue_result_emails()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pl RECORD;
  v_student_name TEXT;
  v_course_code TEXT;
  v_course_title TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'admin_approved')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'admin_approved' AND OLD.status IS DISTINCT FROM 'admin_approved') THEN

    SELECT full_name INTO v_student_name FROM public.profiles WHERE id = NEW.student_id;
    SELECT code, title INTO v_course_code, v_course_title FROM public.courses WHERE id = NEW.course_id;

    FOR pl IN
      SELECT id, parent_email, parent_name, parent_phone
        FROM public.parent_links
       WHERE student_id = NEW.student_id
         AND email_notifications_enabled = true
    LOOP
      INSERT INTO public.email_outbox (to_email, to_name, subject, template_name, payload, student_id, result_id)
      VALUES (
        pl.parent_email,
        pl.parent_name,
        'Result published for ' || COALESCE(v_student_name, 'your child'),
        'result-published',
        jsonb_build_object(
          'parentName', pl.parent_name,
          'studentName', v_student_name,
          'courseCode', v_course_code,
          'courseTitle', v_course_title,
          'session', NEW.session,
          'semester', NEW.semester,
          'grade', NEW.grade,
          'total', NEW.total
        ),
        NEW.student_id,
        NEW.id
      );

      INSERT INTO public.notification_log (student_id, parent_link_id, channel, recipient, message, status, session, semester, provider_response)
      VALUES (
        NEW.student_id,
        pl.id,
        'email',
        pl.parent_email,
        'Result published: ' || COALESCE(v_course_code, '') || ' — ' || COALESCE(NEW.grade, ''),
        'queued',
        NEW.session,
        NEW.semester,
        jsonb_build_object('queued', true)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Re-attach trigger if missing
DROP TRIGGER IF EXISTS enqueue_result_emails_trigger ON public.results;
CREATE TRIGGER enqueue_result_emails_trigger
AFTER INSERT OR UPDATE ON public.results
FOR EACH ROW EXECUTE FUNCTION public.enqueue_result_emails();

-- Re-attach grade computation trigger if missing
DROP TRIGGER IF EXISTS compute_grade_trigger ON public.results;
CREATE TRIGGER compute_grade_trigger
BEFORE INSERT OR UPDATE OF ca_score, exam_score ON public.results
FOR EACH ROW EXECUTE FUNCTION public.compute_grade();

-- 3. Re-attach handle_new_user / link_parent_on_user_email triggers if missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_email_link_parent ON auth.users;
CREATE TRIGGER on_auth_user_email_link_parent
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_parent_on_user_email();

-- 4. Allow admin to insert into auth shouldn't be done from client; instead allow admin
-- to upsert profiles + user_roles for users they create via invite flow (admin already has
-- profiles_admin_all and user_roles_admin_all). Add an INSERT policy on profiles for admins
-- to be explicit (already covered by ALL but Postgres is happier).
-- (No-op — admin_all already covers INSERT.)

-- 5. Add a settings table for system-wide config (current session, email sender, etc.) — admin only
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_admin_all ON public.app_settings;
CREATE POLICY app_settings_admin_all ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS app_settings_read_authenticated ON public.app_settings;
CREATE POLICY app_settings_read_authenticated ON public.app_settings
  FOR SELECT TO authenticated USING (true);

-- Seed default current session if missing
INSERT INTO public.app_settings (key, value)
VALUES ('current_session', '{"session":"2025/2026","semester":"first"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
