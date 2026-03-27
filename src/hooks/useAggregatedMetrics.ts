/**
 * Hook for fetching aggregated metrics from the metrics-aggregator endpoint
 * 
 * Privacy-preserving: Only aggregate data, no individual tracking
 * Read-only: No data modification capabilities
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AggregatedMetrics, 
  MetricsDateRange, 
  DATE_RANGES,
  PolicyTypeFilter 
} from '@/types/aggregatedMetrics';

interface UseAggregatedMetricsResult {
  metrics: AggregatedMetrics | null;
  loading: boolean;
  error: string | null;
  dateRange: MetricsDateRange;
  setDateRange: (range: MetricsDateRange) => void;
  policyFilter: PolicyTypeFilter;
  setPolicyFilter: (filter: PolicyTypeFilter) => void;
  refetch: () => Promise<void>;
}

export function useAggregatedMetrics(
  initialRange: MetricsDateRange = DATE_RANGES[2] // Default to 'month'
): UseAggregatedMetricsResult {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<MetricsDateRange>(initialRange);
  const [policyFilter, setPolicyFilter] = useState<PolicyTypeFilter>('all');

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('metrics-aggregator', {
        method: 'POST',
        body: {
          period_days: dateRange.days,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch metrics');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error fetching metrics');
      }

      setMetrics(data.data);
    } catch (err) {
      console.error('Aggregated metrics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [dateRange.days]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    dateRange,
    setDateRange,
    policyFilter,
    setPolicyFilter,
    refetch: fetchMetrics,
  };
}

/**
 * Filter metrics breakdown by policy type
 */
export function filterByPolicyType(
  metrics: AggregatedMetrics | null,
  filter: PolicyTypeFilter
): Partial<AggregatedMetrics['breakdown']> | null {
  if (!metrics || filter === 'all') {
    return metrics?.breakdown ?? null;
  }

  const sessionCount = metrics.breakdown.sessions_by_policy_type[filter] || 0;
  
  return {
    ...metrics.breakdown,
    sessions_by_policy_type: { [filter]: sessionCount },
  };
}
