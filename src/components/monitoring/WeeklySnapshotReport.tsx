import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  Loader2,
  Eye,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format as formatDate, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import StatusIndicator, { StatusLevel } from '@/components/analytics/StatusIndicator';

interface WeeklyTrend {
  week: number;
  enrolledDevices: number;
  complianceRate: number;
  tamperEvents: number;
  aiBlocks: number;
  avgTrustScore: number;
}

interface SnapshotMetric {
  label: string;
  currentValue: number;
  previousValue: number;
  format: 'number' | 'percent' | 'score';
  higherIsBetter: boolean;
}

interface WeeklySnapshotReportProps {
  organizationName: string;
  reportDate?: Date;
  trends: WeeklyTrend[];
  currentMetrics: {
    enrolledDevices: number;
    complianceRate: number;
    tamperEvents: number;
    aiBlocks: number;
    avgTrustScore: number;
  };
  previousMetrics: {
    enrolledDevices: number;
    complianceRate: number;
    tamperEvents: number;
    aiBlocks: number;
    avgTrustScore: number;
  };
  highlights?: string[];
  concerns?: string[];
  riskSignals?: string[];
  onSendReport?: (recipients: string[]) => void;
  className?: string;
}

const WeeklySnapshotReport: React.FC<WeeklySnapshotReportProps> = ({
  organizationName,
  reportDate = new Date(),
  trends,
  currentMetrics,
  previousMetrics,
  highlights = [],
  concerns = [],
  riskSignals = [],
  onSendReport,
  className = '',
}) => {
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const weekStart = startOfWeek(reportDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(reportDate, { weekStartsOn: 1 });
  const weekNumber = Math.ceil((reportDate.getTime() - new Date(reportDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

  // Calculate metrics with trends
  const metrics: SnapshotMetric[] = useMemo(() => [
    {
      label: 'Enrolled Devices',
      currentValue: currentMetrics.enrolledDevices,
      previousValue: previousMetrics.enrolledDevices,
      format: 'number' as const,
      higherIsBetter: true,
    },
    {
      label: 'Compliance Rate',
      currentValue: currentMetrics.complianceRate,
      previousValue: previousMetrics.complianceRate,
      format: 'percent' as const,
      higherIsBetter: true,
    },
    {
      label: 'Integrity Events',
      currentValue: currentMetrics.tamperEvents,
      previousValue: previousMetrics.tamperEvents,
      format: 'number' as const,
      higherIsBetter: false,
    },
    {
      label: 'AI Access Blocks',
      currentValue: currentMetrics.aiBlocks,
      previousValue: previousMetrics.aiBlocks,
      format: 'number' as const,
      higherIsBetter: false, // Lower is neutral, depends on context
    },
    {
      label: 'Avg Trust Score',
      currentValue: currentMetrics.avgTrustScore,
      previousValue: previousMetrics.avgTrustScore,
      format: 'score' as const,
      higherIsBetter: true,
    },
  ], [currentMetrics, previousMetrics]);

  // Determine overall status
  const getOverallStatus = (): StatusLevel => {
    const complianceOk = currentMetrics.complianceRate >= 85;
    const trustOk = currentMetrics.avgTrustScore >= 70;
    const noCriticalRisks = riskSignals.length === 0;

    if (complianceOk && trustOk && noCriticalRisks) return 'green';
    if (currentMetrics.complianceRate >= 70 && currentMetrics.avgTrustScore >= 50) return 'amber';
    return 'red';
  };

  const formatValue = (value: number, format: string): string => {
    switch (format) {
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'score':
        return `${value}/100`;
      default:
        return value.toLocaleString();
    }
  };

  const getChange = (current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) return { value: 0, direction: 'neutral' };
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return { value: change, direction: 'neutral' };
    return { value: change, direction: change > 0 ? 'up' : 'down' };
  };

  const getTrendIndicator = (metric: SnapshotMetric) => {
    const change = getChange(metric.currentValue, metric.previousValue);
    const isPositive = metric.higherIsBetter ? change.direction === 'up' : change.direction === 'down';
    const isNegative = metric.higherIsBetter ? change.direction === 'down' : change.direction === 'up';

    if (change.direction === 'neutral') {
      return { icon: Minus, color: 'text-muted-foreground', label: 'No change' };
    } else if (isPositive) {
      return { 
        icon: change.direction === 'up' ? TrendingUp : TrendingDown, 
        color: 'text-success', 
        label: `${change.value > 0 ? '+' : ''}${change.value.toFixed(1)}%` 
      };
    } else {
      return { 
        icon: change.direction === 'up' ? TrendingUp : TrendingDown, 
        color: 'text-destructive', 
        label: `${change.value > 0 ? '+' : ''}${change.value.toFixed(1)}%` 
      };
    }
  };

  // Generate CSV export
  const generateCSV = (): string => {
    const rows: string[] = [];
    
    rows.push('HumanFirst Weekly Pilot Snapshot');
    rows.push(`Organization: ${organizationName}`);
    rows.push(`Report Period: Week ${weekNumber} (${formatDate(weekStart, 'MMM d')} - ${formatDate(weekEnd, 'MMM d, yyyy')})`);
    rows.push(`Generated: ${formatDate(new Date(), 'PPpp')}`);
    rows.push('');
    
    rows.push('KEY METRICS');
    rows.push('Metric,Current Value,Previous Value,Change');
    metrics.forEach(m => {
      const change = getChange(m.currentValue, m.previousValue);
      rows.push(`${m.label},${formatValue(m.currentValue, m.format)},${formatValue(m.previousValue, m.format)},${change.value.toFixed(1)}%`);
    });
    rows.push('');
    
    rows.push('STATUS INDICATORS');
    rows.push(`Overall Status: ${getOverallStatus().toUpperCase()}`);
    rows.push('');
    
    if (highlights.length > 0) {
      rows.push('HIGHLIGHTS');
      highlights.forEach(h => rows.push(`"${h}"`));
      rows.push('');
    }
    
    if (concerns.length > 0) {
      rows.push('AREAS OF ATTENTION');
      concerns.forEach(c => rows.push(`"${c}"`));
      rows.push('');
    }
    
    if (riskSignals.length > 0) {
      rows.push('RISK SIGNALS');
      riskSignals.forEach(r => rows.push(`"${r}"`));
      rows.push('');
    }
    
    rows.push('WEEKLY TRENDS');
    rows.push('Week,Enrolled Devices,Compliance Rate,Integrity Events,AI Blocks,Avg Trust Score');
    trends.forEach(t => {
      rows.push(`${t.week},${t.enrolledDevices},${t.complianceRate}%,${t.tamperEvents},${t.aiBlocks},${t.avgTrustScore}`);
    });
    
    rows.push('');
    rows.push('PRIVACY STATEMENT');
    rows.push('"This report contains aggregate metrics only. No individual student data or personal information is included."');
    
    return rows.join('\n');
  };

  // Generate HTML/PDF export
  const generateHTML = (): string => {
    const status = getOverallStatus();
    const statusColor = status === 'green' ? '#059669' : status === 'amber' ? '#d97706' : '#dc2626';
    const statusBg = status === 'green' ? '#d1fae5' : status === 'amber' ? '#fef3c7' : '#fee2e2';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Weekly Pilot Snapshot - ${organizationName}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #1a1a1a; }
    h1 { color: #0d9488; border-bottom: 3px solid #0d9488; padding-bottom: 12px; margin-bottom: 8px; }
    h2 { color: #374151; margin-top: 32px; font-size: 18px; }
    .meta { color: #6b7280; margin-bottom: 24px; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; background: ${statusBg}; color: ${statusColor}; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin: 20px 0; }
    .metric { background: #f9fafb; padding: 16px; border-radius: 12px; border-left: 4px solid #0d9488; }
    .metric-value { font-size: 28px; font-weight: 700; color: #1a1a1a; }
    .metric-label { color: #6b7280; font-size: 13px; margin-bottom: 4px; }
    .metric-change { font-size: 12px; margin-top: 4px; }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .neutral { color: #6b7280; }
    .section { margin: 24px 0; padding: 16px; border-radius: 12px; }
    .highlights { background: #d1fae5; border: 1px solid #6ee7b7; }
    .concerns { background: #fef3c7; border: 1px solid #fcd34d; }
    .risks { background: #fee2e2; border: 1px solid #fca5a5; }
    .section h3 { margin: 0 0 12px 0; font-size: 14px; font-weight: 600; }
    .section ul { margin: 0; padding-left: 20px; }
    .section li { margin: 4px 0; font-size: 14px; }
    .trend-chart { margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .privacy-note { background: #f0fdfa; padding: 16px; border-radius: 12px; margin-top: 32px; font-size: 13px; border: 1px solid #99f6e4; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <h1>📊 Weekly Pilot Snapshot</h1>
  <div class="meta">
    <p><strong>Organization:</strong> ${organizationName}</p>
    <p><strong>Report Period:</strong> Week ${weekNumber} (${formatDate(weekStart, 'MMM d')} - ${formatDate(weekEnd, 'MMM d, yyyy')})</p>
    <p><strong>Overall Status:</strong> <span class="status-badge">${status === 'green' ? '✓ Healthy' : status === 'amber' ? '⚠ Attention Needed' : '✕ Action Required'}</span></p>
  </div>
  
  <h2>Key Metrics</h2>
  <div class="metric-grid">
    ${metrics.map(m => {
      const trend = getTrendIndicator(m);
      const changeClass = trend.color.includes('success') ? 'positive' : trend.color.includes('destructive') ? 'negative' : 'neutral';
      return `
        <div class="metric">
          <div class="metric-label">${m.label}</div>
          <div class="metric-value">${formatValue(m.currentValue, m.format)}</div>
          <div class="metric-change ${changeClass}">${trend.label} vs. last week</div>
        </div>
      `;
    }).join('')}
  </div>
  
  ${highlights.length > 0 ? `
  <div class="section highlights">
    <h3>✓ Weekly Highlights</h3>
    <ul>${highlights.map(h => `<li>${h}</li>`).join('')}</ul>
  </div>
  ` : ''}
  
  ${concerns.length > 0 ? `
  <div class="section concerns">
    <h3>⚠ Areas of Attention</h3>
    <ul>${concerns.map(c => `<li>${c}</li>`).join('')}</ul>
  </div>
  ` : ''}
  
  ${riskSignals.length > 0 ? `
  <div class="section risks">
    <h3>⚠ Risk Signals</h3>
    <ul>${riskSignals.map(r => `<li>${r}</li>`).join('')}</ul>
  </div>
  ` : ''}
  
  <h2>Weekly Trends</h2>
  <table>
    <tr>
      <th>Week</th>
      <th>Devices</th>
      <th>Compliance</th>
      <th>Events</th>
      <th>AI Blocks</th>
      <th>Trust Score</th>
    </tr>
    ${trends.map(t => `
    <tr>
      <td>Week ${t.week}</td>
      <td>${t.enrolledDevices}</td>
      <td>${t.complianceRate}%</td>
      <td>${t.tamperEvents}</td>
      <td>${t.aiBlocks}</td>
      <td>${t.avgTrustScore}/100</td>
    </tr>
    `).join('')}
  </table>
  
  <div class="privacy-note">
    <strong>Privacy Statement:</strong> This report contains aggregate metrics only. No individual student data, content, keystrokes, or personal information is included.
  </div>
  
  <div class="footer">
    Generated by HumanFirst | Academic Integrity Through Transparency | ${formatDate(new Date(), 'PPpp')}
  </div>
</body>
</html>
    `;
  };

  const handleExport = async (exportFormat: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const content = exportFormat === 'csv' ? generateCSV() : generateHTML();
      const mimeType = exportFormat === 'csv' ? 'text/csv' : 'text/html';
      const extension = exportFormat === 'csv' ? 'csv' : 'html';
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `humanfirst-weekly-snapshot-week${weekNumber}-${formatDate(new Date(), 'yyyy-MM-dd')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Report exported',
        description: `Your ${exportFormat.toUpperCase()} snapshot has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'There was an error generating the report.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Weekly Pilot Snapshot</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Week {weekNumber}: {formatDate(weekStart, 'MMM d')} - {formatDate(weekEnd, 'MMM d, yyyy')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator
              level={getOverallStatus()}
              label={getOverallStatus() === 'green' ? 'Healthy' : getOverallStatus() === 'amber' ? 'Attention' : 'Critical'}
              size="md"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {metrics.map((metric) => {
                const trend = getTrendIndicator(metric);
                const TrendIcon = trend.icon;
                
                return (
                  <div key={metric.label} className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                    <p className="text-2xl font-bold">{formatValue(metric.currentValue, metric.format)}</p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${trend.color}`}>
                      <TrendIcon className="w-3 h-3" />
                      <span>{trend.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Separator />
            
            {/* Highlights & Concerns */}
            <div className="grid md:grid-cols-2 gap-4">
              {highlights.length > 0 && (
                <div className="p-4 bg-success/10 border border-success/30 rounded-xl">
                  <h4 className="font-semibold text-success mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Highlights
                  </h4>
                  <ul className="space-y-2">
                    {highlights.map((h, i) => (
                      <li key={i} className="text-sm text-success flex items-start gap-2">
                        <span className="text-success/70">•</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {concerns.length > 0 && (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
                  <h4 className="font-semibold text-warning mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Areas of Attention
                  </h4>
                  <ul className="space-y-2">
                    {concerns.map((c, i) => (
                      <li key={i} className="text-sm text-warning flex items-start gap-2">
                        <span className="text-warning/70">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {riskSignals.length > 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                <h4 className="font-semibold text-destructive mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Risk Signals
                </h4>
                <ul className="space-y-2">
                  {riskSignals.map((r, i) => (
                    <li key={i} className="text-sm text-destructive flex items-start gap-2">
                      <span className="text-destructive/70">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-4 mt-6">
            <div className="p-4 bg-muted/30 rounded-xl">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Weekly Trend Data
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Week</th>
                      <th className="text-right py-2 px-3">Devices</th>
                      <th className="text-right py-2 px-3">Compliance</th>
                      <th className="text-right py-2 px-3">Events</th>
                      <th className="text-right py-2 px-3">AI Blocks</th>
                      <th className="text-right py-2 px-3">Trust</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map((trend) => (
                      <tr key={trend.week} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">Week {trend.week}</td>
                        <td className="text-right py-2 px-3">{trend.enrolledDevices}</td>
                        <td className="text-right py-2 px-3">{trend.complianceRate}%</td>
                        <td className="text-right py-2 px-3">{trend.tamperEvents}</td>
                        <td className="text-right py-2 px-3">{trend.aiBlocks}</td>
                        <td className="text-right py-2 px-3">{trend.avgTrustScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="export" className="space-y-4 mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Download className="w-8 h-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">Download Report</h4>
                    <p className="text-sm text-muted-foreground">Export snapshot as PDF or CSV</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleExport('csv')}
                    disabled={exporting}
                  >
                    {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    CSV
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleExport('pdf')}
                    disabled={exporting}
                  >
                    {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    PDF Report
                  </Button>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Send className="w-8 h-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">Email Report</h4>
                    <p className="text-sm text-muted-foreground">Send to stakeholders</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onSendReport?.([])}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Weekly Snapshot
                </Button>
              </Card>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span>Preview before sending</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Auto-generated weekly
              </Badge>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WeeklySnapshotReport;
