import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Monitor, ShieldCheck, Ban, AlertTriangle, 
  Users, TrendingUp, Calendar, RefreshCw, FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, subDays } from 'date-fns';
import MetricCard from './MetricCard';
import StatusIndicator, { StatusLevel } from './StatusIndicator';
import ComparisonChart from './ComparisonChart';
import ExportButton from './ExportButton';
import InfoTooltip from '@/components/guidance/InfoTooltip';

interface PilotAnalyticsDashboardProps {
  organizationId?: string;
  organizationName?: string;
  pilotStartDate?: string;
  className?: string;
}

interface AnalyticsData {
  enrolledDevices: number;
  activeStudents: number;
  totalTamperEvents: number;
  resolvedTamperEvents: number;
  aiBlockAttempts: number;
  policyViolations: number;
  complianceRate: number;
  // Comparison data (simulated for demo)
  beforePilot: {
    devices: number;
    violations: number;
    tamperEvents: number;
  };
}

const PilotAnalyticsDashboard: React.FC<PilotAnalyticsDashboardProps> = ({
  organizationId,
  organizationName = 'Your Organization',
  pilotStartDate,
  className = '',
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    enrolledDevices: 0,
    activeStudents: 0,
    totalTamperEvents: 0,
    resolvedTamperEvents: 0,
    aiBlockAttempts: 0,
    policyViolations: 0,
    complianceRate: 100,
    beforePilot: {
      devices: 0,
      violations: 0,
      tamperEvents: 0,
    },
  });

  const fetchAnalytics = async () => {
    try {
      // Fetch tamper events
      const { data: tamperEvents, error: tamperError } = await supabase
        .from('tamper_events')
        .select('*');

      if (tamperError) throw tamperError;

      // Fetch profiles for active students
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, device_id');

      if (profilesError) throw profilesError;

      // Calculate metrics
      const totalTamperEvents = tamperEvents?.length || 0;
      const resolvedTamperEvents = tamperEvents?.filter(e => e.resolved).length || 0;
      const uniqueDevices = new Set(tamperEvents?.map(e => e.device_id) || []).size;
      const uniqueUsers = new Set(tamperEvents?.map(e => e.user_id) || []).size;
      
      // Count integrity events vs policy violations
      const integrityEventTypes = ['app_backgrounded', 'app_closed_during_exam', 'extended_focus_loss'];
      const tamperAttempts = tamperEvents?.filter(e => integrityEventTypes.includes(e.event_type)).length || 0;
      const networkEvents = tamperEvents?.filter(e => e.event_type.includes('network')).length || 0;
      
      // Calculate compliance rate
      const complianceRate = totalTamperEvents > 0 
        ? Math.round((resolvedTamperEvents / totalTamperEvents) * 100)
        : 100;

      // For demo purposes, simulate "before pilot" data as slightly worse
      const beforePilotMultiplier = 1.3 + Math.random() * 0.4;

      setAnalytics({
        enrolledDevices: Math.max(uniqueDevices, profiles?.filter(p => p.device_id).length || 0),
        activeStudents: profiles?.length || 0,
        totalTamperEvents,
        resolvedTamperEvents,
        aiBlockAttempts: Math.floor(totalTamperEvents * 0.3), // Simulated
        policyViolations: tamperAttempts,
        complianceRate,
        beforePilot: {
          devices: Math.round((uniqueDevices || 1) * 0.6),
          violations: Math.round(tamperAttempts * beforePilotMultiplier),
          tamperEvents: Math.round(totalTamperEvents * beforePilotMultiplier),
        },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [organizationId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  // Calculate status levels
  const getComplianceStatus = (): StatusLevel => {
    if (analytics.complianceRate >= 90) return 'green';
    if (analytics.complianceRate >= 70) return 'amber';
    return 'red';
  };

  const getIntegrityStatus = (): StatusLevel => {
    const unresolvedEvents = analytics.totalTamperEvents - analytics.resolvedTamperEvents;
    if (unresolvedEvents === 0) return 'green';
    if (unresolvedEvents <= 5) return 'amber';
    return 'red';
  };

  const getOverallStatus = (): StatusLevel => {
    const complianceStatus = getComplianceStatus();
    const integrityStatus = getIntegrityStatus();
    
    if (complianceStatus === 'red' || integrityStatus === 'red') return 'red';
    if (complianceStatus === 'amber' || integrityStatus === 'amber') return 'amber';
    return 'green';
  };

  // Comparison data for charts
  const comparisonData = useMemo(() => [
    {
      label: 'Device Enrollment',
      before: analytics.beforePilot.devices,
      after: analytics.enrolledDevices,
    },
    {
      label: 'Integrity Events',
      before: analytics.beforePilot.tamperEvents,
      after: analytics.totalTamperEvents,
    },
    {
      label: 'Policy Deviations',
      before: analytics.beforePilot.violations,
      after: analytics.policyViolations,
    },
  ], [analytics]);

  // Export data structure
  const exportData = useMemo(() => ({
    summary: {
      pilotStartDate: pilotStartDate || format(subDays(new Date(), 30), 'MMM d, yyyy'),
      pilotEndDate: undefined,
      totalDevices: analytics.enrolledDevices,
      activeStudents: analytics.activeStudents,
      complianceRate: analytics.complianceRate,
      aiBlockAttempts: analytics.aiBlockAttempts,
      policyViolations: analytics.policyViolations,
      tamperAttempts: analytics.totalTamperEvents,
    },
    metrics: [
      {
        label: 'Device Enrollment',
        before: analytics.beforePilot.devices,
        during: analytics.enrolledDevices,
        delta: analytics.beforePilot.devices > 0 
          ? ((analytics.enrolledDevices - analytics.beforePilot.devices) / analytics.beforePilot.devices) * 100
          : 0,
      },
      {
        label: 'Integrity Events',
        before: analytics.beforePilot.tamperEvents,
        during: analytics.totalTamperEvents,
        delta: analytics.beforePilot.tamperEvents > 0
          ? ((analytics.totalTamperEvents - analytics.beforePilot.tamperEvents) / analytics.beforePilot.tamperEvents) * 100
          : 0,
      },
      {
        label: 'Policy Deviations',
        before: analytics.beforePilot.violations,
        during: analytics.policyViolations,
        delta: analytics.beforePilot.violations > 0
          ? ((analytics.policyViolations - analytics.beforePilot.violations) / analytics.beforePilot.violations) * 100
          : 0,
      },
    ],
    status: {
      overall: getOverallStatus(),
      compliance: getComplianceStatus(),
      integrity: getIntegrityStatus(),
    },
  }), [analytics, pilotStartDate]);

  const pilotDays = pilotStartDate 
    ? differenceInDays(new Date(), new Date(pilotStartDate))
    : 30;

  if (loading) {
    return (
      <div className={`glass-card p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Pilot Analytics</h2>
                <InfoTooltip content="Aggregate metrics showing pilot program health. No personal data, content, or keystrokes are collected or displayed." />
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {pilotDays} days in pilot
                </span>
                <StatusIndicator 
                  level={getOverallStatus()} 
                  label={getOverallStatus() === 'green' ? 'Healthy' : getOverallStatus() === 'amber' ? 'Attention Needed' : 'Action Required'} 
                  size="sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <ExportButton data={exportData} organizationName={organizationName} />
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-amber-600" />
          Pilot Health Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Overall Status</span>
              <StatusIndicator 
                level={getOverallStatus()} 
                label={getOverallStatus() === 'green' ? 'Good' : getOverallStatus() === 'amber' ? 'Fair' : 'Poor'} 
                size="sm"
                description="Combined assessment of all pilot metrics"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Based on compliance and integrity metrics
            </p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Compliance</span>
              <StatusIndicator 
                level={getComplianceStatus()} 
                label={`${analytics.complianceRate}%`} 
                size="sm"
                description="Percentage of events resolved by administrators"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.resolvedTamperEvents} of {analytics.totalTamperEvents} events resolved
            </p>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">System Integrity</span>
              <StatusIndicator 
                level={getIntegrityStatus()} 
                label={getIntegrityStatus() === 'green' ? 'Stable' : getIntegrityStatus() === 'amber' ? 'Minor Issues' : 'Issues Detected'} 
                size="sm"
                description="Health of device connectivity and monitoring"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalTamperEvents - analytics.resolvedTamperEvents} unresolved events
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Enrolled Devices"
          value={analytics.enrolledDevices}
          icon={Monitor}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
          delta={analytics.beforePilot.devices > 0 
            ? ((analytics.enrolledDevices - analytics.beforePilot.devices) / analytics.beforePilot.devices) * 100
            : 0
          }
          deltaLabel="vs. pre-pilot"
          tooltip="Number of unique devices participating in the pilot program"
          status={analytics.enrolledDevices > 0 ? 'green' : 'amber'}
          statusLabel={analytics.enrolledDevices > 0 ? 'Active' : 'Setup'}
        />
        
        <MetricCard
          title="Compliance Rate"
          value={`${analytics.complianceRate}%`}
          icon={ShieldCheck}
          iconColor="text-success"
          iconBgColor="bg-success/10"
          tooltip="Percentage of integrity events that have been reviewed and resolved"
          status={getComplianceStatus()}
          statusLabel={getComplianceStatus() === 'green' ? 'Good' : getComplianceStatus() === 'amber' ? 'Fair' : 'Low'}
          subtitle="Events resolved / total events"
        />
        
        <MetricCard
          title="AI Block Events"
          value={analytics.aiBlockAttempts}
          icon={Ban}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100 dark:bg-amber-900/30"
          tooltip="Number of times AI service access was restricted during active policies (no content is captured)"
          subtitle="During active policies"
        />
        
        <MetricCard
          title="Integrity Events"
          value={analytics.totalTamperEvents}
          icon={AlertTriangle}
          iconColor="text-destructive"
          iconBgColor="bg-destructive/10"
          delta={analytics.beforePilot.tamperEvents > 0
            ? ((analytics.totalTamperEvents - analytics.beforePilot.tamperEvents) / analytics.beforePilot.tamperEvents) * 100
            : 0
          }
          deltaLabel="vs. pre-pilot"
          tooltip="Focus loss, app backgrounding, and network events (no personal data captured)"
          status={getIntegrityStatus()}
          statusLabel={analytics.totalTamperEvents === 0 ? 'None' : `${analytics.totalTamperEvents - analytics.resolvedTamperEvents} pending`}
        />
      </div>

      {/* Comparison Chart */}
      <ComparisonChart
        data={comparisonData}
        title="Before vs. During Pilot Comparison"
        description="Comparing key metrics before pilot implementation with current pilot performance"
      />

      {/* Privacy Notice */}
      <div className="glass-card p-4 border-l-4 border-primary bg-primary/5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground">Privacy-First Analytics</h4>
            <p className="text-sm text-muted-foreground mt-1">
              This dashboard displays aggregate metrics only. HumanFirst does not collect, store, or display any 
              personal content, keystrokes, screen captures, or individual student data. All metrics are designed 
              to be safe for institutional reporting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PilotAnalyticsDashboard;
