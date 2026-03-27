/**
 * Admin Activity Chart
 * 
 * Shows breakdown of admin actions by type.
 * Aggregate counts only - no individual admin tracking.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { UserCog } from 'lucide-react';
import { AggregatedMetrics } from '@/types/aggregatedMetrics';

interface AdminActivityChartProps {
  metrics: AggregatedMetrics | null;
}

const formatAction = (action: string): string => {
  return action
    .replace(/_/g, ' ')
    .replace(/^exam policy /i, '')
    .replace(/\b\w/g, l => l.toUpperCase());
};

const AdminActivityChart: React.FC<AdminActivityChartProps> = ({ metrics }) => {
  const data = React.useMemo(() => {
    if (!metrics?.breakdown?.admin_actions_by_type) return [];
    
    const actions = metrics.breakdown.admin_actions_by_type;
    return Object.entries(actions)
      .map(([action, count]) => ({
        action: formatAction(action),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 actions
  }, [metrics]);

  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserCog className="h-4 w-4 text-muted-foreground" />
            Admin Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No admin activity recorded</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserCog className="h-4 w-4 text-muted-foreground" />
            Admin Activity
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {metrics?.metrics.admin_actions_count ?? 0} actions
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ left: 0, right: 16, bottom: 0 }}>
            <XAxis 
              dataKey="action" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              angle={-15}
              textAnchor="end"
              height={50}
            />
            <YAxis hide />
            <Tooltip
              formatter={(value: number) => [value, 'Actions']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar 
              dataKey="count" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AdminActivityChart;
