/**
 * Metrics Summary Cards
 * 
 * Quick overview cards showing key aggregate metrics.
 * Read-only, privacy-preserving display.
 */

import React from 'react';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EnforcementMetrics } from '@/types/metrics';

interface MetricsSummaryCardsProps {
  metrics: EnforcementMetrics | null;
  loading?: boolean;
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  label,
  value,
  subValue,
  trend,
  trendValue,
  loading = false,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3.5 w-3.5" />;
      case 'down':
        return <TrendingDown className="h-3.5 w-3.5" />;
      default:
        return <Minus className="h-3.5 w-3.5" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-success bg-success/10';
      case 'down':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTrendColor()}`}>
              {getTrendIcon()}
              {trendValue}
            </div>
          )}
        </div>
        
        <div className="mt-3">
          {loading ? (
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
          ) : (
            <div className="text-2xl font-bold text-foreground">{value}</div>
          )}
          <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
          {subValue && (
            <div className="text-xs text-muted-foreground mt-1">{subValue}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const MetricsSummaryCards: React.FC<MetricsSummaryCardsProps> = ({ 
  metrics, 
  loading = false 
}) => {
  const policies = metrics?.policies;
  const enforcement = metrics?.enforcement;
  const activity = metrics?.activity;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <SummaryCard
        icon={<FileText className="h-5 w-5" />}
        label="Active Policies"
        value={policies?.active ?? '-'}
        subValue={`${policies?.total ?? 0} total`}
        trend="neutral"
        loading={loading}
      />

      <SummaryCard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Total Events"
        value={enforcement?.total_events ?? '-'}
        subValue={`${enforcement?.unresolved_events ?? 0} unresolved`}
        trend={enforcement?.unresolved_events === 0 ? 'up' : 'down'}
        trendValue={enforcement?.unresolved_events === 0 ? 'All clear' : 'Needs attention'}
        loading={loading}
      />

      <SummaryCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        label="Resolution Rate"
        value={`${enforcement?.resolution_rate?.toFixed(0) ?? '-'}%`}
        subValue={enforcement?.avg_resolution_time_hours 
          ? `~${enforcement.avg_resolution_time_hours.toFixed(1)}h avg` 
          : undefined}
        trend={(enforcement?.resolution_rate ?? 0) >= 90 ? 'up' : 'neutral'}
        trendValue={(enforcement?.resolution_rate ?? 0) >= 90 ? 'Excellent' : 'Good'}
        loading={loading}
      />

      <SummaryCard
        icon={<Users className="h-5 w-5" />}
        label="Active Admins"
        value={activity?.active_admins ?? '-'}
        subValue={`${activity?.total_actions ?? 0} actions`}
        trend="neutral"
        loading={loading}
      />
    </div>
  );
};

export default MetricsSummaryCards;
