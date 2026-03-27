/**
 * Aggregated Metrics Cards
 * 
 * Displays the five key metrics from the aggregator:
 * - Total Exam Sessions
 * - Enforcement Uptime
 * - Violation Attempts
 * - Average Focus Duration
 * - Admin Actions Count
 * 
 * READ-ONLY, institution-level only, no student data.
 */

import React from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Shield, 
  Timer, 
  UserCog,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AggregatedMetrics } from '@/types/aggregatedMetrics';
import { Skeleton } from '@/components/ui/skeleton';

interface AggregatedMetricsCardsProps {
  metrics: AggregatedMetrics | null;
  loading?: boolean;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  iconBg?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  subLabel,
  trend,
  trendLabel,
  iconBg = 'bg-primary/10 text-primary',
  loading = false,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3" />;
      case 'down': return <TrendingDown className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendStyle = () => {
    switch (trend) {
      case 'up': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
      case 'down': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-muted-foreground bg-muted/50';
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            {icon}
          </div>
          {trend && trendLabel && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTrendStyle()}`}>
              {getTrendIcon()}
              {trendLabel}
            </div>
          )}
        </div>
        
        <div className="text-2xl font-bold text-foreground tracking-tight">
          {value}
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {subLabel && (
          <div className="text-xs text-muted-foreground/70 mt-1">{subLabel}</div>
        )}
      </CardContent>
    </Card>
  );
};

const AggregatedMetricsCards: React.FC<AggregatedMetricsCardsProps> = ({ 
  metrics, 
  loading = false 
}) => {
  const m = metrics?.metrics;
  const compliance = metrics?.compliance;

  // Determine uptime trend
  const uptimeTrend = (m?.enforcement_uptime_percentage ?? 0) >= 99 ? 'up' 
    : (m?.enforcement_uptime_percentage ?? 0) >= 95 ? 'neutral' : 'down';

  // Determine violation trend (fewer is better)
  const violationTrend = (m?.violation_attempts ?? 0) === 0 ? 'up'
    : (m?.violation_attempts ?? 0) < 10 ? 'neutral' : 'down';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Exam Sessions */}
      <MetricCard
        icon={<Clock className="h-5 w-5" />}
        label="Exam Sessions"
        value={m?.total_exam_sessions ?? '-'}
        subLabel="Policy enforcement periods"
        trend="neutral"
        iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
        loading={loading}
      />

      {/* Enforcement Uptime */}
      <MetricCard
        icon={<Shield className="h-5 w-5" />}
        label="Uptime"
        value={m ? `${m.enforcement_uptime_percentage.toFixed(1)}%` : '-'}
        subLabel="Enforcement availability"
        trend={uptimeTrend}
        trendLabel={uptimeTrend === 'up' ? 'Excellent' : uptimeTrend === 'neutral' ? 'Good' : 'Low'}
        iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
        loading={loading}
      />

      {/* Violation Attempts */}
      <MetricCard
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Violations"
        value={m?.violation_attempts ?? '-'}
        subLabel="Aggregate event count"
        trend={violationTrend}
        trendLabel={violationTrend === 'up' ? 'Clear' : violationTrend === 'neutral' ? 'Low' : 'Review'}
        iconBg="bg-amber-100 text-amber-600 dark:bg-amber-900/30"
        loading={loading}
      />

      {/* Average Focus Duration */}
      <MetricCard
        icon={<Timer className="h-5 w-5" />}
        label="Avg Duration"
        value={m ? `${m.average_focus_duration_minutes} min` : '-'}
        subLabel="Mean session length"
        trend="neutral"
        iconBg="bg-purple-100 text-purple-600 dark:bg-purple-900/30"
        loading={loading}
      />

      {/* Admin Actions */}
      <MetricCard
        icon={<UserCog className="h-5 w-5" />}
        label="Admin Actions"
        value={m?.admin_actions_count ?? '-'}
        subLabel="Total administrative activity"
        trend={compliance?.trend === 'improving' ? 'up' : compliance?.trend === 'declining' ? 'down' : 'neutral'}
        trendLabel={compliance?.trend ?? 'stable'}
        iconBg="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30"
        loading={loading}
      />
    </div>
  );
};

export default AggregatedMetricsCards;
