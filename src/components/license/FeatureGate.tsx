import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLicenseTier } from '@/hooks/useLicenseTier';
import { PLAN_FEATURES, PlanType } from '@/types/organization';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  requiredPlan?: PlanType;
}

export const FeatureGate = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  requiredPlan,
}: FeatureGateProps) => {
  const navigate = useNavigate();
  const { licenseStatus, featureAccess } = useLicenseTier();

  // Check if feature is available based on the feature key
  const hasAccess = (() => {
    switch (feature) {
      case 'create_policies':
        return featureAccess.canCreatePolicies;
      case 'audit_logs':
        return featureAccess.canAccessAuditLogs;
      case 'ai_service_blocking':
        return featureAccess.canBlockAiServices;
      case 'policy_sharing':
        return featureAccess.canSharePolicies;
      case 'custom_branding':
        return featureAccess.canCustomBrand;
      case 'api_access':
        return featureAccess.canAccessApi;
      case 'sso':
        return featureAccess.canUseSso;
      default:
        // Check if it's in the plan's enabled features
        const planConfig = PLAN_FEATURES[licenseStatus.planType];
        return planConfig.limits.featuresEnabled.includes(feature);
    }
  })();

  if (hasAccess) {
    return <>{children}</>;
  }

  // Find which plan unlocks this feature
  const unlockingPlan = requiredPlan || (() => {
    for (const plan of ['standard', 'institution'] as PlanType[]) {
      if (PLAN_FEATURES[plan].limits.featuresEnabled.includes(feature)) {
        return plan;
      }
    }
    return 'standard' as PlanType;
  })();

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-flex">
            <div className="opacity-50 pointer-events-none">{children}</div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/pricing')}
                className="gap-1"
              >
                <Lock className="w-3 h-3" />
                Upgrade
              </Button>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>This feature requires {PLAN_FEATURES[unlockingPlan].label} plan</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Simple locked state indicator
export const LockedFeature = ({
  featureName,
  requiredPlan = 'standard',
}: {
  featureName: string;
  requiredPlan?: PlanType;
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-lg border border-dashed border-border">
      <Lock className="w-10 h-10 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-foreground mb-1">{featureName}</h3>
      <p className="text-sm text-muted-foreground text-center mb-4">
        Available on {PLAN_FEATURES[requiredPlan].label} and above
      </p>
      <Button onClick={() => navigate('/pricing')} variant="default" size="sm">
        <Zap className="w-4 h-4 mr-1" />
        Upgrade to Unlock
      </Button>
    </div>
  );
};

export default FeatureGate;
