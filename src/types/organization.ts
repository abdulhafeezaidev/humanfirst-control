export type PlanType = 'pilot' | 'standard' | 'institution';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_type: PlanType;
  max_devices: number;
  max_admins: number;
  max_students: number;
  features_enabled: string[];
  pilot_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  audit_log_retention_days: number;
  tamper_event_retention_days: number;
}

export interface PlanLimits {
  maxDevices: number;
  maxAdmins: number;
  maxStudents: number;
  featuresEnabled: string[];
}

export const PLAN_FEATURES: Record<PlanType, {
  label: string;
  description: string;
  limits: PlanLimits;
  color: string;
  bgColor: string;
}> = {
  pilot: {
    label: 'Pilot',
    description: 'Trial period with limited features',
    limits: {
      maxDevices: 10,
      maxAdmins: 2,
      maxStudents: 50,
      featuresEnabled: ['basic_policies', 'tamper_detection'],
    },
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  standard: {
    label: 'Standard',
    description: 'Full features for small to medium institutions',
    limits: {
      maxDevices: 100,
      maxAdmins: 5,
      maxStudents: 500,
      featuresEnabled: ['basic_policies', 'tamper_detection', 'audit_logs', 'ai_service_blocking', 'policy_sharing'],
    },
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  institution: {
    label: 'Institution',
    description: 'Enterprise features with unlimited scale',
    limits: {
      maxDevices: -1, // unlimited
      maxAdmins: -1,
      maxStudents: -1,
      featuresEnabled: ['basic_policies', 'tamper_detection', 'audit_logs', 'ai_service_blocking', 'policy_sharing', 'custom_branding', 'api_access', 'sso'],
    },
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

export const FEATURE_LABELS: Record<string, string> = {
  basic_policies: 'Exam Policies',
  tamper_detection: 'Tamper Detection',
  audit_logs: 'Audit Logs',
  ai_service_blocking: 'AI Service Blocking',
  policy_sharing: 'Policy Sharing',
  custom_branding: 'Custom Branding',
  api_access: 'API Access',
  sso: 'Single Sign-On',
};
