/**
 * Admin Metrics Dashboard
 * 
 * Institution-level, read-only metrics dashboard.
 * 
 * Displays:
 * - Enforcement uptime
 * - Violations count
 * - Exam sessions
 * - Focus duration
 * - Admin actions
 * 
 * Filters:
 * - Date range
 * - Policy type
 * 
 * Constraints:
 * - No student-level views
 * - No individual activity
 * - Aggregate data only
 */

import React from 'react';
import { Shield, Lock, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAggregatedMetrics } from '@/hooks/useAggregatedMetrics';
import { DATE_RANGES, PolicyTypeFilter } from '@/types/aggregatedMetrics';
import AggregatedMetricsCards from './AggregatedMetricsCards';
import SessionsByTypeChart from './SessionsByTypeChart';
import ViolationsBreakdownChart from './ViolationsBreakdownChart';
import AdminActivityChart from './AdminActivityChart';
import ComplianceScoreCard from './ComplianceScoreCard';
import { ComplianceReportExporter } from '@/components/reports';

interface AdminMetricsDashboardProps {
  className?: string;
}

const AdminMetricsDashboard: React.FC<AdminMetricsDashboardProps> = ({ className = '' }) => {
  const { 
    metrics, 
    loading, 
    error, 
    dateRange, 
    setDateRange, 
    policyFilter,
    setPolicyFilter,
    refetch 
  } = useAggregatedMetrics();

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load metrics: {error}
            <Button variant="link" onClick={refetch} className="ml-2 p-0 h-auto">
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Enforcement Metrics</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Institution-level analytics • Read-only • Aggregate data only
          </p>
        </div>

        {/* Privacy Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <Lock className="h-3.5 w-3.5" />
          No individual tracking
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters
            </div>

            {/* Date Range */}
            <Select
              value={dateRange.value}
              onValueChange={(value) => {
                const range = DATE_RANGES.find(r => r.value === value);
                if (range) setDateRange(range);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Policy Type */}
            <Select
              value={policyFilter}
              onValueChange={(value) => setPolicyFilter(value as PolicyTypeFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Policy type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Policies</SelectItem>
                <SelectItem value="exam">Exam</SelectItem>
                <SelectItem value="focus">Focus</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Period Info */}
          {metrics && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Data from {new Date(metrics.period.start).toLocaleDateString()} to{' '}
                {new Date(metrics.period.end).toLocaleDateString()} • 
                Last computed: {new Date(metrics.computed_at).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <AggregatedMetricsCards metrics={metrics} loading={loading} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SessionsByTypeChart metrics={metrics} />
        <ViolationsBreakdownChart metrics={metrics} />
        <AdminActivityChart metrics={metrics} />
      </div>

      {/* Charts Row 2 - Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ComplianceReportExporter />
        </div>
        <ComplianceScoreCard 
          metrics={metrics ? {
            compliance: {
              score: metrics.compliance.score,
              trend: metrics.compliance.trend,
              factors: {
                policy_coverage: 0,
                event_resolution: 0,
                admin_activity: 0,
              }
            },
            organization_id: metrics.organization_id,
            computed_at: metrics.computed_at,
            period_start: metrics.period.start,
            period_end: metrics.period.end,
            policies: { total: 0, active: 0, by_type: { exam: 0, focus: 0, custom: 0 }, by_enforcement_level: { strict: 0, soft: 0 } },
            enforcement: { total_events: 0, resolved_events: 0, unresolved_events: 0, resolution_rate: 0, events_by_type: {}, avg_resolution_time_hours: null },
            activity: { total_actions: 0, actions_by_type: {}, active_admins: 0 },
          } : null}
        />
      </div>

      {/* Privacy Footer */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-foreground">Privacy Guarantees</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                <p className="text-xs text-muted-foreground">• No student names or identifiers</p>
                <p className="text-xs text-muted-foreground">• Institution-level data only</p>
                <p className="text-xs text-muted-foreground">• No individual session tracking</p>
                <p className="text-xs text-muted-foreground">• Computed from audit logs only</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMetricsDashboard;
