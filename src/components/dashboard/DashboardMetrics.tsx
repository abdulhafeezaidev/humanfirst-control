import { Users, FileText, AlertTriangle, Shield, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
}

const MetricCard = ({ title, value, icon, description, trend, trendValue, variant = 'default' }: MetricCardProps) => {
  const variantStyles = {
    default: 'bg-card border-border',
    warning: 'bg-warning/5 border-warning/20',
    success: 'bg-success/5 border-success/20',
    destructive: 'bg-destructive/5 border-destructive/20',
  };

  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card className={cn('border-2 transition-all hover:shadow-md', variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && trendValue && (
              <div className={cn(
                'text-xs mt-2 flex items-center gap-1',
                trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
              </div>
            )}
          </div>
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconStyles[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface DashboardMetricsProps {
  studentCount: number;
  activePolicies: number;
  totalPolicies: number;
  unresolvedAlerts: number;
  totalAlerts: number;
  enforcementStatus: 'not_connected' | 'connected_simulated' | 'active';
  pilotDaysRemaining?: number;
}

export const DashboardMetrics = ({
  studentCount,
  activePolicies,
  totalPolicies,
  unresolvedAlerts,
  totalAlerts,
  enforcementStatus,
  pilotDaysRemaining,
}: DashboardMetricsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <MetricCard
        title="Enrolled Students"
        value={studentCount}
        icon={<Users className="w-6 h-6" />}
        description="Active in your institution"
        variant="default"
      />
      <MetricCard
        title="Active Policies"
        value={`${activePolicies}/${totalPolicies}`}
        icon={<FileText className="w-6 h-6" />}
        description="Currently enforcing"
        variant={activePolicies > 0 ? 'success' : 'default'}
      />
      <MetricCard
        title="Enforcement Alerts"
        value={unresolvedAlerts}
        icon={<AlertTriangle className="w-6 h-6" />}
        description={`${totalAlerts} total events`}
        variant={unresolvedAlerts > 0 ? 'warning' : 'default'}
      />
      <MetricCard
        title="Enforcement Status"
        value={enforcementStatus === 'active' ? 'Active' : enforcementStatus === 'connected_simulated' ? 'Simulated' : 'Inactive'}
        icon={<Shield className="w-6 h-6" />}
        description={
          enforcementStatus === 'active' 
            ? 'Full enforcement enabled' 
            : enforcementStatus === 'connected_simulated'
            ? 'Pilot mode active'
            : 'Not connected'
        }
        variant={enforcementStatus === 'active' ? 'success' : enforcementStatus === 'connected_simulated' ? 'warning' : 'default'}
      />
      {pilotDaysRemaining !== undefined && pilotDaysRemaining > 0 && (
        <div className="sm:col-span-2 lg:col-span-4">
          <MetricCard
            title="Pilot Days Remaining"
            value={pilotDaysRemaining}
            icon={<Clock className="w-6 h-6" />}
            description="Contact support to extend your pilot"
            variant={pilotDaysRemaining < 7 ? 'warning' : 'default'}
          />
        </div>
      )}
    </div>
  );
};

export default DashboardMetrics;
