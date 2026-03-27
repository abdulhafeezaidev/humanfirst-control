/**
 * Violation Logger Service
 * 
 * Centralized service for logging violations to the violation_logs table.
 * Applies event filtering automatically - only storable events are persisted.
 * Can be used from React components, services, and utilities.
 */

import { supabase } from '@/integrations/supabase/client';
import { isStorableEvent } from './eventFiltering';

export interface ViolationLogInput {
  student_id: string;
  policy_id: string;
  org_id: string;
  event_type: string;
  occurred_at?: Date | string;
  metadata?: Record<string, any>;
  session_id?: string;
}

export interface ViolationLogResult {
  success: boolean;
  error?: string;
  data?: any;
}

class ViolationLoggerService {
  /**
   * Log a violation to the violation_logs table
   * Only storable events will be persisted.
   */
  async logViolation(input: ViolationLogInput): Promise<ViolationLogResult> {
    try {
      // Apply event filter - discard non-storable events silently
      if (!isStorableEvent(input.event_type)) {
        return {
          success: true,
          error: `Event type "${input.event_type}" is not storable (filtered out)`,
        };
      }

      const payload = {
        student_id: input.student_id,
        policy_id: input.policy_id,
        org_id: input.org_id,
        event_type: input.event_type,
        occurred_at: input.occurred_at || new Date().toISOString(),
        metadata: input.metadata || {},
        session_id: input.session_id || null,
      };

      const { data, error } = await supabase
        .from('violation_logs' as any)
        .insert([payload] as any)
        .select();

      if (error) {
        console.error('[ViolationLogger] Insert error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (err: any) {
      console.error('[ViolationLogger] Unexpected error:', err);
      return {
        success: false,
        error: err?.message || 'Unknown error',
      };
    }
  }

  /**
   * Log multiple violations (batch insert)
   * Filters out non-storable events before insert.
   */
  async logViolations(inputs: ViolationLogInput[]): Promise<ViolationLogResult> {
    try {
      // Filter to storable events only
      const storableInputs = inputs.filter((input) => isStorableEvent(input.event_type));

      if (storableInputs.length === 0) {
        return {
          success: true,
          error: 'No storable events in batch (all filtered out)',
        };
      }

      const payloads = storableInputs.map((input) => ({
        student_id: input.student_id,
        policy_id: input.policy_id,
        org_id: input.org_id,
        event_type: input.event_type,
        occurred_at: input.occurred_at || new Date().toISOString(),
        metadata: input.metadata || {},
        session_id: input.session_id || null,
      }));

      const { data, error } = await supabase
        .from('violation_logs' as any)
        .insert(payloads as any)
        .select();

      if (error) {
        console.error('[ViolationLogger] Batch insert error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (err: any) {
      console.error('[ViolationLogger] Unexpected error:', err);
      return {
        success: false,
        error: err?.message || 'Unknown error',
      };
    }
  }

  /**
   * Mark the start of an assignment session
   */
  async logSessionStart(
    studentId: string,
    policyId: string,
    orgId: string,
    sessionId: string,
  ): Promise<ViolationLogResult> {
    return this.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: 'session_start',
      session_id: sessionId,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Mark the end of an assignment session
   */
  async logSessionEnd(
    studentId: string,
    policyId: string,
    orgId: string,
    sessionId: string,
    durationSeconds?: number,
  ): Promise<ViolationLogResult> {
    return this.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: 'session_end',
      session_id: sessionId,
      metadata: {
        duration_seconds: durationSeconds || 0,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log assignment submission
   */
  async logAssignmentSubmitted(
    studentId: string,
    policyId: string,
    orgId: string,
    sessionId?: string,
  ): Promise<ViolationLogResult> {
    return this.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: 'assignment_submitted',
      session_id: sessionId,
      metadata: {
        submitted_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Log blocked app attempt
   */
  async logBlockedAppKilled(
    studentId: string,
    policyId: string,
    orgId: string,
    processName: string,
    sessionId?: string,
  ): Promise<ViolationLogResult> {
    return this.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: 'blocked_app_killed',
      session_id: sessionId,
      metadata: {
        process_name: processName,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log blocked domain attempt
   */
  async logBlockedDomainAttempt(
    studentId: string,
    policyId: string,
    orgId: string,
    domain: string,
    sessionId?: string,
  ): Promise<ViolationLogResult> {
    return this.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: 'blocked_domain_attempt',
      session_id: sessionId,
      metadata: {
        domain,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log large paste detected
   */
  async logLargePasteDetected(
    studentId: string,
    policyId: string,
    orgId: string,
    characterCount: number,
    sessionId?: string,
  ): Promise<ViolationLogResult> {
    return this.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: 'large_paste_detected',
      session_id: sessionId,
      metadata: {
        character_count: characterCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log app focus loss
   */
  async logAppFocusLost(
    studentId: string,
    policyId: string,
    orgId: string,
    durationSeconds: number,
    sessionId?: string,
  ): Promise<ViolationLogResult> {
    return this.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: 'app_focus_lost',
      session_id: sessionId,
      metadata: {
        duration_seconds: durationSeconds,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log tamper attempt
   */
  async logTamperAttempt(
    studentId: string,
    policyId: string,
    orgId: string,
    attemptType: string,
    sessionId?: string,
  ): Promise<ViolationLogResult> {
    return this.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: 'tamper_attempt',
      session_id: sessionId,
      metadata: {
        attempt_type: attemptType,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log external browser attempt
   */
  async logExternalBrowserAttempt(
    studentId: string,
    policyId: string,
    orgId: string,
    sessionId?: string,
  ): Promise<ViolationLogResult> {
    return this.logViolation({
      student_id: studentId,
      policy_id: policyId,
      org_id: orgId,
      event_type: 'external_browser_attempt',
      session_id: sessionId,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Export singleton instance
export const violationLogger = new ViolationLoggerService();
