/**
 * Policy Enforcement Engine - HumanFirst v0.2
 * 
 * This module provides deterministic policy priority resolution
 * ensuring exactly ONE policy is enforced per student at any time.
 * 
 * PRIORITY HIERARCHY (highest to lowest):
 * 1. Exam policies (priority: 100)
 * 2. Focus policies (priority: 50)
 * 3. Custom policies (priority: 10)
 * 
 * CONFLICT RESOLUTION:
 * When multiple policies have overlapping time windows:
 * 1. policy_type: exam > focus > custom
 * 2. explicit priority value (higher wins)
 * 3. start_time DESC (newer policies win)
 * 4. created_at DESC (absolute tie-breaker)
 * 
 * This logic CANNOT conflict because:
 * - The ORDER BY clause is deterministic (no randomness)
 * - LIMIT 1 ensures only one result
 * - All tie-breakers use immutable timestamps
 */

import { supabase } from '@/integrations/supabase/client';
import { Policy, PolicyType, POLICY_PRIORITY } from '@/types/policy';

export interface EffectivePolicy {
  policy_id: string;
  policy_name: string;
  policy_type: PolicyType;
  enforcement_level: 'strict' | 'soft';
  blocked_services: string[];
  blocked_categories: string[];
  start_time: string;
  end_time: string;
  priority: number;
}

export interface PolicyConflict {
  conflicting_policy_id: string;
  conflicting_policy_name: string;
  conflicting_policy_type: PolicyType;
  conflicting_priority: number;
  overlap_start: string;
  overlap_end: string;
}

/**
 * Gets the single effective policy for a user
 * Returns null if no policy is currently active
 * 
 * This uses the database function which guarantees:
 * - Organization scoping (user can only see their institution's policies)
 * - Time window filtering (only currently active policies)
 * - Deterministic priority resolution
 * - Single policy enforcement (LIMIT 1)
 */
export async function getEffectivePolicyForUser(userId: string): Promise<EffectivePolicy | null> {
  const { data, error } = await supabase.rpc('get_effective_policy_for_user', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Failed to get effective policy:', error);
    throw new Error(`Policy evaluation failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null; // No active policy
  }

  return data[0] as EffectivePolicy;
}

/**
 * Gets the active policy for the current authenticated user
 * Uses the simpler RPC that doesn't require passing user ID
 */
export async function getActivePolicy(): Promise<Policy | null> {
  const { data, error } = await supabase.rpc('get_active_exam_policy');

  if (error) {
    console.error('Failed to get active policy:', error);
    throw new Error(`Policy fetch failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as Policy;
}

/**
 * Checks for policy conflicts within a time window
 * Useful for admins when creating new policies
 */
export async function checkPolicyConflicts(
  organizationId: string,
  startTime: Date,
  endTime: Date,
  excludePolicyId?: string
): Promise<PolicyConflict[]> {
  const { data, error } = await supabase.rpc('check_policy_conflicts', {
    p_org_id: organizationId,
    p_start_time: startTime.toISOString(),
    p_end_time: endTime.toISOString(),
    p_exclude_policy_id: excludePolicyId || null,
  });

  if (error) {
    console.error('Failed to check policy conflicts:', error);
    throw new Error(`Conflict check failed: ${error.message}`);
  }

  return (data || []) as PolicyConflict[];
}

/**
 * Calculates the effective priority for display purposes
 * Combines type priority with explicit priority
 */
export function calculateDisplayPriority(policyType: PolicyType, explicitPriority: number): number {
  const typePriority = POLICY_PRIORITY[policyType];
  return typePriority + explicitPriority;
}

/**
 * Compares two policies to determine which takes precedence
 * Returns negative if a < b, positive if a > b, 0 if equal
 * 
 * This matches the database ORDER BY logic exactly
 */
export function comparePolicies(a: Policy, b: Policy): number {
  // 1. Policy type (exam > focus > custom)
  const typeOrder: Record<PolicyType, number> = { exam: 0, focus: 1, custom: 2 };
  const typeCompare = typeOrder[a.policy_type] - typeOrder[b.policy_type];
  if (typeCompare !== 0) return typeCompare;

  // 2. Explicit priority (higher wins, so negate for ascending sort)
  const priorityCompare = b.priority - a.priority;
  if (priorityCompare !== 0) return priorityCompare;

  // 3. Start time (newer wins)
  const startCompare = new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
  if (startCompare !== 0) return startCompare;

  // 4. Created at (tie-breaker)
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

/**
 * Sorts policies by priority (highest first)
 */
export function sortPoliciesByPriority(policies: Policy[]): Policy[] {
  return [...policies].sort(comparePolicies);
}

/**
 * Filters policies to only those active within a time window
 */
export function filterActivePolicies(policies: Policy[], at: Date = new Date()): Policy[] {
  return policies.filter((p) => {
    if (!p.is_active || p.status !== 'active') return false;
    const start = new Date(p.start_time);
    const end = new Date(p.end_time);
    return at >= start && at <= end;
  });
}

/**
 * Gets the single enforced policy from a list
 * This is the client-side equivalent of the database function
 */
export function getEnforcedPolicy(policies: Policy[], at: Date = new Date()): Policy | null {
  const active = filterActivePolicies(policies, at);
  if (active.length === 0) return null;
  
  const sorted = sortPoliciesByPriority(active);
  return sorted[0]; // Only the highest priority policy
}

// Example inputs and outputs for documentation
export const POLICY_EXAMPLES = {
  /**
   * Example 1: Overlapping Exam and Focus policies
   * Input: Exam (priority 100) 9:00-12:00, Focus (priority 50) 8:00-17:00
   * Output: Exam policy (type takes precedence)
   */
  overlappingExamFocus: {
    input: [
      { policy_type: 'exam' as PolicyType, priority: 100, start_time: '2024-01-15T09:00:00Z' },
      { policy_type: 'focus' as PolicyType, priority: 50, start_time: '2024-01-15T08:00:00Z' },
    ],
    winner: 'exam',
    reason: 'Exam type has highest priority regardless of explicit priority value',
  },

  /**
   * Example 2: Multiple Exam policies
   * Input: Exam A (priority 100) 9:00-12:00, Exam B (priority 100) 10:00-13:00
   * Output: Exam with later start_time wins
   */
  multipleExams: {
    input: [
      { policy_type: 'exam' as PolicyType, priority: 100, start_time: '2024-01-15T09:00:00Z' },
      { policy_type: 'exam' as PolicyType, priority: 100, start_time: '2024-01-15T10:00:00Z' },
    ],
    winner: 'Exam with start_time 10:00',
    reason: 'Same type and priority, newer start_time wins',
  },

  /**
   * Example 3: No active policies
   * Input: All policies outside current time window
   * Output: null (no enforcement)
   */
  noActivePolicy: {
    input: [
      { policy_type: 'exam' as PolicyType, start_time: '2024-01-14T09:00:00Z', end_time: '2024-01-14T12:00:00Z' },
    ],
    currentTime: '2024-01-15T10:00:00Z',
    winner: null,
    reason: 'No policies active at current time',
  },

  /**
   * Example 4: Custom vs Focus
   * Input: Custom (priority 10) and Focus (priority 50) overlap
   * Output: Focus wins (type priority)
   */
  customVsFocus: {
    input: [
      { policy_type: 'custom' as PolicyType, priority: 10 },
      { policy_type: 'focus' as PolicyType, priority: 50 },
    ],
    winner: 'focus',
    reason: 'Focus type has higher priority than Custom',
  },
};

/**
 * WHY THIS LOGIC CANNOT CONFLICT:
 * 
 * 1. DETERMINISTIC ORDERING
 *    The ORDER BY clause uses fixed criteria with no randomness:
 *    - policy_type is an enum with defined order
 *    - priority is an integer
 *    - start_time and created_at are timestamps
 * 
 * 2. COMPLETE TIE-BREAKING
 *    Every possible tie is broken:
 *    - Same type? Check priority
 *    - Same priority? Check start_time
 *    - Same start_time? Check created_at
 *    - Same created_at? Impossible (unique constraint)
 * 
 * 3. SINGLE RESULT GUARANTEE
 *    LIMIT 1 ensures exactly one policy or none
 * 
 * 4. INSTITUTION SCOPING
 *    organization_id filter ensures no cross-institution conflicts
 * 
 * 5. IMMUTABLE CRITERIA
 *    All comparison fields are set at creation and never change
 */
