import { Calendar, Clock, Shield, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface UpcomingPolicy {
  id: string;
  title: string;
  policy_type: 'exam' | 'focus' | 'custom';
  start_time: string;
  end_time: string;
  blocked_categories: string[];
  enforcement_level: 'strict' | 'soft';
}

interface UpcomingPoliciesCardProps {
  policies: UpcomingPolicy[];
}

const UpcomingPoliciesCard = ({ policies }: UpcomingPoliciesCardProps) => {
  if (policies.length === 0) return null;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Upcoming Policies</h3>
          <p className="text-sm text-muted-foreground">Scheduled restriction periods</p>
        </div>
      </div>

      <div className="space-y-3">
        {policies.map((policy) => {
          const isExam = policy.policy_type === 'exam';
          const isFocus = policy.policy_type === 'focus';
          
          return (
            <div key={policy.id} className="p-4 bg-muted/50 border border-border rounded-xl">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isExam ? (
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  ) : isFocus ? (
                    <Shield className="w-4 h-4 text-warning flex-shrink-0" />
                  ) : (
                    <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                  <h4 className="font-semibold text-foreground truncate">{policy.title}</h4>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium uppercase rounded flex-shrink-0 ${
                  isExam 
                    ? 'bg-destructive/20 text-destructive' 
                    : isFocus
                    ? 'bg-warning/20 text-warning'
                    : 'bg-primary/20 text-primary'
                }`}>
                  {isExam ? 'Exam Mode' : isFocus ? 'Assignment Mode' : 'Policy'}
                </span>
              </div>
              
              {/* Time info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                <span>
                  Starts {formatDistanceToNow(new Date(policy.start_time), { addSuffix: true })}
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                {format(new Date(policy.start_time), 'MMM d, yyyy HH:mm')} —{' '}
                {format(new Date(policy.end_time), 'MMM d, yyyy HH:mm')}
              </p>
              
              {/* Blocked categories */}
              <div className="flex flex-wrap gap-1">
                {policy.blocked_categories.slice(0, 3).map((cat) => (
                  <span
                    key={cat}
                    className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full"
                  >
                    {cat}
                  </span>
                ))}
                {policy.blocked_categories.length > 3 && (
                  <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                    +{policy.blocked_categories.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingPoliciesCard;
