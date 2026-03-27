import { useState } from 'react';
import { UserPlus, Copy, Check, Mail, Shield, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { getAssignableRoles, ROLE_LABELS, ROLE_DESCRIPTIONS, type AppRole } from '@/lib/adminHierarchy';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  role: z.enum(['admin', 'viewer', 'super_admin']),
});

interface InviteAdminDialogProps {
  onInviteSent?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const InviteAdminDialog = ({ onInviteSent, open: controlledOpen, onOpenChange }: InviteAdminDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer' | 'super_admin'>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user, organization, role: userRole } = useAuth();
  const { toast } = useToast();

  // Get assignable roles based on current user's role - enforced server-side
  const assignableRoles = getAssignableRoles(userRole);
  const canInviteSuperAdmin = userRole === 'super_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const result = inviteSchema.safeParse({ email, role });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        setIsSubmitting(false);
        return;
      }

      if (!organization?.id) {
        toast({
          title: "Error",
          description: "No organization found",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Check if user can invite this role
      if (role === 'super_admin' && !canInviteSuperAdmin) {
        toast({
          title: "Permission Denied",
          description: "Only super admins can invite other super admins",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Create the invitation
      const { data, error } = await supabase
        .from('admin_invitations')
        .insert({
          email,
          role,
          organization_id: organization.id,
          invited_by: user?.id,
        })
        .select('token')
        .single();

      if (error) {
        toast({
          title: "Failed to create invitation",
          description: error.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Generate invite link
      const link = `${window.location.origin}/admin/signup?token=${data.token}`;
      setInviteLink(link);

      toast({
        title: "Invitation Created",
        description: `Invitation sent to ${email}`,
      });

      onInviteSent?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEmail('');
    setRole('admin');
    setInviteLink(null);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Invite Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Administrator</DialogTitle>
          <DialogDescription>
            Send an invitation to join {organization?.name || 'your organization'} as an admin.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
              <Check className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Invitation created for {email}</span>
            </div>
            
            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={inviteLink} 
                  readOnly 
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with {email}. It expires in 7 days.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@institution.edu"
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-2">
                        {r === 'super_admin' && <Shield className="w-3 h-3 text-primary" />}
                        <span>{ROLE_LABELS[r]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {role && (
                <p className="text-xs text-muted-foreground">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              )}
              {role === 'super_admin' && (
                <Alert variant="default" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Super Admins have full control including the ability to manage other admins.
                  </AlertDescription>
                </Alert>
              )}
              {errors.role && (
                <p className="text-destructive text-sm">{errors.role}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteAdminDialog;
