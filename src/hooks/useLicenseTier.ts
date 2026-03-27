import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Organization, PlanType } from '@/types/organization';
import { PLAN_FEATURES } from '@/types/organization';

export interface LicenseStatus {
  planType: PlanType;
  isExpired: boolean;
  daysRemaining: number | null;
  expiresAt: Date | null;
  organization: Organization | null;
  isLoading: boolean;
}

export interface FeatureAccess {
  canCreatePolicies: boolean;
  canAccessAuditLogs: boolean;
  canBlockAiServices: boolean;
  canSharePolicies: boolean;
  canCustomBrand: boolean;
  canAccessApi: boolean;
  canUseSso: boolean;
  deviceLimitReached: boolean;
  adminLimitReached: boolean;
  studentLimitReached: boolean;
  requiresWatermark: boolean;
}

export const useLicenseTier = () => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDeviceCount, setCurrentDeviceCount] = useState(0);
  const [currentAdminCount, setCurrentAdminCount] = useState(0);
  const [currentStudentCount, setCurrentStudentCount] = useState(0);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get user's organization through profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .single();

          if (org) {
            setOrganization(org as Organization);

            // Get counts for limit checking
            const [{ count: deviceCount }, { count: adminCount }, { count: studentCount }] = await Promise.all([
              supabase
                .from('profiles')
                .select('device_id', { count: 'exact', head: true })
                .eq('organization_id', org.id)
                .not('device_id', 'is', null),
              supabase
                .from('user_roles')
                .select('*', { count: 'exact', head: true })
                .in('role', ['admin', 'super_admin']),
              supabase
                .from('user_roles')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student'),
            ]);

            setCurrentDeviceCount(deviceCount || 0);
            setCurrentAdminCount(adminCount || 0);
            setCurrentStudentCount(studentCount || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching organization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, [user]);

  const licenseStatus: LicenseStatus = useMemo(() => {
    if (!organization) {
      return {
        planType: 'pilot' as PlanType,
        isExpired: false,
        daysRemaining: null,
        expiresAt: null,
        organization: null,
        isLoading,
      };
    }

    const expiresAt = organization.pilot_expires_at 
      ? new Date(organization.pilot_expires_at) 
      : null;
    
    const now = new Date();
    const isExpired = organization.plan_type === 'pilot' && expiresAt 
      ? expiresAt < now 
      : false;
    
    const daysRemaining = expiresAt 
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      planType: organization.plan_type as PlanType,
      isExpired,
      daysRemaining,
      expiresAt,
      organization,
      isLoading,
    };
  }, [organization, isLoading]);

  const featureAccess: FeatureAccess = useMemo(() => {
    const planType = licenseStatus.planType;
    const planConfig = PLAN_FEATURES[planType];
    const features = planConfig.limits.featuresEnabled;
    const isExpired = licenseStatus.isExpired;

    // When pilot is expired, lock policy creation but keep enforcement active
    const canCreatePolicies = !isExpired && features.includes('basic_policies');

    return {
      canCreatePolicies,
      canAccessAuditLogs: features.includes('audit_logs'),
      canBlockAiServices: features.includes('ai_service_blocking'),
      canSharePolicies: features.includes('policy_sharing'),
      canCustomBrand: features.includes('custom_branding'),
      canAccessApi: features.includes('api_access'),
      canUseSso: features.includes('sso'),
      deviceLimitReached: planConfig.limits.maxDevices !== -1 && 
        currentDeviceCount >= planConfig.limits.maxDevices,
      adminLimitReached: planConfig.limits.maxAdmins !== -1 && 
        currentAdminCount >= planConfig.limits.maxAdmins,
      studentLimitReached: planConfig.limits.maxStudents !== -1 && 
        currentStudentCount >= planConfig.limits.maxStudents,
      // Pilot tier always requires watermark on exports
      requiresWatermark: planType === 'pilot',
    };
  }, [licenseStatus, currentDeviceCount, currentAdminCount, currentStudentCount]);

  return {
    licenseStatus,
    featureAccess,
    organization,
    isLoading,
  };
};

// Helper function to check if a specific feature is available
export const hasFeature = (features: string[], feature: string): boolean => {
  return features.includes(feature);
};

// Get upgrade path for a plan
export const getUpgradePath = (currentPlan: PlanType): PlanType | null => {
  switch (currentPlan) {
    case 'pilot':
      return 'standard';
    case 'standard':
      return 'institution';
    default:
      return null;
  }
};
