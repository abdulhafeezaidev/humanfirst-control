/**
 * Hook for fetching enforcement metrics from the backend API
 * 
 * Privacy-preserving: Only aggregate data, no individual tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnforcementMetrics, MetricsPeriod, METRICS_PERIODS } from '@/types/metrics';

interface UseEnforcementMetricsResult {
  metrics: EnforcementMetrics | null;
  loading: boolean;
  error: string | null;
  period: MetricsPeriod;
  setPeriod: (period: MetricsPeriod) => void;
  refetch: () => Promise<void>;
}

export function useEnforcementMetrics(
  initialPeriod: MetricsPeriod = METRICS_PERIODS[1] // Default to 'week'
): UseEnforcementMetricsResult {
  const [metrics, setMetrics] = useState<EnforcementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<MetricsPeriod>(initialPeriod);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('enforcement-metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: null,
      });

      // Handle the period parameter via query string workaround
      // Since invoke doesn't support query params directly, we use the default period
      // In production, you'd extend the edge function to accept period in headers

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch metrics');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error fetching metrics');
      }

      setMetrics(data.metrics);
    } catch (err) {
      console.error('Metrics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    period,
    setPeriod,
    refetch: fetchMetrics,
  };
}

/**
 * Generate mock time-series data for charts
 * In production, this would come from the backend
 */
export function generateTimeSeriesData(
  periodDays: number,
  baseValue: number,
  variance: number = 0.2
): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = [];
  const now = new Date();

  for (let i = periodDays - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate somewhat realistic data with random variance
    const randomFactor = 1 + (Math.random() - 0.5) * variance;
    const value = Math.round(baseValue * randomFactor);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0, value),
    });
  }

  return data;
}
