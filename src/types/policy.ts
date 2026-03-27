// Policy Engine Types - HumanFirst v0.1
// Based on POLICY_ENGINE.md specification

/**
 * Policy types with priority hierarchy:
 * - exam: Highest priority (100) - For high-stakes assessments
 * - focus: Medium priority (50) - For study sessions/class time
 * - custom: Lowest priority (10) - For custom institutional rules
 */
export type PolicyType = 'exam' | 'focus' | 'custom';
export type EnforcementLevel = 'strict' | 'soft';
export type PolicyStatus = 'active' | 'disabled' | 'scheduled';
export type AssignmentType = 'institution' | 'individual';

export interface Policy {
  id: string;
  title: string;
  description: string | null;
  policy_type: PolicyType;
  enforcement_level: EnforcementLevel;
  status: PolicyStatus;
  assignment_type: AssignmentType;
  start_time: string;
  end_time: string;
  blocked_categories: string[];
  blocked_services: string[];
  priority: number;
  is_active: boolean;
  organization_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyAssignment {
  id: string;
  policy_id: string;
  user_id: string;
  organization_id: string | null;
  assigned_by: string;
  assigned_at: string;
  revoked_at: string | null;
  notes: string | null;
  // Joined data
  user_name?: string;
  user_email?: string;
}

export interface PolicyAssignmentLog {
  id: string;
  policy_id: string;
  action: 'assigned' | 'revoked' | 'created' | 'updated' | 'deleted';
  actor_id: string;
  target_user_id: string | null;
  organization_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined data
  actor_name?: string;
  target_user_name?: string;
  policy_title?: string;
}

export interface PolicyFormData {
  title: string;
  description: string;
  policy_type: PolicyType;
  enforcement_level: EnforcementLevel;
  assignment_type: AssignmentType;
  start_time: string;
  end_time: string;
  blocked_categories: string[];
  blocked_services: string[];
}

// Default blocked categories
export const BLOCKED_CATEGORIES = [
  'AI Tools',
  'Social Media',
  'Messaging',
  'Entertainment',
  'Gaming',
] as const;

// Default blocked services (specific AI platforms)
export const BLOCKED_SERVICES = [
  'ChatGPT',
  'Claude',
  'Gemini',
  'Copilot',
  'Perplexity',
  'Bard',
  'Jasper',
  'Notion AI',
  'Grammarly',
] as const;

/**
 * Policy Priority Hierarchy
 * 
 * Higher number = higher priority
 * Priority resolution is DETERMINISTIC and cannot conflict:
 * 1. policy_type (exam > focus > custom)
 * 2. explicit priority value
 * 3. newer start_time wins for overlapping windows
 * 4. later created_at as absolute tie-breaker
 * 
 * Only ONE policy is ever enforced per student at any time.
 */
export const POLICY_PRIORITY: Record<PolicyType, number> = {
  exam: 100,    // Highest: high-stakes assessments
  focus: 50,    // Medium: study sessions, class time
  custom: 10,   // Lowest: custom institutional rules
};

// Ethics compliance: What we DO NOT do
export const ETHICS_COMPLIANCE = {
  noContentReading: true,
  noKeystrokeMonitoring: true,
  noBehaviorScoring: true,
  noAIDetection: true,
} as const;
