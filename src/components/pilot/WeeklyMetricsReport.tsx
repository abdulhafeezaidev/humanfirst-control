import React from 'react';
import { 
  Mail, Calendar, TrendingUp, TrendingDown, Minus, 
  Users, Shield, AlertTriangle, Clock, CheckCircle,
  BarChart3, Send, Download, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface WeeklyMetric {
  label: string;
  value: number;
  previousValue: number;
  unit?: string;
  format?: 'number' | 'percent' | 'time';
}

interface WeeklyMetricsReportProps {
  weekStartDate: Date;
  metrics: {
    activeStudents: WeeklyMetric;
    policiesRun: WeeklyMetric;
    focusEvents: WeeklyMetric;
    avgComplianceRate: WeeklyMetric;
    avgSessionDuration: WeeklyMetric;
    devicesTrusted: WeeklyMetric;
  };
  highlights?: string[];
  concerns?: string[];
  onSendReport?: (recipients: string[]) => void;
  onDownloadPdf?: () => void;
}

const WeeklyMetricsReport: React.FC<WeeklyMetricsReportProps> = ({
  weekStartDate,
  metrics,
  highlights = [],
  concerns = [],
  onSendReport,
  onDownloadPdf
}) => {
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekNumber = Math.ceil((weekStartDate.getTime() - new Date(weekStartDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

  const formatValue = (metric: WeeklyMetric): string => {
    switch (metric.format) {
      case 'percent':
        return `${metric.value.toFixed(1)}%`;
      case 'time':
        return `${metric.value}min`;
      default:
        return metric.value.toLocaleString();
    }
  };

  const getTrend = (metric: WeeklyMetric) => {
    const diff = metric.value - metric.previousValue;
    const percentChange = metric.previousValue === 0 
      ? 0 
      : ((diff / metric.previousValue) * 100);

    if (Math.abs(percentChange) < 1) {
      return { icon: Minus, color: 'text-muted-foreground', label: 'No change' };
    } else if (percentChange > 0) {
      return { icon: TrendingUp, color: 'text-green-600', label: `+${percentChange.toFixed(1)}%` };
    } else {
      return { icon: TrendingDown, color: 'text-red-600', label: `${percentChange.toFixed(1)}%` };
    }
  };

  const metricCards = [
    { key: 'activeStudents', icon: Users, label: 'Active Students', metric: metrics.activeStudents },
    { key: 'policiesRun', icon: Shield, label: 'Policies Run', metric: metrics.policiesRun },
    { key: 'focusEvents', icon: AlertTriangle, label: 'Focus Events', metric: metrics.focusEvents },
    { key: 'avgComplianceRate', icon: CheckCircle, label: 'Compliance Rate', metric: metrics.avgComplianceRate },
    { key: 'avgSessionDuration', icon: Clock, label: 'Avg Session', metric: metrics.avgSessionDuration },
    { key: 'devicesTrusted', icon: BarChart3, label: 'Trusted Devices', metric: metrics.devicesTrusted },
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Weekly Pilot Report</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Week {weekNumber}: {format(weekStartDate, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownloadPdf}>
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
            <Button size="sm" onClick={() => onSendReport?.([])}>
              <Send className="w-4 h-4 mr-1" />
              Send Report
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metricCards.map(({ key, icon: Icon, label, metric }) => {
            const trend = getTrend(metric);
            const TrendIcon = trend.icon;

            return (
              <div key={key} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{formatValue(metric)}</span>
                  <div className={`flex items-center gap-1 text-xs ${trend.color}`}>
                    <TrendIcon className="w-3 h-3" />
                    <span>{trend.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Highlights & Concerns */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Highlights */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-lg">
            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Weekly Highlights
            </h4>
            {highlights.length > 0 ? (
              <ul className="space-y-2">
                {highlights.map((highlight, i) => (
                  <li key={i} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600/70">No highlights this week</p>
            )}
          </div>

          {/* Concerns */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Areas of Attention
            </h4>
            {concerns.length > 0 ? (
              <ul className="space-y-2">
                {concerns.map((concern, i) => (
                  <li key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {concern}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-amber-600/70">No concerns this week</p>
            )}
          </div>
        </div>

        {/* Comparison to Previous Week */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Week-over-Week Summary
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">
                {((metrics.avgComplianceRate.value - metrics.avgComplianceRate.previousValue) >= 0 ? '+' : '')}
                {(metrics.avgComplianceRate.value - metrics.avgComplianceRate.previousValue).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Compliance Change</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metrics.activeStudents.value - metrics.activeStudents.previousValue >= 0 ? '+' : ''}
                {metrics.activeStudents.value - metrics.activeStudents.previousValue}
              </p>
              <p className="text-xs text-muted-foreground">New Students</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {metrics.focusEvents.value - metrics.focusEvents.previousValue >= 0 ? '+' : ''}
                {metrics.focusEvents.value - metrics.focusEvents.previousValue}
              </p>
              <p className="text-xs text-muted-foreground">Focus Events Delta</p>
            </div>
          </div>
        </div>

        {/* Report Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span>Preview before sending</span>
          </div>
          <Badge variant="outline" className="text-xs">
            Auto-generated weekly
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyMetricsReport;
