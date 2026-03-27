import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Building2, Shield, Database } from 'lucide-react';
import RetentionSettingsCard from '@/components/RetentionSettingsCard';
import { useToast } from '@/hooks/use-toast';

const SettingsPage = () => {
  const { user, role, loading: authLoading, organization, refreshOrganization } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && (!user || role !== 'super_admin')) navigate('/admin');
  }, [user, role, authLoading, navigate]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" /> Settings
          </h1>
          <p className="text-muted-foreground">Organization and system settings</p>
        </div>

        {!organization ? (
          <Skeleton className="h-60" />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{organization.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">{organization.slug}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <Badge variant="secondary">{organization.plan_type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={organization.is_active ? 'default' : 'destructive'}>
                    {organization.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Devices</span>
                  <span>{organization.max_devices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Students</span>
                  <span>{organization.max_students}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Admins</span>
                  <span>{organization.max_admins}</span>
                </div>
              </CardContent>
            </Card>

            <RetentionSettingsCard
              organizationId={organization.id}
              auditLogRetentionDays={organization.audit_log_retention_days}
              tamperEventRetentionDays={organization.tamper_event_retention_days}
              canEdit={role === 'super_admin'}
              onUpdate={() => refreshOrganization()}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {organization.features_enabled?.length > 0 ? (
                    organization.features_enabled.map((f: string) => (
                      <Badge key={f} variant="outline">{f}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No features configured</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
