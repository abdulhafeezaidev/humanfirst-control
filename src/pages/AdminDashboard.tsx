import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, Plus, Users, Clock, Calendar, 
  ToggleLeft, ToggleRight, Trash2, Edit2, X, Bot, Wifi, WifiOff, Radio, FileText,
  AlertTriangle, Bell, Heart, Info, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import EthicsDisclosure from '@/components/EthicsDisclosure';
import PilotModeBanner from '@/components/PilotModeBanner';
import PlanStatusCard from '@/components/PlanStatusCard';
import RetentionSettingsCard from '@/components/RetentionSettingsCard';
import RetentionPolicyBadge from '@/components/RetentionPolicyBadge';
import AdminSetupWizard from '@/components/onboarding/AdminSetupWizard';
import PilotModeMetrics from '@/components/pilot/PilotModeMetrics';
import TamperEventsList from '@/components/pilot/TamperEventsList';
import PilotAnalyticsDashboard from '@/components/analytics/PilotAnalyticsDashboard';
import InfoTooltip from '@/components/guidance/InfoTooltip';
import GuidanceCard from '@/components/guidance/GuidanceCard';
import { Switch } from '@/components/ui/switch';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/permissions';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import humanfirstLogo from '@/assets/humanfirst-logo.png';

interface ExamPolicy {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
  blocked_categories: string[];
  created_at: string;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

interface AIService {
  id: string;
  name: string;
  category: string;
  domains: string[];
  is_blocked_during_exam: boolean;
}

type EnforcementStatusType = 'not_connected' | 'connected_simulated' | 'active';

interface EnforcementConfig {
  id: string;
  status: EnforcementStatusType;
  status_message: string | null;
  pilot_mode: boolean;
}

interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target: string;
  target_id: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

interface TamperEvent {
  id: string;
  user_id: string;
  device_id: string;
  event_type: string;
  exam_policy_id: string | null;
  timestamp: string;
  resolved: boolean;
  resolved_at: string | null;
  notes: string | null;
}

const AdminDashboard = () => {
  const { user, role, permissions, organization, isAdmin, ethicsAccepted, signOut, loading, refreshEthicsStatus, refreshOrganization } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [policies, setPolicies] = useState<ExamPolicy[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [aiServices, setAiServices] = useState<AIService[]>([]);
  const [enforcementConfig, setEnforcementConfig] = useState<EnforcementConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tamperEvents, setTamperEvents] = useState<TamperEvent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ExamPolicy | null>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formCategories, setFormCategories] = useState(['AI Tools']);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchPolicies();
      fetchStudents();
      fetchAiServices();
      fetchEnforcementConfig();
      fetchAuditLogs();
      fetchTamperEvents();

      // Subscribe to real-time updates
      const channel = supabase
        .channel('exam-policies-admin')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'exam_policies' },
          () => {
            fetchPolicies();
            fetchAuditLogs();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ai_services' },
          () => {
            fetchAiServices();
            fetchAuditLogs();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'enforcement_config' },
          () => {
            fetchEnforcementConfig();
            fetchAuditLogs();
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'audit_logs' },
          () => {
            fetchAuditLogs();
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'tamper_events' },
          (payload) => {
            fetchTamperEvents();
            // Show toast notification for new tamper event
            const event = payload.new as TamperEvent;
            toast({
              title: "⚠️ Tamper Event Detected",
              description: `${event.event_type.replace(/_/g, ' ')} - Device: ${event.device_id.slice(0, 15)}...`,
              variant: "destructive",
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, role]);

  const fetchPolicies = async () => {
    if (!organization?.id) return;
    
    const { data, error } = await supabase
      .from('exam_policies')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      setPolicies(data);
    }
  };

  const fetchStudents = async () => {
    if (!organization?.id) return;
    
    // Fetch profiles scoped to organization
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organization.id);
    
    if (data && !error) {
      // Filter to only show students (exclude admins)
      const userIds = data.map(p => p.user_id);
      if (userIds.length === 0) {
        setStudents([]);
        return;
      }
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .eq('role', 'student');
      
      const studentUserIds = new Set((roles || []).map(r => r.user_id));
      const studentProfiles = data.filter(p => studentUserIds.has(p.user_id));
      setStudents(studentProfiles);
    }
  };

  const fetchAiServices = async () => {
    // AI services are global (not org-scoped) - this is intentional
    const { data, error } = await supabase
      .from('ai_services')
      .select('*')
      .order('category', { ascending: true });
    
    if (data && !error) {
      setAiServices(data);
    }
  };

  const fetchEnforcementConfig = async () => {
    if (!organization?.id) return;
    
    const { data, error } = await supabase
      .from('enforcement_config')
      .select('*')
      .eq('organization_id', organization.id)
      .maybeSingle();
    
    if (data && !error) {
      setEnforcementConfig(data);
    }
  };

  const fetchAuditLogs = async () => {
    if (!organization?.id) return;
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organization.id)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (data && !error) {
      setAuditLogs(data as AuditLog[]);
    }
  };

  const fetchTamperEvents = async () => {
    if (!organization?.id) return;
    
    const { data, error } = await supabase
      .from('tamper_events')
      .select('*')
      .eq('organization_id', organization.id)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (data && !error) {
      setTamperEvents(data as TamperEvent[]);
    }
  };

  const markTamperEventResolved = async (eventId: string) => {
    if (!organization?.id) return;
    
    const { error } = await supabase
      .from('tamper_events')
      .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user?.id })
      .eq('id', eventId)
      .eq('organization_id', organization.id);
    
    if (!error) {
      fetchTamperEvents();
      toast({ title: "Event marked as resolved" });
    }
  };

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'app_backgrounded': 'App Backgrounded',
      'app_closed_during_exam': 'App Closed',
      'network_disconnected': 'Network Lost',
      'network_reconnected': 'Network Restored',
      'connectivity_issue_detected': 'Connectivity Issue',
      'extended_focus_loss': 'Focus Lost',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  const formatAction = (action: string): string => {
    const actionLabels: Record<string, string> = {
      'exam_policy_created': 'Policy Created',
      'exam_policy_updated': 'Policy Updated',
      'exam_policy_activated': 'Policy Activated',
      'exam_policy_deactivated': 'Policy Deactivated',
      'exam_policy_deleted': 'Policy Deleted',
      'ai_service_blocked': 'AI Service Blocked',
      'ai_service_unblocked': 'AI Service Unblocked',
      'enforcement_status_changed': 'Enforcement Changed',
    };
    return actionLabels[action] || action;
  };

  const handleToggleAiService = async (service: AIService) => {
    // AI services are global but require admin role (enforced by RLS)
    const { error } = await supabase
      .from('ai_services')
      .update({ is_blocked_during_exam: !service.is_blocked_during_exam })
      .eq('id', service.id);

    if (!error) {
      fetchAiServices();
    }
  };

  const handleTogglePilotMode = async () => {
    if (!enforcementConfig || !organization?.id) return;
    
    const newPilotMode = !enforcementConfig.pilot_mode;
    const { error } = await supabase
      .from('enforcement_config')
      .update({ 
        pilot_mode: newPilotMode,
        pilot_mode_enabled_at: newPilotMode ? new Date().toISOString() : null,
        pilot_mode_enabled_by: newPilotMode ? user?.id : null,
      })
      .eq('organization_id', organization.id);

    if (!error) {
      setEnforcementConfig({ ...enforcementConfig, pilot_mode: newPilotMode });
      toast({
        title: newPilotMode ? "Pilot Mode Enabled" : "Pilot Mode Disabled",
        description: newPilotMode 
          ? "Policies will simulate enforcement without permanent locks" 
          : "Full enforcement is now active",
      });
    }
  };

  const handleCreatePolicy = async () => {
    if (!formTitle || !formStartTime || !formEndTime) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from('exam_policies').insert({
      title: formTitle,
      description: formDescription || null,
      start_time: formStartTime,
      end_time: formEndTime,
      blocked_categories: formCategories,
      created_by: user?.id,
      organization_id: organization?.id,
    });

    if (error) {
      toast({
        title: "Error creating policy",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Policy created",
        description: "The exam policy has been created successfully.",
      });
      resetForm();
      setShowCreateModal(false);
      fetchPolicies();
    }
  };

  const handleUpdatePolicy = async () => {
    if (!editingPolicy) return;

    const { error } = await supabase
      .from('exam_policies')
      .update({
        title: formTitle,
        description: formDescription || null,
        start_time: formStartTime,
        end_time: formEndTime,
        blocked_categories: formCategories,
      })
      .eq('id', editingPolicy.id);

    if (error) {
      toast({
        title: "Error updating policy",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Policy updated",
        description: "The exam policy has been updated successfully.",
      });
      resetForm();
      setEditingPolicy(null);
      fetchPolicies();
    }
  };

  const handleToggleActive = async (policy: ExamPolicy) => {
    const { error } = await supabase
      .from('exam_policies')
      .update({ is_active: !policy.is_active })
      .eq('id', policy.id);

    if (!error) {
      fetchPolicies();
    }
  };

  const handleDeletePolicy = async (id: string) => {
    const { error } = await supabase
      .from('exam_policies')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({
        title: "Policy deleted",
        description: "The exam policy has been deleted.",
      });
      fetchPolicies();
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormStartTime('');
    setFormEndTime('');
    setFormCategories(['AI Tools']);
  };

  const openEditModal = (policy: ExamPolicy) => {
    setEditingPolicy(policy);
    setFormTitle(policy.title);
    setFormDescription(policy.description || '');
    setFormStartTime(policy.start_time.slice(0, 16));
    setFormEndTime(policy.end_time.slice(0, 16));
    setFormCategories(policy.blocked_categories);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const availableCategories = ['AI Tools', 'Social Media', 'Entertainment', 'Gaming', 'Messaging'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  // Show ethics disclosure if not yet accepted
  if (user && isAdmin && !ethicsAccepted) {
    return (
      <EthicsDisclosure
        userId={user.id}
        role="admin"
        onAccepted={refreshEthicsStatus}
      />
    );
  }

  // Show setup wizard if no organization
  if (user && isAdmin && ethicsAccepted && !organization) {
    return (
      <AdminSetupWizard 
        userId={user.id} 
        onComplete={() => {
          refreshOrganization();
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Pilot Mode Banner */}
      {enforcementConfig?.pilot_mode && <PilotModeBanner />}

      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={humanfirstLogo} alt="HumanFirst" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-base sm:text-lg font-bold text-foreground">HumanFirst</span>
              <span className={`hidden sm:inline ml-2 px-2 py-0.5 text-xs font-medium rounded ${getRoleBadgeColor(role)}`}>
                {getRoleLabel(role)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/trust" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 p-2" title="Trust & Ethics">
              <Heart className="w-4 h-4" />
              <span className="hidden md:inline text-sm">Trust & Ethics</span>
            </Link>
            <Button onClick={() => navigate('/admin/policy-transparency')} variant="ghost" size="sm" className="px-2 sm:px-3" title="Policy Transparency">
              <FileText className="w-4 h-4" />
              <span className="hidden lg:inline ml-1">Policy Transparency</span>
            </Button>
            <Button onClick={handleSignOut} variant="ghost" size="sm" className="px-2 sm:px-3" title="Sign Out">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Plan Status Card */}
        {organization && (
          <section className="mb-8">
            <PlanStatusCard 
              organization={organization}
              currentAdminCount={students.length > 0 ? 1 : 0} // TODO: Fetch actual admin count
              currentStudentCount={students.length}
              currentDeviceCount={0} // TODO: Fetch actual device count
            />
          </section>
        )}

        {/* Pilot Mode Settings */}
        <section className="mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Pilot / Demo Mode</h2>
                  <p className="text-sm text-muted-foreground">
                    {enforcementConfig?.pilot_mode 
                      ? "Active — Policies simulate enforcement without permanent locks"
                      : "Disabled — Full enforcement is active"}
                  </p>
                </div>
              </div>
              {permissions.canTogglePilotMode ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {enforcementConfig?.pilot_mode ? 'Enabled' : 'Disabled'}
                  </span>
                  <Switch 
                    checked={enforcementConfig?.pilot_mode || false}
                    onCheckedChange={handleTogglePilotMode}
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Super Admin only
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Pilot Analytics Dashboard */}
        {enforcementConfig?.pilot_mode && organization && (
          <section className="mb-8">
            <PilotAnalyticsDashboard
              organizationId={organization.id}
              organizationName={organization.name}
              pilotStartDate={organization.created_at}
            />
          </section>
        )}

        {/* Enforcement Status Banner */}
        <section className="mb-8">
          <div className={`glass-card p-6 border-2 ${
            enforcementConfig?.status === 'active' 
              ? 'border-success/50' 
              : enforcementConfig?.status === 'connected_simulated'
              ? 'border-warning/50'
              : 'border-muted'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                enforcementConfig?.status === 'active'
                  ? 'bg-success/10'
                  : enforcementConfig?.status === 'connected_simulated'
                  ? 'bg-warning/10'
                  : 'bg-muted'
              }`}>
                {enforcementConfig?.status === 'active' ? (
                  <Radio className="w-6 h-6 text-success" />
                ) : enforcementConfig?.status === 'connected_simulated' ? (
                  <Wifi className="w-6 h-6 text-warning" />
                ) : (
                  <WifiOff className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">Enforcement Status</h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    enforcementConfig?.status === 'active'
                      ? 'bg-success/10 text-success'
                      : enforcementConfig?.status === 'connected_simulated'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {enforcementConfig?.status === 'active' 
                      ? 'Active' 
                      : enforcementConfig?.status === 'connected_simulated'
                      ? 'Simulated'
                      : 'Not Connected'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {enforcementConfig?.status === 'active'
                    ? 'Device enforcement is active. AI service restrictions are being enforced on connected student devices.'
                    : enforcementConfig?.status === 'connected_simulated'
                    ? 'Simulated mode is active. Policies are tracked but not enforced on devices. Use this for testing.'
                    : 'Device enforcement is not configured. Policies are informational only and rely on student self-compliance.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Policies Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Exam Policies</h2>
              <p className="text-muted-foreground">
                {permissions.canManagePolicies ? 'Create and manage focus mode policies' : 'View focus mode policies (read-only)'}
              </p>
            </div>
            {permissions.canManagePolicies && (
              <Button onClick={() => setShowCreateModal(true)} variant="default">
                <Plus className="w-4 h-4" />
                Create Policy
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {policies.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No policies yet</h3>
                <p className="text-muted-foreground mb-4">Create your first exam policy to get started.</p>
                <Button onClick={() => setShowCreateModal(true)} variant="default">
                  <Plus className="w-4 h-4" />
                  Create Policy
                </Button>
              </div>
            ) : (
              policies.map((policy) => {
                const now = new Date();
                const isCurrentlyActive = policy.is_active && 
                  now >= new Date(policy.start_time) && 
                  now <= new Date(policy.end_time);
                const isUpcoming = policy.is_active && now < new Date(policy.start_time);
                const isExpired = now > new Date(policy.end_time);
                
                return (
                <div key={policy.id} className="glass-card p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{policy.title}</h3>
                      {isCurrentlyActive ? (
                        <span className="status-active">
                          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                          Live Now
                        </span>
                      ) : isUpcoming ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                          Scheduled
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                          Ended
                        </span>
                      ) : (
                        <span className="status-inactive">Disabled</span>
                      )}
                    </div>
                    {policy.description && (
                      <p className="text-muted-foreground text-sm mb-2">{policy.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(policy.start_time), 'MMM d, yyyy HH:mm')}
                      </span>
                      <span>→</span>
                      <span>{format(new Date(policy.end_time), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {policy.blocked_categories.map((cat) => (
                        <span key={cat} className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                  {permissions.canManagePolicies && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleToggleActive(policy)}
                        variant="ghost"
                        size="icon"
                        title={policy.is_active ? 'Disable Policy' : 'Enable Policy'}
                      >
                        {policy.is_active ? (
                          <ToggleRight className="w-5 h-5 text-success" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        onClick={() => openEditModal(policy)}
                        variant="ghost"
                        size="icon"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeletePolicy(policy.id)}
                        variant="ghost"
                        size="icon"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              );
              })
            )}
          </div>
        </section>

        {/* AI Services Section */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">AI Services Registry</h2>
            <p className="text-muted-foreground">Configure which AI services are restricted during Exam Mode</p>
          </div>

          <div className="grid gap-3">
            {Object.entries(
              aiServices.reduce((acc, service) => {
                if (!acc[service.category]) acc[service.category] = [];
                acc[service.category].push(service);
                return acc;
              }, {} as Record<string, AIService[]>)
            ).map(([category, services]) => (
              <div key={category} className="glass-card p-5">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        service.is_blocked_during_exam
                          ? 'bg-destructive/5 border-destructive/20'
                          : 'bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Bot className={`w-5 h-5 ${service.is_blocked_during_exam ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <span className="font-medium text-foreground">{service.name}</span>
                      </div>
                      <Button
                        onClick={() => handleToggleAiService(service)}
                        variant="ghost"
                        size="icon"
                        title={service.is_blocked_during_exam ? 'Allow during exam' : 'Block during exam'}
                      >
                        {service.is_blocked_during_exam ? (
                          <ToggleRight className="w-5 h-5 text-destructive" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Students Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Enrolled Students</h2>
            <p className="text-muted-foreground">View student status and information</p>
          </div>

          <div className="glass-card overflow-hidden">
            {students.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No students yet</h3>
                <p className="text-muted-foreground">Students will appear here once they sign up.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Name</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-t border-border">
                      <td className="px-6 py-4 text-foreground">{student.full_name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{student.email}</td>
                      <td className="px-6 py-4">
                        <span className="status-active">
                          <span className="w-2 h-2 bg-success rounded-full" />
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(student.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Retention Settings Section */}
        {organization && (
          <section className="mt-12">
            <RetentionSettingsCard
              organizationId={organization.id}
              auditLogRetentionDays={organization.audit_log_retention_days}
              tamperEventRetentionDays={organization.tamper_event_retention_days}
              canEdit={permissions.canTogglePilotMode}
              onUpdate={refreshOrganization}
            />
          </section>
        )}

        {/* Audit Logs Section */}
        <section className="mt-12">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Audit Log</h2>
                <p className="text-muted-foreground">Immutable record of all policy and configuration changes</p>
              </div>
              {organization && (
                <RetentionPolicyBadge retentionDays={organization.audit_log_retention_days} type="audit" />
              )}
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            {auditLogs.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No activity yet</h3>
                <p className="text-muted-foreground">Actions will be logged here automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Timestamp</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Action</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-t border-border">
                        <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            log.action.includes('created') || log.action.includes('activated')
                              ? 'bg-success/10 text-success'
                              : log.action.includes('deleted') || log.action.includes('deactivated')
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {formatAction(log.action)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {log.metadata && typeof log.metadata === 'object' && (
                            <>
                              {(log.metadata as Record<string, unknown>).title && (
                                <span>Policy: {String((log.metadata as Record<string, unknown>).title)}</span>
                              )}
                              {(log.metadata as Record<string, unknown>).name && (
                                <span>Service: {String((log.metadata as Record<string, unknown>).name)}</span>
                              )}
                              {(log.metadata as Record<string, unknown>).new_status && (
                                <span>
                                  Status: {String((log.metadata as Record<string, unknown>).old_status)} → {String((log.metadata as Record<string, unknown>).new_status)}
                                </span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPolicy) && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg p-8 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">
                {editingPolicy ? 'Edit Policy' : 'Create Exam Policy'}
              </h3>
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPolicy(null);
                  resetForm();
                }}
                variant="ghost"
                size="icon"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Policy Title
                </label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Midterm Exam - CS101"
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (optional)
                </label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this policy"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Start Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    End Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Blocked Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        if (formCategories.includes(cat)) {
                          setFormCategories(formCategories.filter((c) => c !== cat));
                        } else {
                          setFormCategories([...formCategories, cat]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        formCategories.includes(cat)
                          ? 'bg-destructive/10 text-destructive border-2 border-destructive'
                          : 'bg-muted text-muted-foreground border-2 border-transparent'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPolicy(null);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingPolicy ? handleUpdatePolicy : handleCreatePolicy}
                  variant="default"
                  className="flex-1"
                >
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
