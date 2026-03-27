-- Add retention settings to organizations table
ALTER TABLE public.organizations
ADD COLUMN audit_log_retention_days integer NOT NULL DEFAULT 90,
ADD COLUMN tamper_event_retention_days integer NOT NULL DEFAULT 90;

-- Create a function to delete old audit logs for an organization
CREATE OR REPLACE FUNCTION public.cleanup_expired_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
  org RECORD;
BEGIN
  FOR org IN SELECT id, audit_log_retention_days FROM public.organizations WHERE is_active = true
  LOOP
    WITH deleted AS (
      DELETE FROM public.audit_logs
      WHERE organization_id = org.id
        AND timestamp < now() - (org.audit_log_retention_days || ' days')::interval
      RETURNING id
    )
    SELECT deleted_count + COUNT(*) INTO deleted_count FROM deleted;
  END LOOP;
  
  RETURN deleted_count;
END;
$$;

-- Create a function to delete old tamper events for an organization
CREATE OR REPLACE FUNCTION public.cleanup_expired_tamper_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
  org RECORD;
BEGIN
  FOR org IN SELECT id, tamper_event_retention_days FROM public.organizations WHERE is_active = true
  LOOP
    WITH deleted AS (
      DELETE FROM public.tamper_events
      WHERE organization_id = org.id
        AND timestamp < now() - (org.tamper_event_retention_days || ' days')::interval
      RETURNING id
    )
    SELECT deleted_count + COUNT(*) INTO deleted_count FROM deleted;
  END LOOP;
  
  RETURN deleted_count;
END;
$$;

-- Create a combined cleanup function that can be called by edge function
CREATE OR REPLACE FUNCTION public.run_data_retention_cleanup()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_deleted integer;
  tamper_deleted integer;
BEGIN
  SELECT public.cleanup_expired_audit_logs() INTO audit_deleted;
  SELECT public.cleanup_expired_tamper_events() INTO tamper_deleted;
  
  RETURN json_build_object(
    'audit_logs_deleted', audit_deleted,
    'tamper_events_deleted', tamper_deleted,
    'executed_at', now()
  );
END;
$$;