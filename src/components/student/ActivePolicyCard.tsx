import { Clock, AlertCircle, CheckCircle, Shield, Building2, Calendar, Lock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivePolicyCardProps {
  policy: {
    id: string;
    title: string;
    description?: string | null;
    policy_type: 'exam' | 'focus' | 'custom';
    start_time: string;
    end_time: string;
    blocked_categories: string[];
    blocked_services?: string[];
    enforcement_level: 'strict' | 'soft';
    organization_name?: string;
  } | null;
  isLoading?: boolean;
  error?: string | null;
}

const ActivePolicyCard = ({ policy, isLoading, error }: ActivePolicyCardProps) => {
  // Error state - fail loudly
  if (error) {
    return (
      <div className="glass-card p-6 sm:p-8 border-2 border-destructive/50">
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              Unable to Load Policy Status
            </h2>
            <p className="text-base sm:text-lg text-destructive">
              {error}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please refresh the page or contact your administrator if this persists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="glass-card p-6 sm:p-8 border-2 border-border animate-pulse">
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-muted rounded w-1/4" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // No active policy - explicit and honest
  if (!policy) {
    return (
      <div className="glass-card p-6 sm:p-8 border-2 border-success/50">
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              No Active Restrictions
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-4">
              You currently have full access to all services. No policies are being enforced at this time.
            </p>
            <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">What this means:</strong>{' '}
                There are no exam or assignment policies currently active for your account. 
                You may use all AI tools and services without restriction. Check back during scheduled 
                assessment periods for any applicable policies.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isExam = policy.policy_type === 'exam';
  const isFocus = policy.policy_type === 'focus';
  const isCustom = policy.policy_type === 'custom';
  
  const borderColor = isExam ? 'border-destructive/50' : isFocus ? 'border-warning/50' : 'border-primary/50';
  const bgColor = isExam ? 'bg-destructive/10' : isFocus ? 'bg-warning/10' : 'bg-primary/10';
  const iconColor = isExam ? 'text-destructive' : isFocus ? 'text-warning' : 'text-primary';
  
  const policyTypeLabel = isExam ? 'Exam Mode' : isFocus ? 'Assignment Mode' : 'Custom Policy';

  return (
    <div className={`glass-card p-6 sm:p-8 border-2 ${borderColor}`}>
      <div className="flex items-start gap-4 sm:gap-6">
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
          {isExam ? (
            <AlertCircle className={`w-7 h-7 sm:w-8 sm:h-8 ${iconColor}`} />
          ) : (
            <Shield className={`w-7 h-7 sm:w-8 sm:h-8 ${iconColor}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {/* Policy Type Badge + Enforcement Level */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-semibold uppercase rounded ${
              isExam 
                ? 'bg-destructive/20 text-destructive' 
                : isFocus
                ? 'bg-warning/20 text-warning'
                : 'bg-primary/20 text-primary'
            }`}>
              {policyTypeLabel}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${
              policy.enforcement_level === 'strict'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Lock className="w-3 h-3" />
              {policy.enforcement_level === 'strict' ? 'Strictly Enforced' : 'Policy-Based'}
            </span>
          </div>
          
          {/* Policy Name */}
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
            {policy.title}
          </h2>
          
          {policy.description && (
            <p className="text-muted-foreground mb-3">{policy.description}</p>
          )}
          
          {/* Active Time Window - Explicit */}
          <div className="grid sm:grid-cols-2 gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Started:</span>
              <span className="text-foreground font-medium">
                {format(new Date(policy.start_time), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Ends:</span>
              <span className="text-foreground font-medium">
                {format(new Date(policy.end_time), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
          </div>
          
          {/* Time remaining */}
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              Ends {formatDistanceToNow(new Date(policy.end_time), { addSuffix: true })}
            </span>
          </div>
          
          {/* Blocked Categories */}
          {policy.blocked_categories.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground mb-2">Blocked Service Categories:</p>
              <div className="flex flex-wrap gap-2">
                {policy.blocked_categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-full text-sm font-medium"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Blocked Services (specific) */}
          {policy.blocked_services && policy.blocked_services.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-foreground mb-2">Specifically Blocked Services:</p>
              <div className="flex flex-wrap gap-2">
                {policy.blocked_services.map((service) => (
                  <span
                    key={service}
                    className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Reason for Enforcement - EXPLICIT */}
          <div className={`p-4 ${isExam ? 'bg-destructive/5 border-destructive/20' : isFocus ? 'bg-warning/5 border-warning/20' : 'bg-primary/5 border-primary/20'} border rounded-xl`}>
            <div className="flex items-start gap-2 mb-2">
              <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-sm font-semibold text-foreground">
                Reason for Enforcement: Institution Policy
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {isExam 
                ? `This restriction is applied by your institution during the scheduled exam period. Access to ${policy.blocked_categories.join(', ')} services is restricted to maintain academic integrity.`
                : isFocus
                ? `This assignment mode policy is applied by your institution to support focused learning. Access to ${policy.blocked_categories.join(', ')} services is limited during this time.`
                : `This custom policy is applied by your institution per their specific requirements. Access to ${policy.blocked_categories.join(', ')} services is restricted.`
              }
            </p>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Your privacy is fully protected—no content reading, no keystroke logging, no screen monitoring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivePolicyCard;
