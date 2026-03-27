import { useState } from 'react';
import { Clock, Database, Save, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RetentionSettingsCardProps {
  organizationId: string;
  auditLogRetentionDays: number;
  tamperEventRetentionDays: number;
  canEdit: boolean;
  onUpdate: () => void;
}

const RETENTION_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days (default)' },
  { value: '180', label: '180 days' },
  { value: '365', label: '1 year' },
];

const RetentionSettingsCard = ({
  organizationId,
  auditLogRetentionDays,
  tamperEventRetentionDays,
  canEdit,
  onUpdate,
}: RetentionSettingsCardProps) => {
  const { toast } = useToast();
  const [auditDays, setAuditDays] = useState(auditLogRetentionDays.toString());
  const [tamperDays, setTamperDays] = useState(tamperEventRetentionDays.toString());
  const [saving, setSaving] = useState(false);

  const hasChanges = 
    auditDays !== auditLogRetentionDays.toString() || 
    tamperDays !== tamperEventRetentionDays.toString();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          audit_log_retention_days: parseInt(auditDays),
          tamper_event_retention_days: parseInt(tamperDays),
        })
        .eq('id', organizationId);

      if (error) throw error;

      toast({
        title: 'Retention settings updated',
        description: 'Data older than the retention period will be automatically deleted.',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: error instanceof Error ? error.message : 'Failed to update retention settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">Data Retention & Privacy</h3>
          <p className="text-sm text-muted-foreground">
            Configure how long audit logs and tamper events are retained. Data older than the retention period is automatically deleted daily.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Audit Logs Retention */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium text-foreground">Audit Logs Retention</label>
          </div>
          <Select value={auditDays} onValueChange={setAuditDays} disabled={!canEdit}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select retention period" />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Policy changes, configuration updates, and admin actions.
          </p>
        </div>

        {/* Tamper Events Retention */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium text-foreground">Tamper Events Retention</label>
          </div>
          <Select value={tamperDays} onValueChange={setTamperDays} disabled={!canEdit}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select retention period" />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Focus loss events, connectivity issues, and integrity alerts.
          </p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Privacy Notice:</strong> HumanFirst does not collect or store any user-generated content. 
          Only metadata about policy enforcement and integrity events is retained.
        </p>
      </div>

      {/* Save Button */}
      {canEdit && hasChanges && (
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}

      {!canEdit && (
        <div className="mt-6">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            Only Super Admins can modify retention settings
          </span>
        </div>
      )}
    </div>
  );
};

export default RetentionSettingsCard;
