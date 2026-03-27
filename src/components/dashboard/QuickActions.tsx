import { Plus, UserPlus, GraduationCap, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickActionsProps {
  role: 'super_admin' | 'admin' | 'viewer' | 'student' | null;
  onCreatePolicy: () => void;
  onInviteAdmin: () => void;
  onAddStudent: () => void;
  onViewTransparency: () => void;
  onOpenSettings?: () => void;
}

export const QuickActions = ({
  role,
  onCreatePolicy,
  onInviteAdmin,
  onAddStudent,
  onViewTransparency,
  onOpenSettings,
}: QuickActionsProps) => {
  const isOwner = role === 'super_admin';
  const canManage = role === 'super_admin' || role === 'admin';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {canManage && (
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={onCreatePolicy}
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">New Policy</span>
          </Button>
        )}
        
        {canManage && (
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={onAddStudent}
          >
            <GraduationCap className="w-5 h-5" />
            <span className="text-xs">Add Student</span>
          </Button>
        )}
        
        {isOwner && (
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={onInviteAdmin}
          >
            <UserPlus className="w-5 h-5" />
            <span className="text-xs">Invite Admin</span>
          </Button>
        )}
        
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={onViewTransparency}
        >
          <FileText className="w-5 h-5" />
          <span className="text-xs">Transparency</span>
        </Button>
        
        {isOwner && onOpenSettings && (
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={onOpenSettings}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Settings</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickActions;
