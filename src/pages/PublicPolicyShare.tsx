import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Shield, Clock, Bot, Calendar, AlertCircle, 
  Wifi, WifiOff, Radio, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PolicySummary {
  enforcement_status: 'not_connected' | 'connected_simulated' | 'active';
  active_policy: {
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    blocked_categories: string[];
  } | null;
  upcoming_policies: Array<{
    title: string;
    start_time: string;
    end_time: string;
    blocked_categories: string[];
  }> | null;
  blocked_services: Array<{
    name: string;
    category: string;
    domains: string[];
  }> | null;
  generated_at: string;
  error?: string;
}

const PublicPolicyShare = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PolicySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchPolicySummary();
    }
  }, [token]);

  const fetchPolicySummary = async () => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_public_policy_summary', { p_share_token: token });

      if (rpcError) {
        setError('Failed to load policy summary');
        return;
      }

      const result = data as unknown as PolicySummary;
      
      if (result?.error) {
        setError(result.error);
        return;
      }

      setSummary(result);
    } catch {
      setError('Failed to load policy summary');
    } finally {
      setLoading(false);
    }
  };

  const getEnforcementStatusLabel = () => {
    switch (summary?.enforcement_status) {
      case 'active': return { label: 'Actively Enforced', color: 'text-green-600', bg: 'bg-green-100', icon: Wifi };
      case 'connected_simulated': return { label: 'Simulated Mode', color: 'text-amber-600', bg: 'bg-amber-100', icon: Radio };
      default: return { label: 'Not Connected', color: 'text-muted-foreground', bg: 'bg-muted', icon: WifiOff };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft text-primary">Loading policy summary...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">
            This link may be invalid or sharing has been disabled by the administrator.
          </p>
        </div>
      </div>
    );
  }

  const statusInfo = getEnforcementStatusLabel();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="w-4 h-4" />
            Read-only view
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Page Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Policy Transparency – Enforced Rules
          </h1>
          <p className="text-muted-foreground">
            Public read-only view of current policy configuration
          </p>
        </div>

        {/* Enforcement Status */}
        <section className="mb-8">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
              Enforcement Status
            </h2>
            
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className="text-muted-foreground text-sm">
                {summary?.enforcement_status === 'active' 
                  ? 'Restrictions are actively enforced'
                  : summary?.enforcement_status === 'connected_simulated'
                  ? 'System is in test mode'
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
            
            {summary?.active_policy ? (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{summary.active_policy.title}</h3>
                    {summary.active_policy.description && (
                      <p className="text-sm text-muted-foreground mt-1">{summary.active_policy.description}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-medium rounded">
                    ACTIVE NOW
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Started:</span>
                    <span className="ml-2 text-foreground">
                      {format(new Date(summary.active_policy.start_time), 'PPp')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ends:</span>
                    <span className="ml-2 text-foreground">
                      {format(new Date(summary.active_policy.end_time), 'PPp')}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-muted-foreground text-sm">Blocked categories:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {summary.active_policy.blocked_categories.map((cat) => (
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
            
            {summary?.upcoming_policies && summary.upcoming_policies.length > 0 ? (
              <div className="space-y-3">
                {summary.upcoming_policies.map((policy, index) => (
                  <div key={index} className="bg-muted/50 rounded-lg p-4">
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
            
            {summary?.blocked_services && summary.blocked_services.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {summary.blocked_services.map((service, index) => (
                  <div key={index} className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
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

        {/* Generated Timestamp */}
        <div className="text-center text-sm text-muted-foreground">
          {summary?.generated_at && (
            <>Generated on {format(new Date(summary.generated_at), 'PPpp')}</>
          )}
        </div>
      </main>
    </div>
  );
};

export default PublicPolicyShare;
