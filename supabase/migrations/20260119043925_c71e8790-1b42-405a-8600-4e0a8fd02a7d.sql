-- Rate limiting table for API and action throttling
CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- user_id, ip, or org_id
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('user', 'ip', 'organization')),
    action TEXT NOT NULL, -- e.g., 'api_call', 'login_attempt', 'policy_create'
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    request_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (identifier, identifier_type, action, window_start)
);

-- Index for efficient lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (identifier, identifier_type, action, window_start);

-- Auto-cleanup old rate limit records (older than 1 hour)
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits (window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only backend can manage rate limits (no direct user access)
CREATE POLICY "Rate limits are system managed" ON public.rate_limits
    FOR ALL USING (false);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_identifier TEXT,
    p_identifier_type TEXT,
    p_action TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_current_count INTEGER;
BEGIN
    -- Calculate window start (truncate to window boundary)
    v_window_start := date_trunc('minute', now());
    
    -- Try to get current count
    SELECT request_count INTO v_current_count
    FROM public.rate_limits
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND action = p_action
      AND window_start = v_window_start;
    
    IF v_current_count IS NULL THEN
        -- First request in window
        INSERT INTO public.rate_limits (identifier, identifier_type, action, window_start, request_count)
        VALUES (p_identifier, p_identifier_type, p_action, v_window_start, 1)
        ON CONFLICT (identifier, identifier_type, action, window_start)
        DO UPDATE SET request_count = rate_limits.request_count + 1
        RETURNING request_count INTO v_current_count;
    ELSE
        -- Increment counter
        UPDATE public.rate_limits
        SET request_count = request_count + 1
        WHERE identifier = p_identifier
          AND identifier_type = p_identifier_type
          AND action = p_action
          AND window_start = v_window_start
        RETURNING request_count INTO v_current_count;
    END IF;
    
    -- Return true if under limit, false if exceeded
    RETURN v_current_count <= p_limit;
END;
$$;

-- Enhanced audit log function with more metadata
CREATE OR REPLACE FUNCTION public.create_detailed_audit_log(
    p_action TEXT,
    p_actor_id UUID,
    p_target TEXT,
    p_target_id TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
    v_org_id UUID;
    v_enhanced_metadata JSONB;
BEGIN
    -- Get actor's organization
    SELECT organization_id INTO v_org_id
    FROM public.profiles
    WHERE user_id = p_actor_id;
    
    -- Enhance metadata with additional context
    v_enhanced_metadata := p_metadata || jsonb_build_object(
        'severity', p_severity,
        'timestamp_ms', extract(epoch from now()) * 1000
    );
    
    -- Insert audit log
    INSERT INTO public.audit_logs (action, actor_id, target, target_id, metadata, organization_id)
    VALUES (p_action, p_actor_id, p_target, p_target_id, v_enhanced_metadata, v_org_id)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Function to get organization metrics for fault containment
CREATE OR REPLACE FUNCTION public.get_organization_health(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_active_policies INTEGER;
    v_tamper_events_24h INTEGER;
    v_error_rate FLOAT;
BEGIN
    -- Count active policies
    SELECT COUNT(*) INTO v_active_policies
    FROM public.exam_policies
    WHERE organization_id = p_org_id AND is_active = true;
    
    -- Count tamper events in last 24 hours
    SELECT COUNT(*) INTO v_tamper_events_24h
    FROM public.tamper_events
    WHERE organization_id = p_org_id 
      AND timestamp > now() - interval '24 hours';
    
    -- Build result
    v_result := jsonb_build_object(
        'organization_id', p_org_id,
        'active_policies', v_active_policies,
        'tamper_events_24h', v_tamper_events_24h,
        'health_check_at', now(),
        'status', CASE 
            WHEN v_tamper_events_24h > 1000 THEN 'degraded'
            ELSE 'healthy'
        END
    );
    
    RETURN v_result;
END;
$$;

-- Cleanup function for rate limits (to be called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.rate_limits
    WHERE window_start < now() - interval '1 hour';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;