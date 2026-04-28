-- Allow a lecturer to claim a course that:
--   * has no lecturer yet (lecturer_id IS NULL)
--   * belongs to their own department
-- They can only set lecturer_id to themselves, and only update courses they
-- already own (to release a course back, set it back to NULL on themselves).

CREATE POLICY "courses_lecturer_claim_unassigned"
ON public.courses
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'lecturer'::app_role)
  AND (
    lecturer_id IS NULL
    OR lecturer_id = auth.uid()
  )
  AND department_id IS NOT DISTINCT FROM (
    SELECT department_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'lecturer'::app_role)
  AND (
    lecturer_id IS NULL
    OR lecturer_id = auth.uid()
  )
  AND department_id IS NOT DISTINCT FROM (
    SELECT department_id FROM public.profiles WHERE id = auth.uid()
  )
);