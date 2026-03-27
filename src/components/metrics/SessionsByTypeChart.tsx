/**
 * Sessions by Policy Type Chart
 * 
 * Displays distribution of enforcement sessions by policy type.
 * Aggregate data only - no individual tracking.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Calendar } from 'lucide-react';
import { AggregatedMetrics } from '@/types/aggregatedMetrics';

interface SessionsByTypeChartProps {
  metrics: AggregatedMetrics | null;
}

const COLORS = {
  exam: 'hsl(var(--chart-1))',
  focus: 'hsl(var(--chart-2))',
  custom: 'hsl(var(--chart-3))',
};

const SessionsByTypeChart: React.FC<SessionsByTypeChartProps> = ({ metrics }) => {
  const data = React.useMemo(() => {
    if (!metrics?.breakdown?.sessions_by_policy_type) return [];
    
    const sessions = metrics.breakdown.sessions_by_policy_type;
    return Object.entries(sessions)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: COLORS[name as keyof typeof COLORS] || 'hsl(var(--chart-4))',
      }));
  }, [metrics]);

  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Sessions by Policy Type
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No session data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Sessions by Policy Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [value, 'Sessions']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SessionsByTypeChart;
