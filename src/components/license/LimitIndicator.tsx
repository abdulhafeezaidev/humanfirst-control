import { useNavigate } from 'react-router-dom';
import { AlertCircle, Users, Monitor, GraduationCap, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useLicenseTier } from '@/hooks/useLicenseTier';
import { PLAN_FEATURES } from '@/types/organization';

type LimitType = 'devices' | 'admins' | 'students';

interface LimitIndicatorProps {
  type: LimitType;
  current: number;
  showUpgradeOnLimit?: boolean;
}

const LIMIT_CONFIG: Record<LimitType, { icon: typeof Users; label: string }> = {
  devices: { icon: Monitor, label: 'Devices' },
  admins: { icon: Users, label: 'Admins' },
  students: { icon: GraduationCap, label: 'Students' },
};

export const LimitIndicator = ({
  type,
  current,
  showUpgradeOnLimit = true,
}: LimitIndicatorProps) => {
  const navigate = useNavigate();
  const { licenseStatus } = useLicenseTier();
  const planConfig = PLAN_FEATURES[licenseStatus.planType];

  const getMaxLimit = (): number => {
    switch (type) {
      case 'devices':
        return planConfig.limits.maxDevices;
      case 'admins':
        return planConfig.limits.maxAdmins;
      case 'students':
        return planConfig.limits.maxStudents;
      default:
        return 0;
    }
  };
  
  const max = getMaxLimit();
  const Icon = LIMIT_CONFIG[type].icon;
  
  // -1 means unlimited
  if (max === -1) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span>{current} {LIMIT_CONFIG[type].label}</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          Unlimited
        </span>
      </div>
    );
  }

  const percentage = Math.min((current / max) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{LIMIT_CONFIG[type].label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              isAtLimit
                ? 'text-destructive font-medium'
                : isNearLimit
                ? 'text-warning font-medium'
                : 'text-muted-foreground'
            }`}
          >
            {current} / {max}
          </span>
          {isAtLimit && <AlertCircle className="w-4 h-4 text-destructive" />}
        </div>
      </div>
      <Progress
        value={percentage}
        className={`h-2 ${
          isAtLimit
            ? '[&>div]:bg-destructive'
            : isNearLimit
            ? '[&>div]:bg-warning'
            : ''
        }`}
      />
      {isAtLimit && showUpgradeOnLimit && (
        <div className="flex items-center justify-between mt-2 p-2 bg-destructive/10 rounded-md">
          <span className="text-xs text-destructive">Limit reached</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pricing')}
            className="h-6 text-xs"
          >
            <Zap className="w-3 h-3 mr-1" />
            Upgrade
          </Button>
        </div>
      )}
    </div>
  );
};

// Compact version for sidebar/header
export const CompactLimitBadge = ({ type, current }: { type: LimitType; current: number }) => {
  const { licenseStatus } = useLicenseTier();
  const planConfig = PLAN_FEATURES[licenseStatus.planType];
  
  const limitKey = `max${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof planConfig.limits;
  const max = planConfig.limits[limitKey] as number;

  if (max === -1) return null;

  const isAtLimit = current >= max;

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        isAtLimit
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {current}/{max}
    </span>
  );
};

export default LimitIndicator;
