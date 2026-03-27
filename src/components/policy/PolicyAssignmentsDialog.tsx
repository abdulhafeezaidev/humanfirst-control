import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Users, UserPlus, UserMinus, History, Search, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePolicyAssignments } from '@/hooks/usePolicies';
import type { Policy } from '@/types/policy';

interface Student {
  user_id: string;
  full_name: string;
  email: string;
}

interface PolicyAssignmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: Policy | null;
}

const PolicyAssignmentsDialog: React.FC<PolicyAssignmentsDialogProps> = ({
  open,
  onOpenChange,
  policy,
}) => {
  const { assignments, logs, loading, assignStudent, revokeAssignment } = usePolicyAssignments(policy?.id);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);

  // Fetch students for assignment
  useEffect(() => {
    const fetchStudents = async () => {
      if (!policy || policy.assignment_type === 'institution') return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      if (roles && roles.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', roles.map(r => r.user_id));

        if (profiles) {
          setStudents(profiles);
        }
      }
    };

    if (open) {
      fetchStudents();
    }
  }, [open, policy]);

  const handleAssign = async (userId: string) => {
    setAssigning(userId);
    await assignStudent(userId);
    setAssigning(null);
  };

  const handleRevoke = async (assignmentId: string, userId: string) => {
    await revokeAssignment(assignmentId, userId);
  };

  const filteredStudents = students.filter(s =>
    !assignments.some(a => a.user_id === s.user_id) &&
    (s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getActionLabel = (action: string) => {
    const labels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      assigned: { label: 'Assigned', variant: 'default' },
      revoked: { label: 'Revoked', variant: 'destructive' },
      created: { label: 'Created', variant: 'secondary' },
      updated: { label: 'Updated', variant: 'outline' },
      deleted: { label: 'Deleted', variant: 'destructive' },
    };
    return labels[action] || { label: action, variant: 'outline' as const };
  };

  if (!policy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Policy Assignments
          </DialogTitle>
          <DialogDescription>
            Manage student assignments for "{policy.title}"
          </DialogDescription>
        </DialogHeader>

        {policy.assignment_type === 'institution' ? (
          <div className="py-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-primary/50" />
            <h3 className="text-lg font-medium mb-2">Institution-Wide Policy</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              This policy applies to all students in your institution automatically. 
              No individual assignments needed.
            </p>
            <Badge className="mt-4" variant="secondary">
              All students affected
            </Badge>
          </div>
        ) : (
          <Tabs defaultValue="assigned" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="assigned" className="gap-2">
                <Users className="w-4 h-4" />
                Assigned ({assignments.length})
              </TabsTrigger>
              <TabsTrigger value="add" className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Students
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <History className="w-4 h-4" />
                Activity Log
              </TabsTrigger>
            </TabsList>

            {/* Currently Assigned */}
            <TabsContent value="assigned">
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : assignments.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No students assigned yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => {
                        const student = students.find(s => s.user_id === assignment.user_id);
                        return (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{student?.full_name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{student?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(assignment.assigned_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevoke(assignment.id, assignment.user_id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <UserMinus className="w-4 h-4 mr-1" />
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Add Students */}
            <TabsContent value="add">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[350px]">
                  {filteredStudents.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      {searchQuery ? 'No matching students found' : 'All students are already assigned'}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow key={student.user_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{student.full_name}</p>
                                <p className="text-sm text-muted-foreground">{student.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleAssign(student.user_id)}
                                disabled={assigning === student.user_id}
                              >
                                <UserPlus className="w-4 h-4 mr-1" />
                                {assigning === student.user_id ? 'Assigning...' : 'Assign'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Activity Log */}
            <TabsContent value="logs">
              <ScrollArea className="h-[400px]">
                {logs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No activity logged yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => {
                      const { label, variant } = getActionLabel(log.action);
                      return (
                        <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant={variant}>{label}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {log.target_user_id ? 'Student assignment' : 'Policy update'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PolicyAssignmentsDialog;
