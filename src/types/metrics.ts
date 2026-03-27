/**
 * Enforcement Metrics Schema
 * 
 * Privacy-preserving metrics computable from existing logs.
 * No content inspection, no personal data exposure.
 */

export interface EnforcementMetrics {
  // Scope
  organization_id: string;
  computed_at: string;
  period_start: string;
  period_end: string;

  // Policy Metrics (from exam_policies)
  policies: {
    total: number;
    active: number;
    by_type: {
      exam: number;
      focus: number;
      custom: number;
    };
    by_enforcement_level: {
      strict: number;
      soft: number;
    };
  };

  // Enforcement Events (from tamper_events - no content, just counts)
  enforcement: {
    total_events: number;
    resolved_events: number;
    unresolved_events: number;
    resolution_rate: number; // percentage
    events_by_type: Record<string, number>;
    avg_resolution_time_hours: number | null;
  };

  // Activity Metrics (from audit_logs - action counts only)
  activity: {
    total_actions: number;
    actions_by_type: Record<string, number>;
    active_admins: number; // unique actors in period
  };

  // Compliance Score (computed aggregate)
  compliance: {
    score: number; // 0-100
    trend: 'improving' | 'stable' | 'declining';
    factors: {
      policy_coverage: number;
      event_resolution: number;
      admin_activity: number;
    };
  };
}

export interface MetricsPeriod {
  label: string;
  value: 'day' | 'week' | 'month' | 'quarter';
  days: number;
}

export const METRICS_PERIODS: MetricsPeriod[] = [
  { label: 'Last 24 hours', value: 'day', days: 1 },
  { label: 'Last 7 days', value: 'week', days: 7 },
  { label: 'Last 30 days', value: 'month', days: 30 },
  { label: 'Last 90 days', value: 'quarter', days: 90 },
];

export interface MetricsAPIResponse {
  success: boolean;
  metrics: EnforcementMetrics;
  cached: boolean;
  cache_ttl_seconds: number;
}
