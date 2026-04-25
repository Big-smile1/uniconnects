
-- Allow admins to insert into notification_log (server function uses service role anyway, but useful)
CREATE POLICY "notification_log_admin_insert" ON public.notification_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Students can read their own notification history
CREATE POLICY "notification_log_student_read" ON public.notification_log
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Parents can read notifications for their children
CREATE POLICY "notification_log_parent_read" ON public.notification_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_links pl
      WHERE pl.student_id = notification_log.student_id
        AND pl.parent_user_id = auth.uid()
    )
  );

-- Allow students to see their own results in any state (so they can see "pending")
CREATE POLICY "results_student_read_all_own" ON public.results
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Helper: get current user's primary role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_results_student ON public.results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_course ON public.results(course_id);
CREATE INDEX IF NOT EXISTS idx_results_status ON public.results(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_student ON public.parent_links(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON public.parent_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_student ON public.notification_log(student_id);
