/**
 * Data Export Edge Function
 * 
 * Provides complete database, auth, and storage export for migration purposes.
 * ADMIN/SUPER_ADMIN only - exports all org data for migration to external Supabase.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AppRole = 'super_admin' | 'admin' | 'viewer' | 'student';

interface AuthResult {
  userId: string;
  role: AppRole;
  organizationId: string | null;
  email: string | null;
}

// Tables to export (in dependency order for foreign keys)
const EXPORT_TABLES = [
  'organizations',
  'profiles',
  'user_roles',
  'admin_invitations',
  'student_invitations',
  'exam_policies',
  'policy_assignments',
  'policy_assignment_logs',
  'blocked_urls',
  'enforcement_config',
  'ai_services',
  'tamper_events',
  'audit_logs',
  'metrics_daily',
  'metrics_monthly',
] as const;

async function validateAuth(req: Request): Promise<AuthResult | { error: string; status: number }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  // Use service role key to verify the user's token and bypass RLS for export
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify the JWT token and get user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !user) {
    console.error('JWT validation failed:', userError);
    return { error: 'Invalid or expired token', status: 401 };
  }

  const userId = user.id;
  const email = user.email || null;

  // Fetch role from database
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError || !roleData) {
    console.error('Failed to fetch role:', roleError);
    return { error: 'User has no assigned role', status: 403 };
  }

  // Fetch organization ID
  const { data: profileData } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    userId,
    role: roleData.role as AppRole,
    organizationId: profileData?.organization_id || null,
    email,
  };
}

async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc('check_rate_limit', {
    p_identifier: userId,
    p_identifier_type: 'user',
    p_action: 'data_export',
    p_limit: 1,
    p_window_seconds: 600, // 10 minutes
  });
  
  return data === true;
}

async function logExportAction(supabase: any, userId: string, exportType: string, metadata: Record<string, unknown>) {
  try {
    await supabase.rpc('log_admin_action', {
      p_action: 'data_export',
      p_target: 'organizations',
      p_target_id: metadata.organizationId || 'unknown',
      p_metadata: {
        export_type: exportType,
        tables_exported: metadata.tables || [],
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  } catch (err) {
    console.error('Failed to log export action:', err);
  }
}

function generateSchemaSQL(): string {
  return `-- HumanFirst Data Export Schema
-- Generated: ${new Date().toISOString()}
-- This schema can be imported into a new Supabase project

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'super_admin', 'viewer');
CREATE TYPE public.enforcement_level AS ENUM ('strict', 'soft');
CREATE TYPE public.enforcement_status AS ENUM ('not_connected', 'connected_simulated', 'active');
CREATE TYPE public.plan_type AS ENUM ('pilot', 'standard', 'institution');
CREATE TYPE public.policy_assignment_type AS ENUM ('institution', 'individual');
CREATE TYPE public.policy_status AS ENUM ('active', 'disabled', 'scheduled');
CREATE TYPE public.policy_type AS ENUM ('exam', 'focus', 'custom');

-- =====================================================
-- TABLES
-- =====================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan_type public.plan_type NOT NULL DEFAULT 'pilot',
  max_devices INTEGER NOT NULL DEFAULT 10,
  max_admins INTEGER NOT NULL DEFAULT 2,
  max_students INTEGER NOT NULL DEFAULT 50,
  pilot_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  audit_log_retention_days INTEGER NOT NULL DEFAULT 90,
  tamper_event_retention_days INTEGER NOT NULL DEFAULT 90,
  features_enabled TEXT[] NOT NULL DEFAULT ARRAY['basic_policies', 'tamper_detection'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  device_id TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  ethics_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exam policies table
CREATE TABLE IF NOT EXISTS public.exam_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  policy_type public.policy_type NOT NULL DEFAULT 'exam',
  enforcement_level public.enforcement_level NOT NULL DEFAULT 'strict',
  status public.policy_status NOT NULL DEFAULT 'active',
  assignment_type public.policy_assignment_type NOT NULL DEFAULT 'institution',
  priority INTEGER NOT NULL DEFAULT 10,
  blocked_categories TEXT[] NOT NULL DEFAULT ARRAY['AI Tools', 'Social Media', 'Entertainment'],
  blocked_services TEXT[] NOT NULL DEFAULT '{}',
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policy assignments table
CREATE TABLE IF NOT EXISTS public.policy_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.exam_policies(id),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  notes TEXT
);

-- Blocked URLs table
CREATE TABLE IF NOT EXISTS public.blocked_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.exam_policies(id),
  url TEXT NOT NULL,
  description TEXT,
  enforcement_mode TEXT NOT NULL DEFAULT 'active',
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforcement config table
CREATE TABLE IF NOT EXISTS public.enforcement_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status public.enforcement_status NOT NULL DEFAULT 'not_connected',
  status_message TEXT,
  share_token UUID DEFAULT gen_random_uuid(),
  share_enabled BOOLEAN DEFAULT false,
  pilot_mode BOOLEAN NOT NULL DEFAULT false,
  pilot_mode_enabled_at TIMESTAMPTZ,
  pilot_mode_enabled_by UUID,
  organization_id UUID REFERENCES public.organizations(id),
  last_updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI services table
CREATE TABLE IF NOT EXISTS public.ai_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  domains TEXT[] NOT NULL DEFAULT '{}',
  is_blocked_during_exam BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tamper events table
CREATE TABLE IF NOT EXISTS public.tamper_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  exam_policy_id UUID REFERENCES public.exam_policies(id),
  organization_id UUID REFERENCES public.organizations(id),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs table (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  target_id UUID,
  actor_id UUID,
  organization_id UUID REFERENCES public.organizations(id),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin invitations table
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'admin',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student invitations table
CREATE TABLE IF NOT EXISTS public.student_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Policy assignment logs table
CREATE TABLE IF NOT EXISTS public.policy_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.exam_policies(id),
  action TEXT NOT NULL,
  actor_id UUID NOT NULL,
  target_user_id UUID,
  organization_id UUID REFERENCES public.organizations(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Metrics daily table
CREATE TABLE IF NOT EXISTS public.metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  metric_date DATE NOT NULL,
  policies_total INTEGER NOT NULL DEFAULT 0,
  policies_active INTEGER NOT NULL DEFAULT 0,
  policies_by_type JSONB NOT NULL DEFAULT '{"exam": 0, "focus": 0, "custom": 0}',
  policies_by_enforcement JSONB NOT NULL DEFAULT '{"soft": 0, "strict": 0}',
  events_total INTEGER NOT NULL DEFAULT 0,
  events_resolved INTEGER NOT NULL DEFAULT 0,
  events_unresolved INTEGER NOT NULL DEFAULT 0,
  events_by_type JSONB NOT NULL DEFAULT '{}',
  avg_resolution_minutes NUMERIC,
  sessions_total INTEGER NOT NULL DEFAULT 0,
  sessions_avg_duration_minutes NUMERIC,
  sessions_total_hours NUMERIC NOT NULL DEFAULT 0,
  admin_actions_total INTEGER NOT NULL DEFAULT 0,
  admin_actions_by_type JSONB NOT NULL DEFAULT '{}',
  active_admins_count INTEGER NOT NULL DEFAULT 0,
  compliance_score NUMERIC NOT NULL DEFAULT 0,
  compliance_factors JSONB NOT NULL DEFAULT '{"admin_activity": 0, "policy_coverage": 0, "event_resolution": 0}',
  uptime_percentage NUMERIC NOT NULL DEFAULT 100,
  downtime_minutes INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, metric_date)
);

-- Metrics monthly table
CREATE TABLE IF NOT EXISTS public.metrics_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  metric_year INTEGER NOT NULL,
  metric_month INTEGER NOT NULL,
  avg_policies_total NUMERIC NOT NULL DEFAULT 0,
  avg_policies_active NUMERIC NOT NULL DEFAULT 0,
  policies_created INTEGER NOT NULL DEFAULT 0,
  policies_deleted INTEGER NOT NULL DEFAULT 0,
  total_events INTEGER NOT NULL DEFAULT 0,
  total_resolved INTEGER NOT NULL DEFAULT 0,
  resolution_rate NUMERIC NOT NULL DEFAULT 0,
  avg_resolution_minutes NUMERIC,
  events_by_type JSONB NOT NULL DEFAULT '{}',
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_session_hours NUMERIC NOT NULL DEFAULT 0,
  avg_session_duration_minutes NUMERIC,
  total_admin_actions INTEGER NOT NULL DEFAULT 0,
  unique_active_admins INTEGER NOT NULL DEFAULT 0,
  top_actions JSONB NOT NULL DEFAULT '[]',
  avg_compliance_score NUMERIC NOT NULL DEFAULT 0,
  min_compliance_score NUMERIC,
  max_compliance_score NUMERIC,
  avg_uptime_percentage NUMERIC NOT NULL DEFAULT 100,
  total_downtime_minutes INTEGER NOT NULL DEFAULT 0,
  days_with_data INTEGER NOT NULL DEFAULT 0,
  compliance_trend TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, metric_year, metric_month)
);

-- Rate limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_policies_org_id ON public.exam_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_policy_id ON public.policy_assignments(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_user_id ON public.policy_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_urls_policy_id ON public.blocked_urls(policy_id);
CREATE INDEX IF NOT EXISTS idx_tamper_events_user_id ON public.tamper_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tamper_events_org_id ON public.tamper_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_daily_org_date ON public.metrics_daily(organization_id, metric_date);

-- =====================================================
-- ENABLE RLS (You'll need to create policies)
-- =====================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enforcement_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamper_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_monthly ENABLE ROW LEVEL SECURITY;

-- Note: You'll need to create RLS policies based on your security requirements.
-- See the original project's migrations for reference.
`;
}

function generateReadmeImport(): string {
  return `# HumanFirst Data Import Guide

## Export Contents

This export package contains:

- \`schema.sql\` - Complete database schema with tables, indexes, and RLS setup
- \`data/*.json\` - All table data in JSON format
- \`auth_users.json\` - User account information (for re-inviting users)
- \`storage_objects.json\` - List of storage bucket files (if any)
- \`README_IMPORT.md\` - This file

## Import Steps

### 1. Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned

### 2. Import the Schema

1. Go to SQL Editor in your Supabase dashboard
2. Open \`schema.sql\` from this export
3. Run the SQL to create all tables, indexes, and enable RLS
4. Review and create appropriate RLS policies for your needs

### 3. Import the Data

For each table in the \`data/\` folder, you can import using:

**Option A: SQL Editor (small datasets)**
\`\`\`sql
INSERT INTO public.table_name (column1, column2, ...)
VALUES 
  (value1, value2, ...),
  (value1, value2, ...);
\`\`\`

**Option B: Supabase Dashboard**
1. Go to Table Editor
2. Select the table
3. Use "Insert rows" → "Import from CSV/JSON"

**Option C: Using the Supabase CLI**
\`\`\`bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Use psql to import
psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres" < data_import.sql
\`\`\`

### 4. Re-invite Users

Since password hashes cannot be exported, you'll need to re-invite users:

1. Review \`auth_users.json\` for the list of users
2. For each user, send a password reset email or create new invitations
3. Map the old \`user_id\` to new \`user_id\` if needed (update foreign keys)

**Important:** User IDs will be different in the new project. You may need to:
- Create users with the same emails first
- Update all foreign key references (user_id columns) with the new UUIDs

### 5. Storage Migration (if applicable)

If \`storage_objects.json\` contains files:

1. Create the same storage buckets in your new project
2. Download files from the source URLs (if still accessible)
3. Upload to the new storage buckets
4. Update any URL references in your data

### 6. Update Environment Variables

Update your application's environment variables:

\`\`\`env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_new_anon_key
\`\`\`

### 7. Edge Functions

Edge functions are not included in this export. You'll need to:
1. Copy the \`supabase/functions/\` folder from your original codebase
2. Deploy using: \`supabase functions deploy\`

## Data Order for Import

Import tables in this order to respect foreign key constraints:

1. \`organizations\`
2. \`profiles\`
3. \`user_roles\`
4. \`exam_policies\`
5. \`policy_assignments\`
6. \`blocked_urls\`
7. \`enforcement_config\`
8. \`ai_services\`
9. \`tamper_events\`
10. \`audit_logs\`
11. \`admin_invitations\`
12. \`student_invitations\`
13. \`policy_assignment_logs\`
14. \`metrics_daily\`
15. \`metrics_monthly\`

## Support

For issues with the import process, consult:
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---
Generated by HumanFirst Data Export
Export Date: ${new Date().toISOString()}
`;
}

async function exportTableData(supabase: any, tableName: string, organizationId: string | null): Promise<any[]> {
  console.log(`Exporting table: ${tableName}`);
  
  // Tables that are organization-scoped
  const orgScopedTables = [
    'profiles', 'exam_policies', 'policy_assignments', 'policy_assignment_logs',
    'blocked_urls', 'enforcement_config', 'tamper_events', 'audit_logs',
    'admin_invitations', 'student_invitations', 'metrics_daily', 'metrics_monthly'
  ];
  
  // Tables that are global (not org-scoped)
  const globalTables = ['ai_services', 'rate_limits'];
  
  try {
    let query = supabase.from(tableName).select('*');
    
    // Filter by organization for org-scoped tables
    if (orgScopedTables.includes(tableName) && organizationId) {
      query = query.eq('organization_id', organizationId);
    } else if (tableName === 'organizations' && organizationId) {
      query = query.eq('id', organizationId);
    } else if (tableName === 'user_roles' && organizationId) {
      // Get user_roles for users in the organization
      const { data: profilesInOrg } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('organization_id', organizationId);
      
      if (profilesInOrg && profilesInOrg.length > 0) {
        const userIds = profilesInOrg.map((p: any) => p.user_id);
        query = query.in('user_id', userIds);
      } else {
        return [];
      }
    }
    
    // Handle pagination for large tables
    const allData: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await query.range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error(`Error exporting ${tableName}:`, error);
        return allData;
      }
      
      if (!data || data.length === 0) break;
      
      allData.push(...data);
      
      if (data.length < pageSize) break;
      offset += pageSize;
    }
    
    console.log(`Exported ${allData.length} rows from ${tableName}`);
    return allData;
  } catch (err) {
    console.error(`Failed to export ${tableName}:`, err);
    return [];
  }
}

async function exportAuthUsers(supabase: any, organizationId: string | null): Promise<any[]> {
  console.log('Exporting auth users...');
  
  try {
    // Get profiles for the organization
    let query = supabase.from('profiles').select('user_id, email, full_name, created_at, organization_id');
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: profiles, error: profileError } = await query;
    
    if (profileError || !profiles) {
      console.error('Failed to fetch profiles:', profileError);
      return [];
    }
    
    // Get roles for these users
    const userIds = profiles.map((p: any) => p.user_id);
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);
    
    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
    
    // Combine profile data with roles
    return profiles.map((profile: any) => ({
      user_id: profile.user_id,
      email: profile.email,
      full_name: profile.full_name,
      role: roleMap.get(profile.user_id) || 'unknown',
      organization_id: profile.organization_id,
      created_at: profile.created_at,
      // Note: We cannot export last_sign_in_at or email_confirmed_at without admin access
    }));
  } catch (err) {
    console.error('Failed to export auth users:', err);
    return [];
  }
}

async function exportStorageObjects(supabase: any): Promise<any[]> {
  console.log('Exporting storage objects...');
  
  try {
    // List available buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError || !buckets) {
      console.log('No storage buckets found or access denied');
      return [];
    }
    
    const allObjects: any[] = [];
    
    for (const bucket of buckets) {
      try {
        const { data: objects, error: objectsError } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 1000 });
        
        if (objects && !objectsError) {
          for (const obj of objects) {
            allObjects.push({
              bucket_name: bucket.name,
              path: obj.name,
              size: obj.metadata?.size,
              content_type: obj.metadata?.mimetype,
              created_at: obj.created_at,
              updated_at: obj.updated_at,
            });
          }
        }
      } catch (err) {
        console.error(`Failed to list objects in bucket ${bucket.name}:`, err);
      }
    }
    
    console.log(`Exported ${allObjects.length} storage objects`);
    return allObjects;
  } catch (err) {
    console.error('Failed to export storage:', err);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authResult = await validateAuth(req);
    
    if ('error' in authResult) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only admin and super_admin can export
    if (authResult.role !== 'admin' && authResult.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required for data export.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS for full data export
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const canProceed = await checkRateLimit(supabase, authResult.userId);
    if (!canProceed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait 10 minutes between exports.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting data export for user ${authResult.userId}, org ${authResult.organizationId}`);

    // Export all data
    const exportData: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      exportedBy: authResult.email,
      organizationId: authResult.organizationId,
      schema: generateSchemaSQL(),
      readme: generateReadmeImport(),
      tables: {},
      authUsers: [],
      storageObjects: [],
    };

    // Export each table
    for (const tableName of EXPORT_TABLES) {
      exportData.tables[tableName] = await exportTableData(supabase, tableName, authResult.organizationId);
    }

    // Export auth users
    exportData.authUsers = await exportAuthUsers(supabase, authResult.organizationId);

    // Export storage objects
    exportData.storageObjects = await exportStorageObjects(supabase);

    // Log the export action
    await logExportAction(supabase, authResult.userId, 'full_export', {
      organizationId: authResult.organizationId,
      tables: EXPORT_TABLES,
      tableRowCounts: Object.fromEntries(
        Object.entries(exportData.tables).map(([k, v]) => [k, (v as any[]).length])
      ),
      authUsersCount: exportData.authUsers.length,
      storageObjectsCount: exportData.storageObjects.length,
    });

    console.log('Export completed successfully');

    return new Response(
      JSON.stringify(exportData),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );
  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error during export' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
