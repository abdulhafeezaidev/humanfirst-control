/**
 * Enforcement Uptime Chart
 * 
 * Shows system uptime/availability over time.
 * Privacy-preserving: No individual user data.
 */

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { generateTimeSeriesData } from '@/hooks/useEnforcementMetrics';

interface UptimeChartProps {
  periodDays: number;
  className?: string;
}

const chartConfig: ChartConfig = {
  uptime: {
    label: 'Uptime %',
    color: 'hsl(var(--success))',
  },
};

const UptimeChart: React.FC<UptimeChartProps> = ({ periodDays, className = '' }) => {
  // Generate uptime data (typically 95-100%)
  const data = useMemo(() => {
    return generateTimeSeriesData(periodDays, 98, 0.03).map(item => ({
      ...item,
      uptime: Math.min(100, Math.max(90, item.value)),
    }));
  }, [periodDays]);

  const averageUptime = useMemo(() => {
    const sum = data.reduce((acc, item) => acc + item.uptime, 0);
    return (sum / data.length).toFixed(1);
  }, [data]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-success" />
            <CardTitle className="text-base font-medium">Enforcement Uptime</CardTitle>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            {averageUptime}% avg
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          System availability for policy enforcement
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                domain={[90, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="uptime"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#uptimeGradient)"
                name="Uptime"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default UptimeChart;
