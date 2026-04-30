-- 1. Make parent_email required
UPDATE public.parent_links SET parent_email = parent_phone || '@unknown.local' WHERE parent_email IS NULL OR parent_email = '';
ALTER TABLE public.parent_links ALTER COLUMN parent_email SET NOT NULL;

-- 2. Index to speed up email lookups
CREATE INDEX IF NOT EXISTS idx_parent_links_email_lower ON public.parent_links (lower(parent_email));

-- 3. Trigger: when any user is created or email updated, link them to matching parent_links rows
CREATE OR REPLACE FUNCTION public.link_parent_on_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.parent_links
       SET parent_user_id = NEW.id
     WHERE parent_user_id IS NULL
       AND lower(parent_email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_parent_on_user_insert ON auth.users;
CREATE TRIGGER link_parent_on_user_insert
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_parent_on_user_email();

DROP TRIGGER IF EXISTS link_parent_on_user_update ON auth.users;
CREATE TRIGGER link_parent_on_user_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (NEW.email IS DISTINCT FROM OLD.email)
EXECUTE FUNCTION public.link_parent_on_user_email();

-- Backfill existing users
UPDATE public.parent_links pl
   SET parent_user_id = u.id
  FROM auth.users u
 WHERE pl.parent_user_id IS NULL
   AND lower(pl.parent_email) = lower(u.email);

-- 4. Allow parents to read profiles of their linked students
CREATE POLICY profiles_parent_read_children
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_links pl
     WHERE pl.student_id = profiles.id
       AND pl.parent_user_id = auth.uid()
  )
);

-- 5. Email outbox queue
CREATE TABLE public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL DEFAULT 'result-published',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  student_id UUID,
  result_id UUID
);

CREATE INDEX idx_email_outbox_pending ON public.email_outbox (status, created_at) WHERE status = 'pending';

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_outbox_admin_all
ON public.email_outbox
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Trigger: when result becomes admin_approved, enqueue emails for every linked guardian
CREATE OR REPLACE FUNCTION public.enqueue_result_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS enqueue_result_emails_trigger ON public.results;
CREATE TRIGGER enqueue_result_emails_trigger
AFTER INSERT OR UPDATE OF status ON public.results
FOR EACH ROW EXECUTE FUNCTION public.enqueue_result_emails();

-- 7. Allow admin INSERTs into notification_log from the trigger context (already covered) — and make sure parents can read announcements (already covered).
