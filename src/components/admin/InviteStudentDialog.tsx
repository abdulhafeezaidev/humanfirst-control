/**
 * Invite Student Dialog
 * 
 * Allows admins to invite students to their organization via email.
 * Creates a student invitation that generates a signup link.
 */

import { useState } from 'react';
import { GraduationCap, Copy, Check, Mail, AlertCircle } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').max(255, 'Email too long'),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
});

interface InviteStudentDialogProps {
  onStudentAdded?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const InviteStudentDialog = ({ onStudentAdded, open: controlledOpen, onOpenChange }: InviteStudentDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user, organization, role } = useAuth();
  const { toast } = useToast();

  // Only admins and super_admins can invite students
  const canInvite = role === 'super_admin' || role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const result = inviteSchema.safeParse({ email, fullName });
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

      if (!canInvite) {
        toast({
          title: "Permission Denied",
          description: "Only admins can invite students",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Create student invitation using dedicated student_invitations table
      const { data, error } = await supabase
        .from('student_invitations')
        .insert({
          email: result.data.email,
          full_name: result.data.fullName,
          organization_id: organization.id,
          invited_by: user?.id,
        })
        .select('token')
        .single();

      if (error) {
        // Check for duplicate email
        if (error.code === '23505') {
          toast({
            title: "Invitation Already Exists",
            description: "An invitation for this email already exists",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Failed to create invitation",
            description: error.message,
            variant: "destructive",
          });
        }
        setIsSubmitting(false);
        return;
      }

      // Generate invite link with student-specific signup path
      const link = `${window.location.origin}/student/signup?token=${data.token}&name=${encodeURIComponent(result.data.fullName)}`;
      setInviteLink(link);

      toast({
        title: "Invitation Created",
        description: `Student invitation created for ${email}`,
      });

      onStudentAdded?.();
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
    setFullName('');
    setInviteLink(null);
    setErrors({});
  };

  if (!canInvite) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GraduationCap className="w-4 h-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Add Student
          </DialogTitle>
          <DialogDescription>
            Invite a student to join {organization?.name || 'your organization'}.
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
                Share this link with the student. It expires in 7 days.
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                The student will need to complete their registration using this link to join your organization.
              </AlertDescription>
            </Alert>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Student Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                maxLength={100}
              />
              {errors.fullName && (
                <p className="text-destructive text-sm">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentEmail">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="studentEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@institution.edu"
                  className="pl-10"
                  maxLength={255}
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email}</p>
              )}
            </div>

            <Alert variant="default" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Students will be subject to institution policies and can view their own transparency data.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Creating...' : 'Create Invitation'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteStudentDialog;
