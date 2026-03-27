-- Enhanced audit log function that automatically includes actor role
-- This ensures every log entry has the actor's role at time of action

CREATE OR REPLACE FUNCTION public.create_audit_log_with_role(
  p_actor_id uuid,
  p_action text,
  p_target text,
  p_target_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_org_id UUID;
  v_actor_role app_role;
  v_enhanced_metadata JSONB;
BEGIN
  -- Get actor's role (at time of action - critical for audit)
  SELECT role INTO v_actor_role
  FROM public.user_roles
  WHERE user_id = p_actor_id;

  -- Get actor's organization
  SELECT organization_id INTO v_org_id
  FROM public.profiles
  WHERE user_id = p_actor_id;
  
  -- Enhance metadata with role and timestamp
  v_enhanced_metadata := p_metadata || jsonb_build_object(
    'actor_role', COALESCE(v_actor_role::text, 'unknown'),
    'timestamp_ms', extract(epoch from now()) * 1000,
    'ip_address', 'server-side' -- Placeholder for future enhancement
  );
  
  -- Insert immutable audit log
  INSERT INTO public.audit_logs (actor_id, action, target, target_id, metadata, organization_id)
  VALUES (p_actor_id, p_action, p_target, p_target_id, v_enhanced_metadata, v_org_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Update the exam_policies trigger to use enhanced logging
CREATE OR REPLACE FUNCTION audit_exam_policies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  -- Get the actor (created_by for INSERT, auth.uid() for UPDATE/DELETE)
  IF TG_OP = 'INSERT' THEN
    v_actor_id := NEW.created_by;
  ELSE
    v_actor_id := auth.uid();
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log_with_role(
      v_actor_id,
      'exam_policy_created',
      'exam_policies',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title, 
        'is_active', NEW.is_active,
        'policy_type', NEW.policy_type,
        'enforcement_level', NEW.enforcement_level,
        'assignment_type', NEW.assignment_type
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      PERFORM create_audit_log_with_role(
        v_actor_id,
        CASE WHEN NEW.is_active THEN 'exam_policy_activated' ELSE 'exam_policy_deactivated' END,
        'exam_policies',
        NEW.id,
        jsonb_build_object('title', NEW.title, 'policy_type', NEW.policy_type)
      );
    ELSE
      PERFORM create_audit_log_with_role(
        v_actor_id,
        'exam_policy_updated',
        'exam_policies',
        NEW.id,
        jsonb_build_object(
          'title', NEW.title, 
          'changes', jsonb_build_object(
            'old_start_time', OLD.start_time,
            'new_start_time', NEW.start_time,
            'old_end_time', OLD.end_time,
            'new_end_time', NEW.end_time,
            'blocked_categories_changed', OLD.blocked_categories IS DISTINCT FROM NEW.blocked_categories
          )
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log_with_role(
      v_actor_id,
      'exam_policy_deleted',
      'exam_policies',
      OLD.id,
      jsonb_build_object('title', OLD.title, 'policy_type', OLD.policy_type)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update AI services trigger
CREATE OR REPLACE FUNCTION audit_ai_services()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_blocked_during_exam IS DISTINCT FROM NEW.is_blocked_during_exam THEN
    PERFORM create_audit_log_with_role(
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

-- Update enforcement config trigger
CREATE OR REPLACE FUNCTION audit_enforcement_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM create_audit_log_with_role(
        auth.uid(),
        'enforcement_status_changed',
        'enforcement_config',
        NEW.id,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
    
    -- Log pilot mode changes
    IF OLD.pilot_mode IS DISTINCT FROM NEW.pilot_mode THEN
      PERFORM create_audit_log_with_role(
        auth.uid(),
        CASE WHEN NEW.pilot_mode THEN 'pilot_mode_enabled' ELSE 'pilot_mode_disabled' END,
        'enforcement_config',
        NEW.id,
        jsonb_build_object('organization_id', NEW.organization_id)
      );
    END IF;
    
    -- Log share settings changes
    IF OLD.share_enabled IS DISTINCT FROM NEW.share_enabled THEN
      PERFORM create_audit_log_with_role(
        auth.uid(),
        CASE WHEN NEW.share_enabled THEN 'policy_sharing_enabled' ELSE 'policy_sharing_disabled' END,
        'enforcement_config',
        NEW.id,
        jsonb_build_object('organization_id', NEW.organization_id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add function for frontend to log custom actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_target TEXT,
  p_target_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_log_id UUID;
BEGIN
  v_actor_id := auth.uid();
  
  -- Only admins can log actions
  IF NOT (is_super_admin(v_actor_id) OR has_role(v_actor_id, 'admin')) THEN
    RAISE EXCEPTION 'Only administrators can log actions';
  END IF;
  
  v_log_id := create_audit_log_with_role(
    v_actor_id,
    p_action,
    p_target,
    p_target_id::uuid,
    p_metadata
  );
  
  RETURN v_log_id;
END;
$$;

-- Create a view for easier querying with role info extracted
CREATE OR REPLACE VIEW public.audit_logs_with_role AS
SELECT 
  al.id,
  al.actor_id,
  al.action,
  al.target,
  al.target_id,
  al.timestamp,
  al.organization_id,
  al.metadata,
  al.metadata->>'actor_role' as actor_role,
  p.full_name as actor_name,
  p.email as actor_email
FROM public.audit_logs al
LEFT JOIN public.profiles p ON p.user_id = al.actor_id;

-- Grant access to the view for admins
GRANT SELECT ON public.audit_logs_with_role TO authenticated;