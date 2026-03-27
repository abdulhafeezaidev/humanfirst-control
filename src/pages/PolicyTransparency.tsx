import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, LogOut, FileText, Download, Link2, Copy, Check,
  Clock, Bot, Calendar, Users, Wifi, WifiOff, Radio, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ExamPolicy {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
  blocked_categories: string[];
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
  share_token: string | null;
  share_enabled: boolean;
}

const PolicyTransparency = () => {
  const { user, role, signOut, loading, ethicsAccepted } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [policies, setPolicies] = useState<ExamPolicy[]>([]);
  const [aiServices, setAiServices] = useState<AIService[]>([]);
  const [enforcementConfig, setEnforcementConfig] = useState<EnforcementConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [isUpdatingShare, setIsUpdatingShare] = useState(false);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      navigate('/auth');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (!loading && user && role === 'admin' && !ethicsAccepted) {
      navigate('/admin');
    }
  }, [user, role, loading, ethicsAccepted, navigate]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    const [policiesRes, servicesRes, configRes] = await Promise.all([
      supabase.from('exam_policies').select('*').order('start_time', { ascending: false }),
      supabase.from('ai_services').select('*').order('category'),
      supabase.from('enforcement_config').select('*').limit(1).maybeSingle()
    ]);

    if (policiesRes.data) setPolicies(policiesRes.data);
    if (servicesRes.data) setAiServices(servicesRes.data);
    if (configRes.data) setEnforcementConfig(configRes.data as EnforcementConfig);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getActivePolicy = () => {
    const now = new Date();
    return policies.find(p => 
      p.is_active && 
      new Date(p.start_time) <= now && 
      new Date(p.end_time) >= now
    );
  };

  const getUpcomingPolicies = () => {
    const now = new Date();
    return policies.filter(p => 
      p.is_active && new Date(p.start_time) > now
    );
  };

  const getBlockedServices = () => {
    return aiServices.filter(s => s.is_blocked_during_exam);
  };

  const toggleShareEnabled = async () => {
    if (!enforcementConfig) return;
    
    setIsUpdatingShare(true);
    const { error } = await supabase
      .from('enforcement_config')
      .update({ share_enabled: !enforcementConfig.share_enabled })
      .eq('id', enforcementConfig.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update sharing settings",
        variant: "destructive",
      });
    } else {
      setEnforcementConfig({
        ...enforcementConfig,
        share_enabled: !enforcementConfig.share_enabled
      });
      toast({
        title: enforcementConfig.share_enabled ? "Sharing Disabled" : "Sharing Enabled",
        description: enforcementConfig.share_enabled 
          ? "The public policy link is now inactive" 
          : "Anyone with the link can now view the policy summary",
      });
    }
    setIsUpdatingShare(false);
  };

  const copyShareLink = () => {
    if (!enforcementConfig?.share_token) return;
    
    const shareUrl = `${window.location.origin}/policy/share/${enforcementConfig.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({
      title: "Link Copied",
      description: "Share link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const exportAsJson = () => {
    const activePolicy = getActivePolicy();
    const blockedServices = getBlockedServices();
    
    const exportData = {
      generated_at: new Date().toISOString(),
      enforcement_status: enforcementConfig?.status || 'not_connected',
      active_policy: activePolicy ? {
        title: activePolicy.title,
        description: activePolicy.description,
        start_time: activePolicy.start_time,
        end_time: activePolicy.end_time,
        blocked_categories: activePolicy.blocked_categories
      } : null,
      upcoming_policies: getUpcomingPolicies().map(p => ({
        title: p.title,
        start_time: p.start_time,
        end_time: p.end_time,
        blocked_categories: p.blocked_categories
      })),
      blocked_services: blockedServices.map(s => ({
        name: s.name,
        category: s.category,
        domains: s.domains
      })),
      scope: {
        level: 'user',
        description: 'Policies apply to individual authenticated users'
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policy-transparency-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "Policy configuration exported as JSON",
    });
  };

  const exportAsPdf = () => {
    window.print();
  };

  const activePolicy = getActivePolicy();
  const upcomingPolicies = getUpcomingPolicies();
  const blockedServices = getBlockedServices();

  const getEnforcementStatusLabel = () => {
    switch (enforcementConfig?.status) {
      case 'active': return { label: 'Actively Enforced', color: 'text-green-600', bg: 'bg-green-100' };
      case 'connected_simulated': return { label: 'Simulated Mode', color: 'text-amber-600', bg: 'bg-amber-100' };
      default: return { label: 'Not Connected', color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  const statusInfo = getEnforcementStatusLabel();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - hidden in print */}
      <header className="bg-card border-b border-border print:hidden">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">HumanFirst</span>
              <span className="ml-2 text-sm text-muted-foreground">Policy Transparency</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/admin')} variant="ghost">
              Back to Dashboard
            </Button>
            <Button onClick={handleSignOut} variant="ghost">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8" ref={printRef}>
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Policy Transparency – Enforced Rules</h1>
          </div>
          <p className="text-muted-foreground">
            Read-only overview of all active and scheduled policies, restrictions, and enforcement status.
          </p>
        </div>

        {/* Export & Share Actions - hidden in print */}
        <section className="mb-8 print:hidden">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export & Share
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Export Options */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Download current policy configuration</p>
                <div className="flex gap-2">
                  <Button onClick={exportAsPdf} variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF
                  </Button>
                  <Button onClick={exportAsJson} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export as JSON
                  </Button>
                </div>
              </div>

              {/* Shareable Link */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Public read-only link</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{enforcementConfig?.share_enabled ? 'Enabled' : 'Disabled'}</span>
                    <Switch 
                      checked={enforcementConfig?.share_enabled || false}
                      onCheckedChange={toggleShareEnabled}
                      disabled={isUpdatingShare}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm truncate">
                    {enforcementConfig?.share_enabled && enforcementConfig?.share_token
                      ? `${window.location.origin}/policy/share/${enforcementConfig.share_token}`
                      : 'Enable sharing to generate link'}
                  </div>
                  <Button 
                    onClick={copyShareLink} 
                    variant="outline"
                    disabled={!enforcementConfig?.share_enabled}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enforcement Status */}
        <section className="mb-8">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {enforcementConfig?.status === 'active' ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : enforcementConfig?.status === 'connected_simulated' ? (
                <Radio className="w-5 h-5 text-amber-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-muted-foreground" />
              )}
              Enforcement Status
            </h2>
            
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className="text-muted-foreground text-sm">
                {enforcementConfig?.status === 'active' 
                  ? 'Restrictions are actively enforced on connected devices'
                  : enforcementConfig?.status === 'connected_simulated'
                  ? 'System is connected but operating in test mode'
                  : 'No enforcement system connected'}
              </span>
            </div>
          </div>
        </section>

        {/* Active Exam Mode */}
        <section className="mb-8">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Exam / Focus Mode Status
            </h2>
            
            {activePolicy ? (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{activePolicy.title}</h3>
                    {activePolicy.description && (
                      <p className="text-sm text-muted-foreground mt-1">{activePolicy.description}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded">
                    ACTIVE NOW
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Started:</span>
                    <span className="ml-2 text-foreground">{format(new Date(activePolicy.start_time), 'PPp')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ends:</span>
                    <span className="ml-2 text-foreground">{format(new Date(activePolicy.end_time), 'PPp')}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-muted-foreground text-sm">Blocked categories:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activePolicy.blocked_categories.map((cat) => (
                      <span key={cat} className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <AlertCircle className="w-5 h-5" />
                <span>No exam mode currently active</span>
              </div>
            )}
          </div>
        </section>

        {/* Upcoming Schedules */}
        <section className="mb-8">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Scheduled Policies
            </h2>
            
            {upcomingPolicies.length > 0 ? (
              <div className="space-y-3">
                {upcomingPolicies.map((policy) => (
                  <div key={policy.id} className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-foreground">{policy.title}</h3>
                      <span className="text-xs text-muted-foreground">Upcoming</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {format(new Date(policy.start_time), 'PPp')} — {format(new Date(policy.end_time), 'PPp')}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {policy.blocked_categories.map((cat) => (
                        <span key={cat} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No upcoming policies scheduled</p>
            )}
          </div>
        </section>

        {/* Blocked AI Services */}
        <section className="mb-8">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Blocked AI Websites & Apps
            </h2>
            
            {blockedServices.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {blockedServices.map((service) => (
                  <div key={service.id} className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                    <div className="font-medium text-foreground">{service.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{service.category}</div>
                    <div className="text-xs text-destructive/70 mt-2 truncate">
                      {service.domains.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No services currently marked for blocking</p>
            )}
          </div>
        </section>

        {/* Scope of Enforcement */}
        <section className="mb-8">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Scope of Enforcement
            </h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-1">Level</h3>
                <p className="text-sm text-muted-foreground">User-based</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-1">Target</h3>
                <p className="text-sm text-muted-foreground">Individual authenticated users</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-1">Method</h3>
                <p className="text-sm text-muted-foreground">Policy-based with optional device enforcement</p>
              </div>
            </div>
          </div>
        </section>

        {/* Generated Timestamp */}
        <div className="text-center text-sm text-muted-foreground">
          Generated on {format(new Date(), 'PPpp')}
        </div>
      </main>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .glass-card { 
            background: white !important; 
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PolicyTransparency;
