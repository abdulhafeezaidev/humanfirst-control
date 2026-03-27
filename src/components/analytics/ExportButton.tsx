import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  summary: {
    pilotStartDate: string;
    pilotEndDate?: string;
    totalDevices: number;
    activeStudents: number;
    complianceRate: number;
    aiBlockAttempts: number;
    policyViolations: number;
    tamperAttempts: number;
  };
  metrics: {
    label: string;
    before: number;
    during: number;
    delta: number;
  }[];
  status: {
    overall: 'green' | 'amber' | 'red';
    compliance: 'green' | 'amber' | 'red';
    integrity: 'green' | 'amber' | 'red';
  };
}

interface ExportButtonProps {
  data: AnalyticsData;
  organizationName?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ data, organizationName = 'Organization' }) => {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const formatStatusLabel = (status: 'green' | 'amber' | 'red'): string => {
    return status === 'green' ? 'Good' : status === 'amber' ? 'Needs Attention' : 'Critical';
  };

  const generateCSV = (): string => {
    const rows: string[] = [];
    
    // Header
    rows.push('HumanFirst Pilot Report');
    rows.push(`Organization: ${organizationName}`);
    rows.push(`Generated: ${new Date().toLocaleDateString()}`);
    rows.push(`Pilot Period: ${data.summary.pilotStartDate} - ${data.summary.pilotEndDate || 'Ongoing'}`);
    rows.push('');
    
    // Summary
    rows.push('SUMMARY METRICS');
    rows.push('Metric,Value');
    rows.push(`Total Enrolled Devices,${data.summary.totalDevices}`);
    rows.push(`Active Participants,${data.summary.activeStudents}`);
    rows.push(`Compliance Rate,${data.summary.complianceRate}%`);
    rows.push(`AI Access Restriction Events,${data.summary.aiBlockAttempts}`);
    rows.push(`Policy Deviation Events,${data.summary.policyViolations}`);
    rows.push(`Integrity Events,${data.summary.tamperAttempts}`);
    rows.push('');
    
    // Status
    rows.push('STATUS INDICATORS');
    rows.push('Category,Status');
    rows.push(`Overall Health,${formatStatusLabel(data.status.overall)}`);
    rows.push(`Compliance,${formatStatusLabel(data.status.compliance)}`);
    rows.push(`System Integrity,${formatStatusLabel(data.status.integrity)}`);
    rows.push('');
    
    // Comparison
    rows.push('BEFORE VS DURING PILOT COMPARISON');
    rows.push('Metric,Before Pilot,During Pilot,Change (%)');
    data.metrics.forEach(m => {
      rows.push(`${m.label},${m.before},${m.during},${m.delta > 0 ? '+' : ''}${m.delta.toFixed(1)}%`);
    });
    
    // Privacy statement
    rows.push('');
    rows.push('PRIVACY STATEMENT');
    rows.push('"This report contains aggregate metrics only. No individual student data, content, keystrokes, or personal information is included."');
    
    return rows.join('\n');
  };

  const generatePDFContent = (): string => {
    // Generate HTML content for PDF-like export
    return `
<!DOCTYPE html>
<html>
<head>
  <title>HumanFirst Pilot Report - ${organizationName}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
    h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 12px; }
    h2 { color: #374151; margin-top: 32px; }
    .meta { color: #6b7280; margin-bottom: 24px; }
    .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0; }
    .metric { background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #0d9488; }
    .metric-value { font-size: 28px; font-weight: 700; color: #1a1a1a; }
    .metric-label { color: #6b7280; font-size: 14px; }
    .status-green { color: #059669; background: #d1fae5; padding: 4px 12px; border-radius: 20px; display: inline-block; }
    .status-amber { color: #d97706; background: #fef3c7; padding: 4px 12px; border-radius: 20px; display: inline-block; }
    .status-red { color: #dc2626; background: #fee2e2; padding: 4px 12px; border-radius: 20px; display: inline-block; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .privacy-note { background: #f0fdfa; padding: 16px; border-radius: 8px; margin-top: 32px; font-size: 14px; border: 1px solid #99f6e4; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>HumanFirst Pilot Report</h1>
  <div class="meta">
    <p><strong>Organization:</strong> ${organizationName}</p>
    <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()}</p>
    <p><strong>Pilot Period:</strong> ${data.summary.pilotStartDate} - ${data.summary.pilotEndDate || 'Ongoing'}</p>
  </div>
  
  <h2>Summary Metrics</h2>
  <div class="metric-grid">
    <div class="metric">
      <div class="metric-value">${data.summary.totalDevices}</div>
      <div class="metric-label">Enrolled Devices</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.summary.activeStudents}</div>
      <div class="metric-label">Active Participants</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.summary.complianceRate}%</div>
      <div class="metric-label">Compliance Rate</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.summary.tamperAttempts}</div>
      <div class="metric-label">Integrity Events</div>
    </div>
  </div>
  
  <h2>Status Indicators</h2>
  <table>
    <tr>
      <th>Category</th>
      <th>Status</th>
    </tr>
    <tr>
      <td>Overall Health</td>
      <td><span class="status-${data.status.overall}">${formatStatusLabel(data.status.overall)}</span></td>
    </tr>
    <tr>
      <td>Compliance</td>
      <td><span class="status-${data.status.compliance}">${formatStatusLabel(data.status.compliance)}</span></td>
    </tr>
    <tr>
      <td>System Integrity</td>
      <td><span class="status-${data.status.integrity}">${formatStatusLabel(data.status.integrity)}</span></td>
    </tr>
  </table>
  
  <h2>Before vs During Pilot Comparison</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Before Pilot</th>
      <th>During Pilot</th>
      <th>Change</th>
    </tr>
    ${data.metrics.map(m => `
    <tr>
      <td>${m.label}</td>
      <td>${m.before}</td>
      <td>${m.during}</td>
      <td class="${m.delta >= 0 ? 'positive' : 'negative'}">${m.delta > 0 ? '+' : ''}${m.delta.toFixed(1)}%</td>
    </tr>
    `).join('')}
  </table>
  
  <div class="privacy-note">
    <strong>Privacy Statement:</strong> This report contains aggregate metrics only. No individual student data, content, keystrokes, or personal information is included. HumanFirst does not read, store, or analyze student work, communications, or browsing content.
  </div>
  
  <div class="footer">
    Generated by HumanFirst | Academic Integrity Through Transparency | ${new Date().toISOString()}
  </div>
</body>
</html>
    `;
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    
    try {
      if (format === 'csv') {
        const csv = generateCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `humanfirst-pilot-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const html = generatePDFContent();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `humanfirst-pilot-report-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: 'Report exported',
        description: `Your ${format.toUpperCase()} report has been downloaded.`,
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting}>
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="w-4 h-4 mr-2" />
          Download Report (HTML)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;
