import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DashboardMetrics, QuickActions, RecentActivity } from '@/components/dashboard';
import EthicsDisclosure from '@/components/EthicsDisclosure';
import AdminSetupWizard from '@/components/onboarding/AdminSetupWizard';
import PilotModeBanner from '@/components/PilotModeBanner';
import PlanStatusCard from '@/components/PlanStatusCard';
import InviteAdminDialog from '@/components/admin/InviteAdminDialog';
import InviteStudentDialog from '@/components/admin/InviteStudentDialog';
import { AdminMetricsDashboard } from '@/components/metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ExamPolicy {
  id: string;
  title: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
}

interface TamperEvent {
  id: string;
  event_type: string;
  timestamp: string;
  resolved: boolean;
  device_id: string;
}

interface AuditLog {
  id: string;
  action: string;
  target: string;
  timestamp: string;
}

type EnforcementStatus = 'not_connected' | 'connected_simulated' | 'active';

interface EnforcementConfig {
  status: EnforcementStatus;
  pilot_mode: boolean;
}

interface AssignmentRiskAlert {
  id: string;
  user_id: string;
  assignment_id: string | null;
  event_type: string;
  domain: string | null;
  session_id: string | null;
  process_name: string | null;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  metadata: {
    session_id?: string | null;
    process_name?: string | null;
    severity_level?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  } | null;
  created_at: string;
}

const AdminDashboardV2 = () => {
  const { user, role, organization, isAdmin, ethicsAccepted, loading, refreshEthicsStatus, refreshOrganization } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [policies, setPolicies] = useState<ExamPolicy[]>([]);
  const [students, setStudents] = useState<{ id: string }[]>([]);
  const [tamperEvents, setTamperEvents] = useState<TamperEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [enforcementConfig, setEnforcementConfig] = useState<EnforcementConfig | null>(null);
  const [assignmentRiskAlerts, setAssignmentRiskAlerts] = useState<AssignmentRiskAlert[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);

  const desktopApi = typeof window !== 'undefined' ? window.humanfirstDesktop : undefined;
  const isDesktop = !!desktopApi?.isDesktop;

  // Redirect non-admins
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, loading, navigate]);

  // Fetch dashboard data when organization is available
  useEffect(() => {
    if (user && isAdmin && organization?.id) {
      fetchDashboardData();
      const cleanup = setupRealtimeSubscriptions();
      return cleanup;
    }
  }, [user, isAdmin, organization?.id]);

  const fetchDashboardData = async () => {
    setDataLoading(true);
    await Promise.all([
      fetchPolicies(),
      fetchStudents(),
      fetchTamperEvents(),
      fetchAuditLogs(),
      fetchEnforcementConfig(),
      fetchAssignmentRiskAlerts(),
    ]);
    setDataLoading(false);
  };

  const fetchPolicies = async () => {
    if (!organization?.id) return;
    
    const { data } = await supabase
      .from('exam_policies')
      .select('id, title, is_active, start_time, end_time')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });
    if (data) setPolicies(data);
  };

  const fetchStudents = async () => {
    if (!organization?.id) return;
    
    // Get profiles in this organization first
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('organization_id', organization.id);
    
    if (!profiles || profiles.length === 0) {
      setStudents([]);
      return;
    }
    
    const userIds = profiles.map(p => p.user_id);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('user_id', userIds)
      .eq('role', 'student');
    if (roles) setStudents(roles.map(r => ({ id: r.user_id })));
  };

  const fetchTamperEvents = async () => {
    if (!organization?.id) return;
    
    const { data } = await supabase
      .from('tamper_events')
      .select('id, event_type, timestamp, resolved, device_id')
      .eq('organization_id', organization.id)
      .order('timestamp', { ascending: false })
      .limit(50);
    if (data) setTamperEvents(data);
  };

  const fetchAuditLogs = async () => {
    if (!organization?.id) return;
    
    const { data } = await supabase
      .from('audit_logs')
      .select('id, action, target, timestamp')
      .eq('organization_id', organization.id)
      .order('timestamp', { ascending: false })
      .limit(20);
    if (data) setAuditLogs(data);
  };

  const fetchEnforcementConfig = async () => {
    if (!organization?.id) return;
    
    const { data } = await supabase
      .from('enforcement_config')
      .select('status, pilot_mode')
      .eq('organization_id', organization.id)
      .maybeSingle();
    if (data) setEnforcementConfig(data);
  };

  const fetchAssignmentRiskAlerts = async () => {
    if (!organization?.id) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const url = `${baseUrl}/rest/v1/assignment_risk_events?organization_id=eq.${organization.id}&select=id,user_id,assignment_id,event_type,domain,session_id,process_name,severity_level,metadata,created_at&order=created_at.desc&limit=20`;

    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) return;

    const data = (await res.json()) as AssignmentRiskAlert[];
    setAssignmentRiskAlerts(data);
  };

  const setupRealtimeSubscriptions = () => {
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_policies' }, fetchPolicies)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tamper_events' }, (payload) => {
        fetchTamperEvents();
        if (payload.eventType === 'INSERT') {
          const event = payload.new as TamperEvent;
          toast({
            title: "⚠️ Enforcement Alert",
            description: `${event.event_type.replace(/_/g, ' ')} detected`,
            variant: "destructive",
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enforcement_config' }, fetchEnforcementConfig)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignment_risk_events' }, () => {
        fetchAssignmentRiskAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleResolveAlert = async (eventId: string) => {
    if (!organization?.id) return;
    
    const { error } = await supabase
      .from('tamper_events')
      .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user?.id })
      .eq('id', eventId)
      .eq('organization_id', organization.id);

    if (!error) {
      fetchTamperEvents();
      toast({ title: "Alert resolved" });
    }
  };

  const handleOpenLogsFolder = async () => {
    if (!isDesktop || !desktopApi) return;
    const res = await desktopApi.openLogsFolder();
    if (res.ok) {
      toast({ title: 'Opened logs folder', description: res.logsDir || undefined });
    } else {
      toast({
        title: 'Could not open logs folder',
        description: res.error || 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Computed values
  const activePolicies = useMemo(() => {
    const now = new Date();
    return policies.filter(p => 
      p.is_active && 
      now >= new Date(p.start_time) && 
      now <= new Date(p.end_time)
    ).length;
  }, [policies]);

  const unresolvedAlerts = useMemo(() => 
    tamperEvents.filter(e => !e.resolved).length, 
    [tamperEvents]
  );

  const pilotDaysRemaining = useMemo(() => {
    if (!organization?.pilot_expires_at) return undefined;
    const days = differenceInDays(new Date(organization.pilot_expires_at), new Date());
    return days > 0 ? days : 0;
  }, [organization]);

  const recentActivities = useMemo(() => {
    const alertActivities = tamperEvents.slice(0, 10).map(e => ({
      id: e.id,
      type: 'alert' as const,
      action: e.event_type.replace(/_/g, ' '),
      description: `Device: ${e.device_id.slice(0, 12)}...`,
      timestamp: e.timestamp,
      resolved: e.resolved,
    }));

    const logActivities = auditLogs.slice(0, 5).map(log => ({
      id: log.id,
      type: 'policy' as const,
      action: log.action.replace(/_/g, ' '),
      description: log.target,
      timestamp: log.timestamp,
    }));

    return [...alertActivities, ...logActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);
  }, [tamperEvents, auditLogs]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  // Ethics disclosure
  if (user && isAdmin && !ethicsAccepted) {
    return (
      <EthicsDisclosure
        userId={user.id}
        role="admin"
        onAccepted={refreshEthicsStatus}
      />
    );
  }

  // Setup wizard
  if (user && isAdmin && ethicsAccepted && !organization) {
    return (
      <AdminSetupWizard 
        userId={user.id} 
        onComplete={refreshOrganization} 
      />
    );
  }

  return (
    <DashboardLayout 
      unresolvedAlerts={unresolvedAlerts}
      onViewAlerts={() => navigate('/admin/logs')}
    >
      {/* Pilot Mode Banner */}
      {enforcementConfig?.pilot_mode && <PilotModeBanner />}

      {/* Plan Status */}
      {organization && (
        <section className="mb-6">
          <PlanStatusCard 
            organization={organization}
            currentAdminCount={1}
            currentStudentCount={students.length}
            currentDeviceCount={0}
          />
        </section>
      )}

      {/* Metrics Grid */}
      {dataLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <DashboardMetrics
          studentCount={students.length}
          activePolicies={activePolicies}
          totalPolicies={policies.length}
          unresolvedAlerts={unresolvedAlerts}
          totalAlerts={tamperEvents.length}
          enforcementStatus={enforcementConfig?.status || 'not_connected'}
          pilotDaysRemaining={pilotDaysRemaining}
        />
      )}

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <QuickActions
            role={role}
            onCreatePolicy={() => navigate('/admin/policies')}
            onInviteAdmin={() => setShowInviteDialog(true)}
            onAddStudent={() => setShowStudentDialog(true)}
            onViewTransparency={() => navigate('/admin/policy-transparency')}
            onOpenSettings={() => navigate('/admin/settings')}
          />

          {/* Desktop Diagnostics (Admin-only) */}
          {isDesktop && isAdmin && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Desktop Diagnostics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  If the desktop app hangs on the splash screen, open the logs folder and share the newest log file.
                </p>
                <Button variant="secondary" onClick={handleOpenLogsFolder}>
                  Open Logs Folder
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Privacy Notice */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">🔒 Privacy First</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <p>
                HumanFirst does <strong>not</strong> read student content, keystrokes, 
                or monitor screen activity. We only track focus mode compliance.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <RecentActivity
            activities={recentActivities}
            onResolveAlert={handleResolveAlert}
            onViewAll={() => navigate('/admin/logs')}
          />
        </div>
      </div>

      {/* Assignment Mode Alerts */}
      <section className="mt-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assignment Mode Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {assignmentRiskAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignment-mode alerts yet.</p>
            ) : (
              <div className="space-y-2">
                {assignmentRiskAlerts.slice(0, 8).map((evt) => {
                  const severity = evt.severity_level ?? evt.metadata?.severity_level ?? (evt.event_type === 'ai_domain_visit' ? 'HIGH' : 'LOW');
                  return (
                    <div key={evt.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">
                          {evt.event_type.replace(/_/g, ' ')}
                        </div>
                        <Badge variant={severity === 'HIGH' ? 'destructive' : severity === 'MEDIUM' ? 'secondary' : 'outline'}>
                          {severity}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Student: {evt.user_id.slice(0, 8)}... | Session: {(evt.session_id ?? evt.metadata?.session_id ?? 'n/a').toString().slice(0, 8)}...
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Domain: {evt.domain ?? 'n/a'} | Process: {evt.process_name ?? evt.metadata?.process_name ?? 'n/a'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(evt.created_at).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Admin Metrics Dashboard */}
      {organization && (
        <section className="mt-8">
          <AdminMetricsDashboard />
        </section>
      )}

      {/* Invite Admin Dialog */}
      <InviteAdminDialog 
        open={showInviteDialog} 
        onOpenChange={setShowInviteDialog} 
      />

      {/* Invite Student Dialog */}
      <InviteStudentDialog 
        open={showStudentDialog} 
        onOpenChange={setShowStudentDialog}
        onStudentAdded={fetchStudents}
      />
    </DashboardLayout>
  );
};

export default AdminDashboardV2;
