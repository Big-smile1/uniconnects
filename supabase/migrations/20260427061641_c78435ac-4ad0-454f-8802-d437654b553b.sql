
-- Allow public (anon + authenticated) read on departments so the signup
-- form can populate its dropdown before the user is authenticated.
CREATE POLICY "departments_read_public"
  ON public.departments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Remove duplicate Mass Communication row (keep MAC, delete MCM)
DELETE FROM public.departments WHERE code = 'MCM';
