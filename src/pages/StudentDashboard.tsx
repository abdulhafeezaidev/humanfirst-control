import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Heart, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import EthicsDisclosure from '@/components/EthicsDisclosure';
import TamperAlert from '@/components/TamperAlert';
import PilotModeBanner from '@/components/PilotModeBanner';
import StudentOnboarding from '@/components/onboarding/StudentOnboarding';
import { useTamperDetection } from '@/hooks/useTamperDetection';
import humanfirstLogo from '@/assets/humanfirst-logo.png';
import {
  ActivePolicyCard,
  BlockedServicesCard,
  BlockedUrlsCard,
  UpcomingPoliciesCard,
  PrivacyGuaranteesCard,
} from '@/components/student';

interface ExamPolicy {
  id: string;
  title: string;
  description: string | null;
  policy_type: 'exam' | 'focus' | 'custom';
  assignment_type: 'institution' | 'individual';
  start_time: string;
  end_time: string;
  is_active: boolean;
  blocked_categories: string[];
  blocked_services: string[];
  enforcement_level: 'strict' | 'soft';
  organization_id: string | null;
}

interface AIService {
  id: string;
  name: string;
  category: string;
  is_blocked_during_exam: boolean;
}

type EnforcementStatusType = 'not_connected' | 'connected_simulated' | 'active';

interface EnforcementConfig {
  status: EnforcementStatusType;
  pilot_mode: boolean;
}

interface Organization {
  id: string;
  name: string;
}

const StudentDashboard = () => {
  const { user, role, ethicsAccepted, signOut, loading, refreshEthicsStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Data states
  const [policies, setPolicies] = useState<ExamPolicy[]>([]);
  const [activePolicy, setActivePolicy] = useState<ExamPolicy | null>(null);
  const [blockedServices, setBlockedServices] = useState<AIService[]>([]);
  const [enforcementConfig, setEnforcementConfig] = useState<EnforcementConfig | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Desktop (Electron) admin PIN unlock modal
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  
  // Loading and error states - FAIL LOUDLY
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  // Check if this is the user's first visit
  useEffect(() => {
    if (user && role === 'student') {
      const hasSeenOnboarding = localStorage.getItem(`humanfirst_onboarding_${user.id}`);
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user, role]);

  // Tamper detection hook
  const { recentEvents, showAlert, dismissAlert } = useTamperDetection({
    userId: user?.id || '',
    organizationId: organization?.id,
    isExamModeActive: !!activePolicy,
    activePolicyId: activePolicy?.id,
  });

  // Desktop (Electron) exam-mode enforcement
  useEffect(() => {
    const api = window.humanfirstDesktop;
    if (!api?.isDesktop) return;

    const shouldEnable =
      !!activePolicy &&
      activePolicy.policy_type === 'exam' &&
      activePolicy.enforcement_level === 'strict';

    // Enable exam mode automatically when strict exam policy is active.
    // Disable requires admin PIN, so we don't auto-disable here.
    if (shouldEnable) {
      api.setExamMode(true).catch((err) => {
        console.warn('[Desktop] Failed to enable exam mode', err);
      });
    }
  }, [activePolicy]);

  // Desktop (Electron) student lockdown mode
  // Prevents students from resizing, minimizing, maximizing, or switching virtual desktops
  useEffect(() => {
    const api = window.humanfirstDesktop;
    if (!api?.isDesktop || !user || role !== 'student') return;

    // Enable assignment mode lockdown for all student users
    // This locks the window to fullscreen and prevents:
    // - Resizing
    // - Minimizing
    // - Maximizing
    // - Virtual desktop switching
    // - Alt+Tab and other task-switching shortcuts
    api.setAssignmentMode(true).catch((err) => {
      console.warn('[Desktop] Failed to enable student lockdown mode', err);
    });

    // Keep lockdown active while student is using the app
    // Disable only when student logs out or role changes
    return () => {
      // Note: We intentionally keep lockdown active to prevent accidental escape
      // Admin PIN unlock is required to exit student mode
    };
  }, [user, role]);

  const submitAdminPinUnlock = useCallback(async () => {
    const api = window.humanfirstDesktop;
    if (!api?.isDesktop) {
      toast({
        title: 'Desktop integration unavailable',
        description: 'Cannot unlock exam mode outside the desktop app.',
        variant: 'destructive',
      });
      return;
    }

    const pin = adminPin.trim();
    if (!pin) {
      setUnlockError('Please enter the admin PIN.');
      return;
    }

    setUnlockSubmitting(true);
    setUnlockError(null);

    try {
      const res = await api.unlockExamMode(pin);
      if (res.ok) {
        toast({
          title: 'Unlocked',
          description: 'Exam mode disabled. You may now close the app.',
        });
        setUnlockDialogOpen(false);
        setAdminPin('');
      } else {
        setUnlockError('Incorrect PIN.');
        toast({
          title: 'Incorrect PIN',
          description: 'Exam mode remains active.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.warn('[Desktop] Failed to unlock exam mode', err);
      setUnlockError('Failed to unlock exam mode.');
      toast({
        title: 'Unlock failed',
        description: 'Please try again or contact an admin.',
        variant: 'destructive',
      });
    } finally {
      setUnlockSubmitting(false);
    }
  }, [adminPin, toast]);

  // If user attempts to close the window during exam mode, prompt for admin PIN.
  useEffect(() => {
    const api = window.humanfirstDesktop;
    if (!api?.isDesktop) return;

    const unsubscribe = api.onCloseBlocked(async () => {
      toast({
        title: 'Exam mode is active',
        description: 'Closing is blocked. Admin PIN required to unlock.',
        variant: 'destructive',
      });

      setUnlockDialogOpen(true);
    });

    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    if (!unlockDialogOpen) {
      setAdminPin('');
      setUnlockError(null);
      setUnlockSubmitting(false);
    }
  }, [unlockDialogOpen]);

  useEffect(() => {
    if (!loading && (!user || role !== 'student')) {
      navigate('/auth');
    }
  }, [user, role, loading, navigate]);

  const fetchActivePolicy = useCallback(async () => {
    setPolicyLoading(true);
    setPolicyError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_active_exam_policy');
      
      if (error) {
        console.error('Failed to fetch active policy:', error);
        setPolicyError(`Failed to load policy status: ${error.message}`);
        setActivePolicy(null);
        return;
      }
      
      if (data && data.length > 0) {
        setActivePolicy(data[0] as ExamPolicy);
      } else {
        setActivePolicy(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching policy:', err);
      setPolicyError('An unexpected error occurred while loading policy status.');
      setActivePolicy(null);
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    if (!organization?.id || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('exam_policies')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .eq('status', 'active')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Failed to fetch policies:', error);
        return;
      }
      
      if (data) {
        const allPolicies = data as ExamPolicy[];
        const institutionPolicies = allPolicies.filter((p) => p.assignment_type === 'institution');
        const individualPolicyIds = allPolicies
          .filter((p) => p.assignment_type === 'individual')
          .map((p) => p.id);

        let assignedIndividualPolicyIds = new Set<string>();

        if (individualPolicyIds.length > 0) {
          const { data: assignments, error: assignmentError } = await supabase
            .from('policy_assignments')
            .select('policy_id')
            .eq('user_id', user.id)
            .is('revoked_at', null)
            .in('policy_id', individualPolicyIds);

          if (assignmentError) {
            console.error('Failed to fetch policy assignments:', assignmentError);
          } else {
            assignedIndividualPolicyIds = new Set((assignments || []).map((a) => a.policy_id));
          }
        }

        const applicableIndividualPolicies = allPolicies.filter(
          (p) => p.assignment_type === 'individual' && assignedIndividualPolicyIds.has(p.id)
        );

        const visiblePolicies = [...institutionPolicies, ...applicableIndividualPolicies].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

        setPolicies(visiblePolicies);
      }
    } catch (err) {
      console.error('Unexpected error fetching policies:', err);
    }
  }, [organization?.id, user?.id]);

  const fetchBlockedServices = useCallback(async () => {
    // AI services are global (not org-scoped by design)
    setServicesLoading(true);
    setServicesError(null);
    
    try {
      const { data, error } = await supabase
        .from('ai_services')
        .select('id, name, category, is_blocked_during_exam')
        .eq('is_blocked_during_exam', true)
        .order('category', { ascending: true });

      if (error) {
        console.error('Failed to fetch blocked services:', error);
        setServicesError(`Failed to load blocked services: ${error.message}`);
        return;
      }
      
      if (data) {
        setBlockedServices(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching services:', err);
      setServicesError('An unexpected error occurred while loading blocked services.');
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const fetchEnforcementConfig = useCallback(async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('enforcement_config')
        .select('status, pilot_mode')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch enforcement config:', error);
        return;
      }
      
      if (data) {
        setEnforcementConfig(data as EnforcementConfig);
      }
    } catch (err) {
      console.error('Unexpected error fetching enforcement config:', err);
    }
  }, [organization?.id]);

  const fetchOrganization = useCallback(async () => {
    try {
      // Get the user's profile to find their organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user?.id || '')
        .maybeSingle();
      
      if (profileError || !profile?.organization_id) {
        return;
      }
      
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', profile.organization_id)
        .maybeSingle();
      
      if (!orgError && org) {
        setOrganization(org);
      }
    } catch (err) {
      console.error('Unexpected error fetching organization:', err);
    }
  }, [user?.id]);

  // Fetch organization first, then org-dependent data
  useEffect(() => {
    if (user && role === 'student') {
      fetchOrganization();
      // These don't depend on organization, fetch immediately
      fetchBlockedServices();
      fetchActivePolicy();
    }
  }, [user, role, fetchOrganization, fetchBlockedServices, fetchActivePolicy]);

  // Once organization is available, fetch org-dependent data and set up real-time
  useEffect(() => {
    if (user && role === 'student' && organization?.id) {
      fetchPolicies();
      fetchEnforcementConfig();

      // Subscribe to real-time updates
      const channel = supabase
        .channel('exam-policies-student')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'exam_policies' },
          () => {
            fetchPolicies();
            fetchActivePolicy();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, role, organization?.id, fetchPolicies, fetchEnforcementConfig, fetchActivePolicy]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      fetchActivePolicy();
      // Also refresh policies list so upcoming→active transitions are reflected
      fetchPolicies();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchActivePolicy, fetchPolicies]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const upcomingPolicies = policies.filter(
    (p) => p.is_active && isAfter(new Date(p.start_time), currentTime)
  );

  const isStrictExamModeActive =
    !!activePolicy &&
    activePolicy.policy_type === 'exam' &&
    activePolicy.enforcement_level === 'strict' &&
    enforcementConfig?.status === 'active';

  // Prepare active policy with organization name for display
  const activePolicyForDisplay = activePolicy ? {
    ...activePolicy,
    organization_name: organization?.name,
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  // Show ethics disclosure if not yet accepted
  if (user && role === 'student' && !ethicsAccepted) {
    return (
      <EthicsDisclosure
        userId={user.id}
        role="student"
        onAccepted={refreshEthicsStatus}
      />
    );
  }

  // Show onboarding for first-time users
  if (showOnboarding) {
    return (
      <StudentOnboarding
        onComplete={() => {
          localStorage.setItem(`humanfirst_onboarding_${user?.id}`, 'true');
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AlertDialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <AlertDialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitAdminPinUnlock();
            }}
            className="space-y-4"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Admin PIN Required</AlertDialogTitle>
              <AlertDialogDescription>
                Exam mode is locked. Enter the admin PIN to disable exam mode and allow closing this app.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2">
              <Label htmlFor="hf-admin-pin">Admin PIN</Label>
              <Input
                id="hf-admin-pin"
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                autoFocus
                disabled={unlockSubmitting}
                placeholder="Enter PIN"
              />
              {unlockError && <p className="text-sm text-destructive">{unlockError}</p>}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={unlockSubmitting}>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={unlockSubmitting || adminPin.trim().length === 0}>
                {unlockSubmitting ? 'Unlocking…' : 'Unlock exam mode'}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tamper Alert Modal */}
      {showAlert && recentEvents.length > 0 && (
        <TamperAlert
          eventType={recentEvents[recentEvents.length - 1].type}
          onDismiss={dismissAlert}
        />
      )}

      {/* Pilot Mode Banner */}
      {enforcementConfig?.pilot_mode && <PilotModeBanner />}

      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src={humanfirstLogo}
              alt="HumanFirst"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <span className="text-base sm:text-lg font-bold text-foreground">HumanFirst</span>
              <span className="hidden sm:inline ml-2 text-sm text-muted-foreground">Student</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/trust"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 p-2"
              title="Trust & Ethics"
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Trust & Ethics</span>
            </Link>
            <Button onClick={handleSignOut} variant="ghost" size="sm" className="px-2 sm:px-3" title="Sign Out">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Policy Transparency</h1>
            <p className="text-muted-foreground">See what restrictions apply and why</p>
          </div>
          <Button 
            onClick={() => navigate('/assignment/8c621547-2b97-4dad-808d-28dda24f84f4/mode')}
            className="whitespace-nowrap ml-4"
            variant="default"
          >
            📝 Assignment Mode
          </Button>
        </div>

        {/* Active Policy Card - with loading and error states */}
        <section className="mb-6">
          <ActivePolicyCard 
            policy={activePolicyForDisplay} 
            isLoading={policyLoading}
            error={policyError}
          />
        </section>

        {/* Services Error Banner */}
        {servicesError && (
          <section className="mb-6">
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Unable to Load Blocked Services</p>
                <p className="text-sm text-destructive">{servicesError}</p>
              </div>
            </div>
          </section>
        )}

        {/* View-Only Notice */}
        <section className="mb-6">
          <div className="flex items-start gap-3 p-4 bg-accent/50 border border-border rounded-xl">
            <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Policy-Based Restrictions</p>
              <p className="text-sm text-muted-foreground">
                {enforcementConfig?.status === 'active'
                  ? 'AI service restrictions are actively enforced on your device during exam periods.'
                  : 'AI service restrictions are governed by institutional policy. Compliance is expected but not technically enforced on your device.'}
                {' '}These policies are managed by your administrator and promote academic integrity while fully protecting your privacy.
              </p>
            </div>
          </div>
        </section>

        {/* Hard restrictions are only shown for strict Exam Mode enforcement. */}
        {isStrictExamModeActive && !servicesError && blockedServices.length > 0 && (
          <section className="mb-6">
            <BlockedServicesCard
              services={blockedServices}
              enforcementStatus={enforcementConfig?.status || 'not_connected'}
            />
          </section>
        )}

        {/* Blocked URLs are only shown when strict Exam Mode is actively enforced. */}
        {isStrictExamModeActive && activePolicy && (
          <section className="mb-6">
            <BlockedUrlsCard
              policyId={activePolicy.id}
              enforcementStatus={enforcementConfig?.status || 'not_connected'}
            />
          </section>
        )}

        {/* Blocked Services Loading State */}
        {isStrictExamModeActive && servicesLoading && !servicesError && (
          <section className="mb-6">
            <div className="glass-card p-6 animate-pulse">
              <div className="h-5 bg-muted rounded w-1/4 mb-4" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded-lg" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Policies */}
        {upcomingPolicies.length > 0 && (
          <section className="mb-6">
            <UpcomingPoliciesCard policies={upcomingPolicies} />
          </section>
        )}

        {/* Privacy Guarantees */}
        <section className="mb-6">
          <PrivacyGuaranteesCard />
        </section>

        {/* Trust Message */}
        <section className="text-center mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <img src={humanfirstLogo} alt="HumanFirst" className="w-5 h-5 rounded object-contain" />
            <span className="text-sm font-medium text-primary">Built on Trust</span>
          </div>
          <p className="text-muted-foreground max-w-lg mx-auto">
            HumanFirst helps create focused learning environments without compromising your privacy.
            We believe education thrives on trust, not surveillance.
          </p>
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;
