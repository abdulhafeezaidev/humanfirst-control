import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Wifi, WifiOff, Activity, AlertTriangle, CheckCircle, RefreshCw, Upload, Loader2 } from 'lucide-react';
import NetworkEnforcementStatus from '@/components/NetworkEnforcementStatus';
import TamperEventsList from '@/components/pilot/TamperEventsList';
import { useToast } from '@/hooks/use-toast';

type EnforcementStatus = 'not_connected' | 'connected_simulated' | 'active';

interface EnforcementConfig {
  id: string;
  status: EnforcementStatus;
  pilot_mode: boolean;
  status_message: string | null;
}

interface TamperEvent {
  id: string;
  user_id: string;
  device_id: string;
  event_type: string;
  timestamp: string;
  resolved: boolean;
  resolved_at: string | null;
  notes: string | null;
}

const EnforcementPage = () => {
  const { user, role, loading: authLoading, organization, permissions } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [config, setConfig] = useState<EnforcementConfig | null>(null);
  const [tamperEvents, setTamperEvents] = useState<TamperEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<{ connected: boolean; data?: any; error?: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const desktopApi = typeof window !== 'undefined' ? window.humanfirstDesktop : undefined;
  const isDesktop = !!desktopApi?.isDesktop;

  useEffect(() => {
    if (!authLoading && (!user || role !== 'super_admin')) navigate('/admin');
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'super_admin' && organization?.id) fetchData();
  }, [user, role, organization?.id]);

  const fetchData = async () => {
    setLoading(true);
    const [configRes, eventsRes] = await Promise.all([
      supabase
        .from('enforcement_config')
        .select('*')
        .eq('organization_id', organization!.id)
        .maybeSingle(),
      supabase
        .from('tamper_events')
        .select('*')
        .eq('organization_id', organization!.id)
        .order('timestamp', { ascending: false })
        .limit(50),
    ]);
    if (configRes.data) setConfig(configRes.data as EnforcementConfig);
    setTamperEvents((eventsRes.data as TamperEvent[]) ?? []);
    setLoading(false);
  };

  const syncEnforcementStatus = async (connected: boolean) => {
    if (!config) return;

    const nextStatus: EnforcementStatus = connected
      ? (config.pilot_mode ? 'connected_simulated' : 'active')
      : 'not_connected';

    if (config.status === nextStatus) return;

    const statusMessage = connected
      ? (config.pilot_mode
          ? 'Local agent connected. Pilot mode is enabled; enforcement actions are simulated.'
          : 'Local agent connected. Enforcement is active.')
      : 'Local agent not connected. Policies are informational until agent connectivity is restored.';

    const { error } = await supabase
      .from('enforcement_config')
      .update({ status: nextStatus, status_message: statusMessage })
      .eq('id', config.id);

    if (!error) {
      setConfig((prev) => prev
        ? { ...prev, status: nextStatus, status_message: statusMessage }
        : prev
      );
    }
  };

  const checkAgentStatus = async () => {
    if (!desktopApi?.agentStatus) {
      setAgentStatus({ connected: false, error: 'Not running as desktop app' });
      await syncEnforcementStatus(false);
      return;
    }
    try {
      const res = await desktopApi.agentStatus();
      if (res.ok && res.success) {
        setAgentStatus({ connected: true, data: res.data });
        await syncEnforcementStatus(true);
      } else {
        setAgentStatus({ connected: false, error: res.error ?? res.message });
        await syncEnforcementStatus(false);
      }
    } catch (e: any) {
      setAgentStatus({ connected: false, error: e.message });
      await syncEnforcementStatus(false);
    }
  };

  const syncPoliciesToAgent = async () => {
    if (!desktopApi?.agentPushPolicies || !organization?.id) return;
    setSyncing(true);
    try {
      // Fetch all active policies from Supabase
      const { data: policies, error } = await supabase
        .from('exam_policies')
        .select('id, title, is_active, start_time, end_time, policy_type, blocked_categories, blocked_services')
        .eq('organization_id', organization.id);

      if (error) {
        toast({ title: 'Error fetching policies', description: error.message, variant: 'destructive' });
        setSyncing(false);
        return;
      }

      const mapped = (policies ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        isActive: p.is_active,
        examMode: p.policy_type === 'exam',
        startTime: p.start_time,
        endTime: p.end_time,
        allowedApps: [] as string[],
        blockedApps: [] as string[],
        allowedDomains: [] as string[],
      }));

      const res = await desktopApi.agentPushPolicies(mapped);
      if (res.ok && res.success) {
        toast({ title: 'Policies synced', description: `${mapped.length} policies pushed to local agent.` });
        await checkAgentStatus();
      } else {
        toast({ title: 'Sync failed', description: res.error ?? res.message, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Sync error', description: e.message, variant: 'destructive' });
    }
    setSyncing(false);
  };

  // Check agent status on mount
  useEffect(() => {
    if (isDesktop) checkAgentStatus();
  }, [isDesktop]);

  const togglePilotMode = async () => {
    if (!config) return;
    const { error } = await supabase
      .from('enforcement_config')
      .update({ pilot_mode: !config.pilot_mode })
      .eq('id', config.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setConfig({ ...config, pilot_mode: !config.pilot_mode });
      toast({ title: config.pilot_mode ? 'Pilot mode disabled' : 'Pilot mode enabled' });
    }
  };

  const resolveEvent = async (eventId: string) => {
    const { error } = await supabase
      .from('tamper_events')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', eventId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setTamperEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, resolved: true, resolved_at: new Date().toISOString() } : e))
      );
    }
  };

  const getStatusBadge = (status: EnforcementStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'connected_simulated':
        return <Badge className="bg-amber-600"><Activity className="w-3 h-3 mr-1" />Simulated</Badge>;
      default:
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Not Connected</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" /> Enforcement
          </h1>
          <p className="text-muted-foreground">Agent status, pilot mode, and tamper events</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : (
          <>
            {/* Desktop Agent Connection Card */}
            {isDesktop && (
              <Card className={agentStatus?.connected ? 'border-green-600/30' : 'border-amber-600/30'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Local Agent
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={checkAgentStatus}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Check
                      </Button>
                      <Button size="sm" onClick={syncPoliciesToAgent} disabled={syncing}>
                        {syncing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                        Sync Policies
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {agentStatus === null ? (
                    <p className="text-muted-foreground text-sm">Checking agent connection...</p>
                  ) : agentStatus.connected ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>
                        <span className="text-sm text-muted-foreground">
                          {(agentStatus.data as any)?.uptime && `Uptime: ${(agentStatus.data as any).uptime}`}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Policies loaded: {(agentStatus.data as any)?.policyCount ?? 0} ({(agentStatus.data as any)?.activePolicyCount ?? 0} active)
                      </div>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertDescription>
                        Agent not connected. {agentStatus.error}
                        <br />
                        <span className="text-xs">Install and start the ControlPlane.Agent Windows Service.</span>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Agent Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {config ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        {getStatusBadge(config.status)}
                      </div>
                      {config.status_message && (
                        <p className="text-sm text-muted-foreground">{config.status_message}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">No enforcement config found.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pilot Mode</CardTitle>
                  <CardDescription>
                    When enabled, enforcement actions are logged but not applied.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {config ? (
                    <div className="flex items-center justify-between">
                      <span>{config.pilot_mode ? 'Enabled (observe only)' : 'Disabled (enforcing)'}</span>
                      <Switch checked={config.pilot_mode} onCheckedChange={togglePilotMode} />
                    </div>
                  ) : (
                    <p className="text-muted-foreground">�</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <NetworkEnforcementStatus />

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Tamper Events
                </CardTitle>
                <CardDescription>Recent suspicious activity detected by the agent</CardDescription>
              </CardHeader>
              <CardContent>
                <TamperEventsList
                  events={tamperEvents}
                  retentionDays={organization?.tamper_event_retention_days}
                  onResolve={resolveEvent}
                  canManage={permissions.canManageTamperEvents}
                  showHeader={false}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EnforcementPage;
