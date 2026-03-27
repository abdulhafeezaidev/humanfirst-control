-- Add share token to enforcement_config for public policy sharing
ALTER TABLE public.enforcement_config 
ADD COLUMN share_token uuid DEFAULT gen_random_uuid(),
ADD COLUMN share_enabled boolean DEFAULT false;

-- Create function to get public policy summary (no auth required, uses share token)
CREATE OR REPLACE FUNCTION public.get_public_policy_summary(p_share_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if sharing is enabled with this token
  IF NOT EXISTS (
    SELECT 1 FROM public.enforcement_config 
    WHERE share_token = p_share_token AND share_enabled = true
  ) THEN
    RETURN json_build_object('error', 'Invalid or disabled share link');
  END IF;

  -- Build the policy summary
  SELECT json_build_object(
    'enforcement_status', (SELECT status FROM public.enforcement_config LIMIT 1),
    'active_policy', (
      SELECT json_build_object(
        'title', ep.title,
        'description', ep.description,
        'start_time', ep.start_time,
        'end_time', ep.end_time,
        'blocked_categories', ep.blocked_categories
      )
      FROM public.exam_policies ep
      WHERE ep.is_active = true 
        AND now() >= ep.start_time 
        AND now() <= ep.end_time
      LIMIT 1
    ),
    'upcoming_policies', (
      SELECT json_agg(json_build_object(
        'title', ep.title,
        'start_time', ep.start_time,
        'end_time', ep.end_time,
        'blocked_categories', ep.blocked_categories
      ))
      FROM public.exam_policies ep
      WHERE ep.is_active = true 
        AND ep.start_time > now()
    ),
    'blocked_services', (
      SELECT json_agg(json_build_object(
        'name', ai.name,
        'category', ai.category,
        'domains', ai.domains
      ))
      FROM public.ai_services ai
      WHERE ai.is_blocked_during_exam = true
    ),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to anon role for public access
GRANT EXECUTE ON FUNCTION public.get_public_policy_summary(uuid) TO anon;