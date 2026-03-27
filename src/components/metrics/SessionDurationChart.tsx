/**
 * Session Duration Chart
 * 
 * Shows distribution of policy session durations.
 * Privacy-preserving: Aggregate buckets only, no individual sessions.
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Clock, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { EnforcementMetrics } from '@/types/metrics';

interface SessionDurationChartProps {
  metrics: EnforcementMetrics | null;
  periodDays: number;
  className?: string;
}

const chartConfig: ChartConfig = {
  sessions: {
    label: 'Sessions',
    color: 'hsl(var(--primary))',
  },
};

// Duration buckets for distribution
const DURATION_BUCKETS = [
  { label: '< 30 min', min: 0, max: 30 },
  { label: '30-60 min', min: 30, max: 60 },
  { label: '1-2 hrs', min: 60, max: 120 },
  { label: '2-3 hrs', min: 120, max: 180 },
  { label: '3+ hrs', min: 180, max: Infinity },
];

const SessionDurationChart: React.FC<SessionDurationChartProps> = ({ 
  metrics, 
  periodDays, 
  className = '' 
}) => {
  // Generate distribution data (simulated - in production would come from backend)
  const distributionData = useMemo(() => {
    // Realistic distribution: most sessions are 1-2 hours
    const distribution = [12, 25, 45, 28, 15]; // percentage weights
    const totalSessions = Math.round(periodDays * 8); // ~8 sessions per day average
    
    return DURATION_BUCKETS.map((bucket, index) => ({
      duration: bucket.label,
      sessions: Math.round((distribution[index] / 125) * totalSessions),
    }));
  }, [periodDays]);

  const totalSessions = distributionData.reduce((s, d) => s + d.sessions, 0);
  
  // Calculate average duration (weighted)
  const avgDuration = useMemo(() => {
    const weights = [15, 45, 90, 150, 210]; // midpoints in minutes
    const totalWeight = distributionData.reduce((s, d, i) => s + d.sessions * weights[i], 0);
    const avg = totalWeight / totalSessions;
    
    if (avg < 60) return `${Math.round(avg)} min`;
    return `${(avg / 60).toFixed(1)} hrs`;
  }, [distributionData, totalSessions]);

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-medium">Session Duration</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalSessions} sessions
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Timer className="h-3.5 w-3.5" />
              ~{avgDuration} avg
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Distribution of policy session lengths (aggregate only)
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={distributionData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis 
                dataKey="duration"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="sessions" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Sessions"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default SessionDurationChart;
