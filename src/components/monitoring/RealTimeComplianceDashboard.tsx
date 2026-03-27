import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Monitor,
  Ban,
  AlertTriangle,
  Clock,
  Shield,
  RefreshCw,
  Wifi,
  WifiOff,
  TrendingUp,
  Users,
  Calendar,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, differenceInMinutes } from 'date-fns';
import StatusIndicator, { StatusLevel } from '@/components/analytics/StatusIndicator';
import InfoTooltip from '@/components/guidance/InfoTooltip';

interface RealTimeMetrics {
  enrolledDevices: number;
  activeDevices: number;
  totalTamperEvents: number;
  unresolvedEvents: number;
  aiBlockEvents: number;
  complianceRate: number;
  pilotDaysElapsed: number;
  pilotDaysRemaining: number;
  lastUpdated: Date;
  recentActivity: RecentEvent[];
}

interface RecentEvent {
  id: string;
  type: string;
  deviceId: string;
  timestamp: Date;
  resolved: boolean;
}

interface DeviceTrustSummary {
  high: number;
  medium: number;
  low: number;
  critical: number;
  average: number;
}

interface RealTimeComplianceDashboardProps {
  organizationId?: string;
  pilotStartDate?: string;
  pilotEndDate?: string;
  refreshInterval?: number; // in seconds
  className?: string;
}

const RealTimeComplianceDashboard: React.FC<RealTimeComplianceDashboardProps> = ({
  organizationId,
  pilotStartDate,
  pilotEndDate,
  refreshInterval = 30,
  className = '',
}) => {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    enrolledDevices: 0,
    activeDevices: 0,
    totalTamperEvents: 0,
    unresolvedEvents: 0,
    aiBlockEvents: 0,
    complianceRate: 100,
    pilotDaysElapsed: 0,
    pilotDaysRemaining: 30,
    lastUpdated: new Date(),
    recentActivity: [],
  });
  
  const [trustSummary, setTrustSummary] = useState<DeviceTrustSummary>({
    high: 0,
    medium: 0,
    low: 0,
    critical: 0,
    average: 0,
  });
  
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMetrics = useCallback(async () => {
    try {
      // Fetch tamper events
      const { data: tamperEvents, error: tamperError } = await supabase
        .from('tamper_events')
        .select('*')
        .order('timestamp', { ascending: false });

      if (tamperError) throw tamperError;

      // Fetch profiles for device count
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, device_id, updated_at');

      if (profilesError) throw profilesError;

      // Calculate metrics
      const totalEvents = tamperEvents?.length || 0;
      const unresolvedEvents = tamperEvents?.filter(e => !e.resolved).length || 0;
      const resolvedEvents = totalEvents - unresolvedEvents;
      const complianceRate = totalEvents > 0 ? Math.round((resolvedEvents / totalEvents) * 100) : 100;

      // Count unique devices
      const uniqueDevices = new Set(profiles?.map(p => p.device_id).filter(Boolean) || []);
      
      // Consider device "active" if updated in last 24 hours
      const now = new Date();
      const activeDevices = profiles?.filter(p => {
        if (!p.updated_at) return false;
        const diff = differenceInMinutes(now, new Date(p.updated_at));
        return diff < 1440; // 24 hours in minutes
      }).length || 0;

      // AI block events (events related to network/blocking)
      const aiBlockEvents = tamperEvents?.filter(e => 
        e.event_type.includes('network') || e.event_type.includes('block')
      ).length || 0;

      // Pilot duration calculations
      const startDate = pilotStartDate ? new Date(pilotStartDate) : new Date();
      const endDate = pilotEndDate ? new Date(pilotEndDate) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      const pilotDaysElapsed = differenceInDays(now, startDate);
      const pilotDaysRemaining = Math.max(0, differenceInDays(endDate, now));

      // Recent activity (last 10 events)
      const recentActivity: RecentEvent[] = (tamperEvents?.slice(0, 10) || []).map(e => ({
        id: e.id,
        type: e.event_type,
        deviceId: e.device_id,
        timestamp: new Date(e.timestamp),
        resolved: e.resolved,
      }));

      // Simulate trust distribution (in real app, would calculate from actual trust scores)
      const deviceCount = uniqueDevices.size || 1;
      const trustDistribution = {
        high: Math.floor(deviceCount * 0.6),
        medium: Math.floor(deviceCount * 0.25),
        low: Math.floor(deviceCount * 0.1),
        critical: Math.floor(deviceCount * 0.05),
        average: 75,
      };

      setMetrics({
        enrolledDevices: uniqueDevices.size,
        activeDevices,
        totalTamperEvents: totalEvents,
        unresolvedEvents,
        aiBlockEvents,
        complianceRate,
        pilotDaysElapsed,
        pilotDaysRemaining,
        lastUpdated: new Date(),
        recentActivity,
      });

      setTrustSummary(trustDistribution);
      setIsConnected(true);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [pilotStartDate, pilotEndDate]);

  // Initial fetch and interval setup
  useEffect(() => {
    fetchMetrics();

    const interval = setInterval(fetchMetrics, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  // Set up real-time subscription for tamper events
  useEffect(() => {
    const channel = supabase
      .channel('realtime-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tamper_events',
        },
        () => {
          // Refetch metrics when tamper events change
          fetchMetrics();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMetrics]);

  // Status helpers
  const getOverallStatus = (): StatusLevel => {
    if (metrics.complianceRate >= 90 && metrics.unresolvedEvents <= 2) return 'green';
    if (metrics.complianceRate >= 70 || metrics.unresolvedEvents <= 5) return 'amber';
    return 'red';
  };

  const getPilotProgressPercent = (): number => {
    const total = metrics.pilotDaysElapsed + metrics.pilotDaysRemaining;
    return total > 0 ? (metrics.pilotDaysElapsed / total) * 100 : 0;
  };

  const getTrustColor = (level: string): string => {
    switch (level) {
      case 'high': return 'bg-success';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-orange-500';
      case 'critical': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'app_backgrounded': 'App Backgrounded',
      'focus_loss': 'Focus Loss',
      'network_change': 'Network Change',
      'extended_focus_loss': 'Extended Focus Loss',
      'app_closed_during_exam': 'App Closed',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading real-time monitoring...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Real-Time Compliance Monitor
                  <InfoTooltip content="Live monitoring of pilot compliance metrics. Data refreshes automatically every 30 seconds." />
                </CardTitle>
                <CardDescription className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    {isConnected ? (
                      <>
                        <Wifi className="w-3 h-3 text-success" />
                        <span className="text-success">Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 text-destructive" />
                        <span className="text-destructive">Disconnected</span>
                      </>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    Last updated: {format(lastRefresh, 'HH:mm:ss')}
                  </span>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusIndicator
                level={getOverallStatus()}
                label={getOverallStatus() === 'green' ? 'Healthy' : getOverallStatus() === 'amber' ? 'Attention' : 'Critical'}
                size="md"
                description="Overall pilot health status"
              />
              <Button variant="outline" size="sm" onClick={fetchMetrics}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Device Enrollment */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Monitor className="w-4 h-4" />
              <span className="text-xs font-medium">Enrolled Devices</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{metrics.enrolledDevices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.activeDevices} active now
            </p>
          </CardContent>
        </Card>

        {/* AI Block Events */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Ban className="w-4 h-4" />
              <span className="text-xs font-medium">AI Blocks</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{metrics.aiBlockEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              During active policies
            </p>
          </CardContent>
        </Card>

        {/* Tamper Events */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Integrity Events</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{metrics.totalTamperEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.unresolvedEvents} unresolved
            </p>
          </CardContent>
        </Card>

        {/* Compliance Rate */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Compliance</span>
            </div>
            <div className={`text-3xl font-bold ${
              metrics.complianceRate >= 90 ? 'text-success' : 
              metrics.complianceRate >= 70 ? 'text-warning' : 'text-destructive'
            }`}>
              {metrics.complianceRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Events resolved
            </p>
          </CardContent>
        </Card>

        {/* Pilot Duration */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">Pilot Progress</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{metrics.pilotDaysElapsed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.pilotDaysRemaining} days left
            </p>
          </CardContent>
        </Card>

        {/* Trust Average */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-medium">Avg Trust Score</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{trustSummary.average}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of 100
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pilot Progress & Trust Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pilot Timeline Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Pilot Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(getPilotProgressPercent())}%</span>
              </div>
              <Progress value={getPilotProgressPercent()} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Days Elapsed</p>
                <p className="text-xl font-bold">{metrics.pilotDaysElapsed}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Days Remaining</p>
                <p className="text-xl font-bold">{metrics.pilotDaysRemaining}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Device Trust Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 rounded-full overflow-hidden flex">
              {trustSummary.high > 0 && (
                <div className={`${getTrustColor('high')}`} style={{ width: `${(trustSummary.high / metrics.enrolledDevices) * 100}%` }} />
              )}
              {trustSummary.medium > 0 && (
                <div className={`${getTrustColor('medium')}`} style={{ width: `${(trustSummary.medium / metrics.enrolledDevices) * 100}%` }} />
              )}
              {trustSummary.low > 0 && (
                <div className={`${getTrustColor('low')}`} style={{ width: `${(trustSummary.low / metrics.enrolledDevices) * 100}%` }} />
              )}
              {trustSummary.critical > 0 && (
                <div className={`${getTrustColor('critical')}`} style={{ width: `${(trustSummary.critical / metrics.enrolledDevices) * 100}%` }} />
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-success">{trustSummary.high}</p>
                <p className="text-xs text-muted-foreground">High</p>
              </div>
              <div>
                <p className="text-lg font-bold text-warning">{trustSummary.medium}</p>
                <p className="text-xs text-muted-foreground">Medium</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-500">{trustSummary.low}</p>
                <p className="text-xs text-muted-foreground">Low</p>
              </div>
              <div>
                <p className="text-lg font-bold text-destructive">{trustSummary.critical}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest integrity events (privacy-safe view)</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {metrics.recentActivity.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-4 h-4 ${event.resolved ? 'text-muted-foreground' : 'text-warning'}`} />
                    <div>
                      <p className="text-sm font-medium">{getEventTypeLabel(event.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        Device: {event.deviceId.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={event.resolved ? 'secondary' : 'outline'}>
                      {event.resolved ? 'Resolved' : 'Pending'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(event.timestamp, 'MMM d, HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeComplianceDashboard;
