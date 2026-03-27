/**
 * Aggregated Metrics Types
 * 
 * Types for the metrics-aggregator endpoint response.
 * Institution-scoped, privacy-preserving, read-only.
 */

export interface AggregatedMetrics {
  organization_id: string;
  period: {
    start: string;
    end: string;
    days: number;
  };
  metrics: {
    total_exam_sessions: number;
    enforcement_uptime_percentage: number;
    violation_attempts: number;
    average_focus_duration_minutes: number;
    admin_actions_count: number;
  };
  breakdown: {
    violations_by_type: Record<string, number>;
    sessions_by_policy_type: Record<string, number>;
    admin_actions_by_type: Record<string, number>;
  };
  compliance: {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  computed_at: string;
}

export interface AggregatedMetricsResponse {
  success: boolean;
  data: AggregatedMetrics;
  cached: boolean;
}

export type PolicyTypeFilter = 'all' | 'exam' | 'focus' | 'custom';

export interface MetricsDateRange {
  label: string;
  value: 'day' | 'week' | 'month' | 'quarter';
  days: number;
}

export const DATE_RANGES: MetricsDateRange[] = [
  { label: 'Last 24 hours', value: 'day', days: 1 },
  { label: 'Last 7 days', value: 'week', days: 7 },
  { label: 'Last 30 days', value: 'month', days: 30 },
  { label: 'Last 90 days', value: 'quarter', days: 90 },
];
