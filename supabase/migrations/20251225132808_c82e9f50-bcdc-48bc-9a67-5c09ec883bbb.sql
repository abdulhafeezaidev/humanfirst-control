-- Create a function to get the currently active exam policy based on time
CREATE OR REPLACE FUNCTION public.get_active_exam_policy()
RETURNS SETOF exam_policies
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.exam_policies
  WHERE is_active = true
    AND now() >= start_time
    AND now() <= end_time
  ORDER BY start_time DESC
  LIMIT 1
$$;

-- Create a function to check if any exam is currently active
CREATE OR REPLACE FUNCTION public.is_exam_mode_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.exam_policies
    WHERE is_active = true
      AND now() >= start_time
      AND now() <= end_time
  )
$$;