/**
 * Violations Count Chart
 * 
 * Shows aggregate violation/tamper event counts over time.
 * Privacy-preserving: No individual user identification.
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { EnforcementMetrics } from '@/types/metrics';

interface ViolationsChartProps {
  metrics: EnforcementMetrics | null;
  periodDays: number;
  className?: string;
}

const chartConfig: ChartConfig = {
  resolved: {
    label: 'Resolved',
    color: 'hsl(var(--success))',
  },
  unresolved: {
    label: 'Unresolved',
    color: 'hsl(var(--warning))',
  },
};

const ViolationsChart: React.FC<ViolationsChartProps> = ({ 
  metrics, 
  periodDays, 
  className = '' 
}) => {
  // Transform event types into chart data
  const chartData = useMemo(() => {
    if (!metrics?.enforcement?.events_by_type) {
      // Fallback sample data
      return [
        { type: 'Focus Loss', count: 12, resolved: 10, unresolved: 2 },
        { type: 'Network Issue', count: 5, resolved: 4, unresolved: 1 },
        { type: 'App Switch', count: 8, resolved: 8, unresolved: 0 },
      ];
    }

    const events = metrics.enforcement.events_by_type;
    const resolutionRate = metrics.enforcement.resolution_rate / 100;

    return Object.entries(events).map(([type, count]) => {
      const resolved = Math.round(count * resolutionRate);
      return {
        type: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        count,
        resolved,
        unresolved: count - resolved,
      };
    }).slice(0, 6); // Max 6 categories for readability
  }, [metrics]);

  const totalEvents = metrics?.enforcement?.total_events ?? chartData.reduce((s, d) => s + d.count, 0);
  const resolutionRate = metrics?.enforcement?.resolution_rate ?? 85;

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle className="text-base font-medium">Violation Events</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalEvents} total events
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {resolutionRate.toFixed(0)}% resolved
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregate enforcement events by type (no individual tracking)
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis 
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                type="category"
                dataKey="type"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                width={75}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="resolved" 
                stackId="a" 
                fill="hsl(var(--success))" 
                radius={[0, 0, 0, 0]}
                name="Resolved"
              />
              <Bar 
                dataKey="unresolved" 
                stackId="a" 
                fill="hsl(var(--warning))" 
                radius={[0, 4, 4, 0]}
                name="Unresolved"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-success" />
            <span className="text-muted-foreground">Resolved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-warning" />
            <span className="text-muted-foreground">Unresolved</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ViolationsChart;
