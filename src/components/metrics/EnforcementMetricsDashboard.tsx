/**
 * Enforcement Metrics Dashboard
 * 
 * Main dashboard component for viewing institution-scoped,
 * privacy-preserving enforcement metrics.
 * 
 * READ-ONLY: No data modification capabilities.
 * PRIVACY: No student names, no individual tracking, aggregate only.
 */

import React, { useState, useMemo } from 'react';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useEnforcementMetrics } from '@/hooks/useEnforcementMetrics';
import { METRICS_PERIODS } from '@/types/metrics';
import { ComplianceReportExporter } from '@/components/reports';

// Import sub-components
import MetricsFilters from './MetricsFilters';
import MetricsSummaryCards from './MetricsSummaryCards';
import UptimeChart from './UptimeChart';
import ViolationsChart from './ViolationsChart';
import SessionDurationChart from './SessionDurationChart';
import ComplianceScoreCard from './ComplianceScoreCard';

interface EnforcementMetricsDashboardProps {
  organizationId?: string;
  className?: string;
}

const EnforcementMetricsDashboard: React.FC<EnforcementMetricsDashboardProps> = ({
  organizationId,
  className = '',
}) => {
  const { metrics, loading, error, period, setPeriod, refetch } = useEnforcementMetrics();
  const [policyFilter, setPolicyFilter] = useState('all');

  // Would be fetched from backend in production
  const availablePolicies = useMemo(() => [
    { id: '1', title: 'Final Exam Policy', type: 'exam' },
    { id: '2', title: 'Daily Focus Mode', type: 'focus' },
  ], []);

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load metrics: {error}. 
            <button onClick={refetch} className="underline ml-2">Try again</button>
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
            Privacy-preserving, aggregate-only analytics for your institution
          </p>
        </div>

        {/* Privacy Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/50 border border-accent text-xs font-medium text-accent-foreground">
          <Lock className="h-3.5 w-3.5" />
          No individual tracking
        </div>
      </div>

      {/* Filters */}
      <MetricsFilters
        period={period}
        onPeriodChange={setPeriod}
        policyFilter={policyFilter}
        onPolicyFilterChange={setPolicyFilter}
        availablePolicies={availablePolicies}
        onRefresh={refetch}
        isLoading={loading}
      />

      {/* Summary Cards */}
      <MetricsSummaryCards metrics={metrics} loading={loading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uptime Chart */}
        {loading ? (
          <Card className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-40 mb-4" />
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ) : (
          <UptimeChart periodDays={period.days} />
        )}

        {/* Violations Chart */}
        {loading ? (
          <Card className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-40 mb-4" />
              <Skeleton className="h-[220px] w-full" />
            </CardContent>
          </Card>
        ) : (
          <ViolationsChart metrics={metrics} periodDays={period.days} />
        )}
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Duration */}
        <div className="lg:col-span-2">
          {loading ? (
            <Card className="glass-card">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-40 mb-4" />
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          ) : (
            <SessionDurationChart metrics={metrics} periodDays={period.days} />
          )}
        </div>

        {/* Compliance Score */}
        {loading ? (
          <Card className="glass-card">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ) : (
          <ComplianceScoreCard metrics={metrics} />
        )}
      </div>

      {/* Report Export Section */}
      <ComplianceReportExporter />

      {/* Privacy Footer */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-foreground">Privacy Guarantees</h4>
            <ul className="text-xs text-muted-foreground mt-1 space-y-1">
              <li>• No student names or identifiers are displayed</li>
              <li>• All data is aggregated at the institution level</li>
              <li>• No individual session or behavior tracking</li>
              <li>• Metrics are computed from existing audit logs only</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnforcementMetricsDashboard;
