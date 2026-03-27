import { Building2, Users, Monitor, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { Organization, PLAN_FEATURES, FEATURE_LABELS } from '@/types/organization';
import { format, differenceInDays } from 'date-fns';

interface PlanStatusCardProps {
  organization: Organization;
  currentAdminCount?: number;
  currentStudentCount?: number;
  currentDeviceCount?: number;
}

const PlanStatusCard = ({ 
  organization, 
  currentAdminCount = 0,
  currentStudentCount = 0,
  currentDeviceCount = 0 
}: PlanStatusCardProps) => {
  const planConfig = PLAN_FEATURES[organization.plan_type];
  const isUnlimited = (limit: number) => limit === -1;
  
  const pilotDaysRemaining = organization.pilot_expires_at 
    ? differenceInDays(new Date(organization.pilot_expires_at), new Date())
    : null;

  const getUsageColor = (current: number, max: number) => {
    if (max === -1) return 'text-muted-foreground';
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'text-destructive';
    if (percentage >= 75) return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${planConfig.bgColor} flex items-center justify-center`}>
            <Building2 className={`w-6 h-6 ${planConfig.color}`} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{organization.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${planConfig.bgColor} ${planConfig.color}`}>
                {planConfig.label} Plan
              </span>
              {organization.plan_type === 'pilot' && pilotDaysRemaining !== null && (
                <span className={`text-xs ${pilotDaysRemaining <= 7 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {pilotDaysRemaining > 0 
                    ? `${pilotDaysRemaining} days remaining`
                    : 'Expired'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${organization.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {organization.is_active ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Admins</span>
          </div>
          <p className={`text-2xl font-bold ${getUsageColor(currentAdminCount, organization.max_admins)}`}>
            {currentAdminCount}
            <span className="text-sm font-normal text-muted-foreground">
              /{isUnlimited(organization.max_admins) ? '∞' : organization.max_admins}
            </span>
          </p>
        </div>

        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Students</span>
          </div>
          <p className={`text-2xl font-bold ${getUsageColor(currentStudentCount, organization.max_students)}`}>
            {currentStudentCount}
            <span className="text-sm font-normal text-muted-foreground">
              /{isUnlimited(organization.max_students) ? '∞' : organization.max_students}
            </span>
          </p>
        </div>

        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Devices</span>
          </div>
          <p className={`text-2xl font-bold ${getUsageColor(currentDeviceCount, organization.max_devices)}`}>
            {currentDeviceCount}
            <span className="text-sm font-normal text-muted-foreground">
              /{isUnlimited(organization.max_devices) ? '∞' : organization.max_devices}
            </span>
          </p>
        </div>
      </div>

      {/* Features */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Enabled Features</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(FEATURE_LABELS).map(([key, label]) => {
            const isEnabled = organization.features_enabled.includes(key);
            return (
              <div 
                key={key} 
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                  isEnabled 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isEnabled ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Details */}
      {organization.pilot_expires_at && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              Pilot expires: {format(new Date(organization.pilot_expires_at), 'PPP')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanStatusCard;
