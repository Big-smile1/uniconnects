
-- Compute grade on results insert/update
DROP TRIGGER IF EXISTS trg_results_compute_grade ON public.results;
CREATE TRIGGER trg_results_compute_grade
BEFORE INSERT OR UPDATE OF ca_score, exam_score ON public.results
FOR EACH ROW EXECUTE FUNCTION public.compute_grade();

-- Set total on results
CREATE OR REPLACE FUNCTION public.set_result_total() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.total := COALESCE(NEW.ca_score,0) + COALESCE(NEW.exam_score,0);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_results_set_total ON public.results;
CREATE TRIGGER trg_results_set_total
BEFORE INSERT OR UPDATE OF ca_score, exam_score ON public.results
FOR EACH ROW EXECUTE FUNCTION public.set_result_total();

-- Queue parent emails when result becomes admin_approved
DROP TRIGGER IF EXISTS trg_results_enqueue_emails ON public.results;
CREATE TRIGGER trg_results_enqueue_emails
AFTER INSERT OR UPDATE OF status ON public.results
FOR EACH ROW EXECUTE FUNCTION public.enqueue_result_emails();

-- Handle new user signup: create profile, role, parent links
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Link existing pending parent_links rows when a matching parent signs up
DROP TRIGGER IF EXISTS on_auth_user_link_parent ON auth.users;
CREATE TRIGGER on_auth_user_link_parent
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_parent_on_user_email();
