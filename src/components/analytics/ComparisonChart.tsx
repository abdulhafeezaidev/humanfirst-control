import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

interface ComparisonData {
  label: string;
  before: number;
  after: number;
}

interface ComparisonChartProps {
  data: ComparisonData[];
  title: string;
  description?: string;
  className?: string;
}

const chartConfig: ChartConfig = {
  before: {
    label: 'Before Pilot',
    color: 'hsl(var(--muted-foreground))',
  },
  after: {
    label: 'During Pilot',
    color: 'hsl(var(--primary))',
  },
};

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  title,
  description,
  className = '',
}) => {
  const calculateTotalDelta = () => {
    const beforeTotal = data.reduce((acc, item) => acc + item.before, 0);
    const afterTotal = data.reduce((acc, item) => acc + item.after, 0);
    
    if (beforeTotal === 0) return afterTotal > 0 ? 100 : 0;
    return ((afterTotal - beforeTotal) / beforeTotal) * 100;
  };

  const delta = calculateTotalDelta();

  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          delta > 0 ? 'bg-success/10 text-success' : delta < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
        }`}>
          {delta > 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : delta < 0 ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
          <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)}% overall</span>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="label" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar 
              dataKey="before" 
              fill="hsl(var(--muted-foreground))" 
              radius={[4, 4, 0, 0]} 
              name="Before Pilot"
            />
            <Bar 
              dataKey="after" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]} 
              name="During Pilot"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export default ComparisonChart;
