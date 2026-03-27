/**
 * Compliance Report Schema
 * 
 * Privacy-preserving report structure for institutional compliance.
 * No individual student data, aggregate metrics only.
 */

export interface ComplianceReportConfig {
  // Date Range
  startDate: Date;
  endDate: Date;
  
  // Report Options
  includeUptime: boolean;
  includePolicies: boolean;
  includeViolations: boolean;
  includeCompliance: boolean;
  
  // Branding
  organizationName: string;
  organizationLogo?: string;
  reportTitle?: string;
}

export interface PolicySummary {
  id: string;
  title: string;
  type: 'exam' | 'focus' | 'custom';
  enforcementLevel: 'strict' | 'soft';
  status: 'active' | 'disabled' | 'scheduled';
  activeDays: number;
  totalSessions: number;
}

export interface ViolationSummary {
  totalEvents: number;
  resolvedEvents: number;
  unresolvedEvents: number;
  resolutionRate: number;
  avgResolutionTimeHours: number | null;
  eventsByType: Record<string, number>;
}

export interface UptimeSummary {
  averageUptime: number;
  downtimeIncidents: number;
  totalHoursMonitored: number;
  uptimeByDay: { date: string; uptime: number }[];
}

export interface ComplianceSummary {
  overallScore: number;
  trend: 'improving' | 'stable' | 'declining';
  factors: {
    policyCoverage: number;
    eventResolution: number;
    adminActivity: number;
  };
}

export interface ComplianceReport {
  // Metadata
  id: string;
  generatedAt: string;
  generatedBy: string;
  reportPeriod: {
    start: string;
    end: string;
    days: number;
  };
  
  // Organization
  organization: {
    id: string;
    name: string;
    planType: string;
  };
  
  // Report Sections
  policies: PolicySummary[];
  violations: ViolationSummary;
  uptime: UptimeSummary;
  compliance: ComplianceSummary;
  
  // Activity Summary
  activity: {
    totalAdminActions: number;
    activeAdmins: number;
    topActions: { action: string; count: number }[];
  };
  
  // Privacy Statement
  privacyStatement: string;
}

export interface ReportExportOptions {
  format: 'pdf' | 'csv';
  includeCharts: boolean;
  includeBranding: boolean;
}

export const DEFAULT_PRIVACY_STATEMENT = `This compliance report contains aggregate metrics only. No individual student names, identifiers, content, keystrokes, or personal information is included. All data is institution-scoped and computed from audit logs without content inspection.`;
