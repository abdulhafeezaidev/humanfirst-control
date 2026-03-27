/**
 * Violations Breakdown Chart
 * 
 * Shows violation attempts grouped by event type.
 * Aggregate counts only - no individual attribution.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { AggregatedMetrics } from '@/types/aggregatedMetrics';

interface ViolationsBreakdownChartProps {
  metrics: AggregatedMetrics | null;
}

const formatEventType = (type: string): string => {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/Vpn/g, 'VPN')
    .replace(/Ai/g, 'AI');
};

const ViolationsBreakdownChart: React.FC<ViolationsBreakdownChartProps> = ({ metrics }) => {
  const data = React.useMemo(() => {
    if (!metrics?.breakdown?.violations_by_type) return [];
    
    const violations = metrics.breakdown.violations_by_type;
    return Object.entries(violations)
      .map(([type, count]) => ({
        type: formatEventType(type),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6); // Top 6 types
  }, [metrics]);

  const totalViolations = metrics?.metrics.violation_attempts ?? 0;

  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Violations by Type
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">0</div>
            <p className="text-sm text-muted-foreground mt-1">No violations detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Violations by Type
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {totalViolations} total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="type" 
              width={100}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: number) => [value, 'Events']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 0 ? 'hsl(var(--destructive))' : 'hsl(var(--chart-1))'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ViolationsBreakdownChart;
