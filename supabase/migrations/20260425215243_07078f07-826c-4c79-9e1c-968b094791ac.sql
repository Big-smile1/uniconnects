
CREATE OR REPLACE FUNCTION public.compute_grade()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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
