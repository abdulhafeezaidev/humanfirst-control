-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  target text NOT NULL,
  target_id uuid,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can only view audit logs (no insert/update/delete from client)
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create function to log audit events (called by triggers)
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_actor_id uuid,
  p_action text,
  p_target text,
  p_target_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, target, target_id, metadata)
  VALUES (p_actor_id, p_action, p_target, p_target_id, p_metadata);
END;
$$;

-- Trigger function for exam_policies
CREATE OR REPLACE FUNCTION public.audit_exam_policy_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      NEW.created_by,
      'exam_policy_created',
      'exam_policies',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'is_active', NEW.is_active)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if is_active changed (activation/deactivation)
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      PERFORM create_audit_log(
        auth.uid(),
        CASE WHEN NEW.is_active THEN 'exam_policy_activated' ELSE 'exam_policy_deactivated' END,
        'exam_policies',
        NEW.id,
        jsonb_build_object('title', NEW.title)
      );
    ELSE
      PERFORM create_audit_log(
        auth.uid(),
        'exam_policy_updated',
        'exam_policies',
        NEW.id,
        jsonb_build_object('title', NEW.title, 'changes', 'Policy details modified')
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      auth.uid(),
      'exam_policy_deleted',
      'exam_policies',
      OLD.id,
      jsonb_build_object('title', OLD.title)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for ai_services
CREATE OR REPLACE FUNCTION public.audit_ai_service_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_blocked_during_exam IS DISTINCT FROM NEW.is_blocked_during_exam THEN
    PERFORM create_audit_log(
      auth.uid(),
      CASE WHEN NEW.is_blocked_during_exam THEN 'ai_service_blocked' ELSE 'ai_service_unblocked' END,
      'ai_services',
      NEW.id,
      jsonb_build_object('name', NEW.name, 'category', NEW.category)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for enforcement_config
CREATE OR REPLACE FUNCTION public.audit_enforcement_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM create_audit_log(
      auth.uid(),
      'enforcement_status_changed',
      'enforcement_config',
      NEW.id,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER audit_exam_policies
  AFTER INSERT OR UPDATE OR DELETE ON public.exam_policies
  FOR EACH ROW EXECUTE FUNCTION public.audit_exam_policy_changes();

CREATE TRIGGER audit_ai_services
  AFTER UPDATE ON public.ai_services
  FOR EACH ROW EXECUTE FUNCTION public.audit_ai_service_changes();

CREATE TRIGGER audit_enforcement_config
  AFTER UPDATE ON public.enforcement_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_enforcement_changes();

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_target ON public.audit_logs(target);