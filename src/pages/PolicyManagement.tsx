import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Shield, Filter, AlertTriangle, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/layouts/DashboardLayout';
import { PolicyList, PolicyForm, PolicyAssignmentsDialog, BlockedUrlsDialog } from '@/components/policy';
import { usePolicies } from '@/hooks/usePolicies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Policy, PolicyFormData, PolicyType, AssignmentType } from '@/types/policy';

type FilterType = 'all' | PolicyType;
type FilterAssignment = 'all' | AssignmentType;

const PolicyManagement: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { policies, loading, createPolicy, updatePolicy, deletePolicy, togglePolicyActive } = usePolicies();

  // UI State
  const [formOpen, setFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deleteConfirmPolicy, setDeleteConfirmPolicy] = useState<Policy | null>(null);
  const [assignmentsPolicy, setAssignmentsPolicy] = useState<Policy | null>(null);
  const [blockedUrlsPolicy, setBlockedUrlsPolicy] = useState<Policy | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<FilterAssignment>('all');

  // Redirect if not admin
  React.useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [authLoading, user, isAdmin, navigate]);

  // Filtered policies
  const filteredPolicies = useMemo(() => {
    return policies.filter(policy => {
      // Search filter
      if (searchQuery && !policy.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !policy.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'all' && policy.policy_type !== typeFilter) {
        return false;
      }
      // Assignment filter
      if (assignmentFilter !== 'all' && policy.assignment_type !== assignmentFilter) {
        return false;
      }
      return true;
    });
  }, [policies, searchQuery, typeFilter, assignmentFilter]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const active = policies.filter(p => 
      p.is_active && 
      new Date(p.start_time) <= now && 
      new Date(p.end_time) >= now
    ).length;
    const scheduled = policies.filter(p => 
      p.is_active && 
      new Date(p.start_time) > now
    ).length;
    const examCount = policies.filter(p => p.policy_type === 'exam').length;
    const focusCount = policies.filter(p => p.policy_type === 'focus').length;

    return { active, scheduled, examCount, focusCount, total: policies.length };
  }, [policies]);

  // Handlers
  const handleCreate = () => {
    setEditingPolicy(null);
    setFormOpen(true);
  };

  const handleEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: PolicyFormData) => {
    setFormLoading(true);
    if (editingPolicy) {
      await updatePolicy(editingPolicy.id, data);
    } else {
      await createPolicy(data);
    }
    setFormLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmPolicy) {
      await deletePolicy(deleteConfirmPolicy.id);
      setDeleteConfirmPolicy(null);
    }
  };

  const handleToggleActive = async (policy: Policy) => {
    await togglePolicyActive(policy.id, !policy.is_active);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-soft text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Policy Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage exam and focus policies for your institution
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Policy
          </Button>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-amber-600">{stats.scheduled}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Exam Policies</p>
                <p className="text-2xl font-bold">{stats.examCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Focus Policies</p>
                <p className="text-2xl font-bold">{stats.focusCount}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conflict Resolution Notice */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Conflict Resolution: Exam &gt; Focus
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                When policies overlap, Exam policies always take priority over Focus policies. 
                No debate, no edge cases.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="focus">Focus</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={assignmentFilter} onValueChange={(v) => setAssignmentFilter(v as FilterAssignment)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignments</SelectItem>
                    <SelectItem value="institution">Institution-wide</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <>
                {filteredPolicies.length !== policies.length && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Showing {filteredPolicies.length} of {policies.length} policies
                  </p>
                )}
                <PolicyList
                  policies={filteredPolicies}
                  onEdit={handleEdit}
                  onDelete={(policy) => setDeleteConfirmPolicy(policy)}
                  onToggleActive={handleToggleActive}
                  onViewAssignments={(policy) => setAssignmentsPolicy(policy)}
                  onManageBlockedUrls={(policy) => setBlockedUrlsPolicy(policy)}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Policy Form Dialog */}
      <PolicyForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        policy={editingPolicy}
        isLoading={formLoading}
      />

      {/* Assignments Dialog */}
      <PolicyAssignmentsDialog
        open={!!assignmentsPolicy}
        onOpenChange={(open) => !open && setAssignmentsPolicy(null)}
        policy={assignmentsPolicy}
      />

      {/* Blocked URLs Dialog */}
      <BlockedUrlsDialog
        open={!!blockedUrlsPolicy}
        onOpenChange={(open) => !open && setBlockedUrlsPolicy(null)}
        policy={blockedUrlsPolicy}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmPolicy} onOpenChange={() => setDeleteConfirmPolicy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmPolicy?.title}"? 
              This action cannot be undone and will remove all student assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default PolicyManagement;
