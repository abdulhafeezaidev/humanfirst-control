import React from 'react';
import { Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BlockedUrlsManager } from './BlockedUrlsManager';
import type { Policy } from '@/types/policy';

interface BlockedUrlsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy | null;
}

export const BlockedUrlsDialog: React.FC<BlockedUrlsDialogProps> = ({
  open,
  onOpenChange,
  policy,
}) => {
  if (!policy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Blocked URLs: {policy.title}
          </DialogTitle>
          <DialogDescription>
            Add or remove websites that should be blocked during this policy.
          </DialogDescription>
        </DialogHeader>

        <BlockedUrlsManager
          policyId={policy.id}
          organizationId={policy.organization_id || ''}
        />
      </DialogContent>
    </Dialog>
  );
};
