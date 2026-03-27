/**
 * useAssignmentSession Hook
 * 
 * Layer 1 - Session Anchor: START
 * Creates and monitors an assignment session, logging session start and managing session state.
 * Coordinates with the Windows Agent for foreground window monitoring.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AssignmentSession {
  id: string;
  student_id: string;
  policy_id: string;
  assignment_id: string;
  started_at: string;
  status: 'active' | 'submitted' | 'expired' | 'abandoned';
  focus_loss_count: number;
  focus_loss_seconds: number;
  blocked_domain_count: number;
  large_paste_count: number;
}

export function useAssignmentSession(assignmentId?: string, policyId?: string) {
  const [session, setSession] = useState<AssignmentSession | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  /**
   * Initialize session when assignment starts
   */
  const initializeSession = useCallback(async () => {
    if (!assignmentId || !policyId) {
      setSessionError('Missing assignmentId or policyId');
      return null;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSessionError('User not authenticated');
        return null;
      }

      // Create assignment session record
      const { data, error } = await (supabase
        .from('assignment_sessions' as any)
        .insert({
          student_id: user.id,
          policy_id: policyId,
          assignment_id: assignmentId,
          status: 'active',
          environment: typeof window !== 'undefined' && window.humanfirstDesktop ? 'desktop' : 'web',
          user_agent: navigator.userAgent,
          ip_address: null, // Will be set by backend
        })
        .select()
        .single() as any);

      if (error) {
        setSessionError(`Failed to create session: ${error.message}`);
        return null;
      }

      if (data) {
        sessionIdRef.current = data.id;
        setSession(data);
        setIsSessionActive(true);

        // Log session start event to assignment_risk_events
        await (supabase
          .from('assignment_risk_events' as any)
          .insert({
            user_id: user.id,
            assignment_id: assignmentId,
            event_type: 'session_start',
            session_id: data.id,
            metadata: {
              policy_id: policyId,
              started_at: new Date().toISOString(),
            },
          }) as any);

        console.log('[Session] Assignment session started:', data.id);
        return data;
      }

      return null;
    } catch (err: any) {
      setSessionError(err?.message || 'Failed to initialize session');
      console.error('[Session] Error:', err);
      return null;
    }
  }, [assignmentId, policyId]);

  /**
   * Update session metrics (called from various monitoring hooks)
   */
  const updateSessionMetric = useCallback(
    async (metric: keyof Omit<AssignmentSession, 'id' | 'student_id' | 'policy_id' | 'assignment_id' | 'started_at' | 'status'>, value: number | string) => {
      if (!sessionIdRef.current) return;

      try {
        await (supabase
          .from('assignment_sessions' as any)
          .update({ [metric]: value })
          .eq('id', sessionIdRef.current) as any);
      } catch (err) {
        console.error(`[Session] Failed to update ${metric}:`, err);
      }
    },
    [],
  );

  /**
   * Increment session metric (for counters)
   */
  const incrementSessionMetric = useCallback(
    async (metric: 'focus_loss_count' | 'blocked_domain_count' | 'large_paste_count', deltaSeconds?: number) => {
      if (!sessionIdRef.current || !session) return;

      try {
        const currentValue = session[metric] || 0;
        await updateSessionMetric(metric, currentValue + 1);

        // Also update focus_loss_seconds if provided
        if (metric === 'focus_loss_count' && deltaSeconds) {
          const currentSeconds = session.focus_loss_seconds || 0;
          await updateSessionMetric('focus_loss_seconds', currentSeconds + deltaSeconds);
        }

        setSession((prev) =>
          prev ? { ...prev, [metric]: currentValue + 1 } : null,
        );
      } catch (err) {
        console.error(`[Session] Failed to increment ${metric}:`, err);
      }
    },
    [session, updateSessionMetric],
  );

  /**
   * Log app focus loss event
   */
  const logFocusLoss = useCallback(
    async (duration_seconds: number, process_name: string) => {
      if (!sessionIdRef.current || !assignmentId) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Log the event
        await (supabase
          .from('assignment_risk_events' as any)
          .insert({
            user_id: user.id,
            assignment_id: assignmentId,
            event_type: 'app_focus_lost',
            session_id: sessionIdRef.current,
            process_name,
            severity_level: duration_seconds > 300 ? 'HIGH' : duration_seconds > 60 ? 'MEDIUM' : 'LOW',
            metadata: {
              duration_seconds,
              returned_at: new Date().toISOString(),
            },
          }) as any);

        // Update session counter
        await incrementSessionMetric('focus_loss_count', duration_seconds);
      } catch (err) {
        console.error('[Session] Failed to log focus loss:', err);
      }
    },
    [assignmentId, incrementSessionMetric],
  );

  /**
   * Submit assignment session
   */
  const submitSession = useCallback(
    async (submission_url?: string, file_name?: string) => {
      if (!sessionIdRef.current) return;

      try {
        // Update session status to submitted
        const { error } = await (supabase
          .from('assignment_sessions' as any)
          .update({
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            submission_url,
            file_name,
          })
          .eq('id', sessionIdRef.current) as any);

        if (error) {
          console.error('[Session] Failed to submit:', error);
          return false;
        }

        setIsSessionActive(false);

        // Log submission event
        const { data: { user } } = await supabase.auth.getUser();
        if (user && assignmentId) {
          await (supabase
            .from('assignment_risk_events' as any)
            .insert({
              user_id: user.id,
              assignment_id: assignmentId,
              event_type: 'session_submitted',
              session_id: sessionIdRef.current,
              metadata: {
                submitted_at: new Date().toISOString(),
                submission_url,
                file_name,
              },
            }) as any);
        }

        console.log('[Session] Assignment submitted successfully');
        return true;
      } catch (err) {
        console.error('[Session] Error submitting:', err);
        return false;
      }
    },
    [assignmentId],
  );

  /**
   * Abandon session (cleanup)
   */
  const abandonSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      await (supabase
        .from('assignment_sessions' as any)
        .update({ status: 'abandoned' })
        .eq('id', sessionIdRef.current) as any);

      setIsSessionActive(false);
      console.log('[Session] Session abandoned');
    } catch (err) {
      console.error('[Session] Error abandoning session:', err);
    }
  }, []);

  /**
   * Initialize on mount if assignmentId and policyId provided
   */
  useEffect(() => {
    if (assignmentId && policyId) {
      initializeSession();
    }

    // Cleanup on unmount - abandon session if still active
    return () => {
      if (isSessionActive) {
        abandonSession();
      }
    };
  }, [assignmentId, policyId, isSessionActive, initializeSession, abandonSession]);

  return {
    session,
    sessionId: sessionIdRef.current,
    isSessionActive,
    sessionError,
    initializeSession,
    updateSessionMetric,
    incrementSessionMetric,
    logFocusLoss,
    submitSession,
    abandonSession,
  };
}
