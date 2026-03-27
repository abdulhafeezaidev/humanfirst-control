



import { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Policy, PolicyAssignment, PolicyFormData, PolicyAssignmentLog, PolicyType, EnforcementLevel, AssignmentType, PolicyStatus } from '@/types/policy';
import { POLICY_PRIORITY } from '@/types/policy';

export function usePolicies() {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('exam_policies')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      toast({ title: 'Error loading policies', description: fetchError.message, variant: 'destructive' });
    } else {
      // Map the data to our Policy type, handling the new columns
      const mappedPolicies: Policy[] = (data || []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        policy_type: (p.policy_type as PolicyType) || 'exam',
        enforcement_level: (p.enforcement_level as EnforcementLevel) || 'strict',
        status: (p.status as PolicyStatus) || 'active',
        assignment_type: (p.assignment_type as AssignmentType) || 'institution',
        start_time: p.start_time,
        end_time: p.end_time,
        blocked_categories: p.blocked_categories || [],
        blocked_services: p.blocked_services || [],
        priority: p.priority || POLICY_PRIORITY.exam,
        is_active: p.is_active,
        organization_id: p.organization_id,
        created_by: p.created_by,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));
      setPolicies(mappedPolicies);
    }
    
    setLoading(false);
  }, [organization?.id, toast]);

  const createPolicy = useCallback(async (data: PolicyFormData): Promise<Policy | null> => {
    if (!user?.id || !organization?.id) return null;

    const priority = POLICY_PRIORITY[data.policy_type];

    // datetime-local gives local time strings like "2026-03-02T13:18"
    // Convert to proper ISO with timezone so Supabase stores the correct UTC equivalent
    const startTimeISO = new Date(data.start_time).toISOString();
    const endTimeISO = new Date(data.end_time).toISOString();
    
    const { data: newPolicy, error: createError } = await supabase
      .from('exam_policies')
      .insert({
        title: data.title,
        description: data.description || null,
        policy_type: data.policy_type,
        enforcement_level: data.enforcement_level,
        status: 'active',
        assignment_type: data.assignment_type,
        start_time: startTimeISO,
        end_time: endTimeISO,
        blocked_categories: data.blocked_categories,
        blocked_services: data.blocked_services,
        priority,
        is_active: true,
        organization_id: organization.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      toast({ title: 'Error creating policy', description: createError.message, variant: 'destructive' });
      return null;
    }

    // Log the creation (non-blocking – don't let audit log failure affect policy creation)
    try {
      await supabase.rpc('log_policy_assignment', {
        p_policy_id: newPolicy.id,
        p_action: 'created',
        p_actor_id: user.id,
        p_metadata: { title: data.title, policy_type: data.policy_type }
      });
    } catch (logError) {
      console.warn('Failed to log policy creation:', logError);
    }

    toast({ title: 'Policy created', description: `"${data.title}" has been created successfully.` });
    await fetchPolicies();
    
    return newPolicy as unknown as Policy;
  }, [user?.id, organization?.id, toast, fetchPolicies]);

  const updatePolicy = useCallback(async (id: string, data: Partial<PolicyFormData>): Promise<boolean> => {
    if (!user?.id) return false;

    const updateData: Record<string, unknown> = { ...data };
    if (data.policy_type) {
      updateData.priority = POLICY_PRIORITY[data.policy_type];
    }
    // Convert local datetime-local values to proper ISO strings
    if (data.start_time) {
      updateData.start_time = new Date(data.start_time).toISOString();
    }
    if (data.end_time) {
      updateData.end_time = new Date(data.end_time).toISOString();
    }

    const { error: updateError } = await supabase
      .from('exam_policies')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      toast({ title: 'Error updating policy', description: updateError.message, variant: 'destructive' });
      return false;
    }

    // Log the update (non-blocking)
    try {
      await supabase.rpc('log_policy_assignment', {
        p_policy_id: id,
        p_action: 'updated',
        p_actor_id: user.id,
        p_metadata: data
      });
    } catch (logError) {
      console.warn('Failed to log policy update:', logError);
    }

    toast({ title: 'Policy updated' });
    await fetchPolicies();
    return true;
  }, [user?.id, toast, fetchPolicies]);

  const deletePolicy = useCallback(async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    const policy = policies.find(p => p.id === id);
    
    // Log before delete (non-blocking)
    try {
      await supabase.rpc('log_policy_assignment', {
        p_policy_id: id,
        p_action: 'deleted',
        p_actor_id: user.id,
        p_metadata: { title: policy?.title }
      });
    } catch (logError) {
      console.warn('Failed to log policy deletion:', logError);
    }

    const { error: deleteError } = await supabase
      .from('exam_policies')
      .delete()
      .eq('id', id);

    if (deleteError) {
      toast({ title: 'Error deleting policy', description: deleteError.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'Policy deleted' });
    await fetchPolicies();
    return true;
  }, [user?.id, policies, toast, fetchPolicies]);

  const togglePolicyActive = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    if (!user?.id) return false;

    const { error: updateError } = await supabase
      .from('exam_policies')
      .update({ is_active: isActive, status: isActive ? 'active' : 'disabled' })
      .eq('id', id);

    if (updateError) {
      toast({ title: 'Error updating policy', description: updateError.message, variant: 'destructive' });
      return false;
    }

    toast({ title: isActive ? 'Policy activated' : 'Policy deactivated' });
    await fetchPolicies();
    return true;
  }, [user?.id, toast, fetchPolicies]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchPolicies();

    const channel = supabase
      .channel('policies-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_policies' }, fetchPolicies)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPolicies]);

  return {
    policies,
    loading,
    error,
    fetchPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
    togglePolicyActive,
  };
}

export function usePolicyAssignments(policyId?: string) {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<PolicyAssignment[]>([]);
  const [logs, setLogs] = useState<PolicyAssignmentLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    if (!policyId) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('policy_assignments')
      .select('*')
      .eq('policy_id', policyId)
      .is('revoked_at', null);

    if (error) {
      toast({ title: 'Error loading assignments', variant: 'destructive' });
    } else {
      setAssignments(data || []);
    }
    setLoading(false);
  }, [policyId, toast]);

  const fetchLogs = useCallback(async () => {
    if (!policyId) {
      setLogs([]);
      return;
    }

    const { data, error } = await supabase
      .from('policy_assignment_logs')
      .select('*')
      .eq('policy_id', policyId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data as unknown as PolicyAssignmentLog[]);
    }
  }, [policyId]);

  const assignStudent = useCallback(async (userId: string, notes?: string): Promise<boolean> => {
    if (!policyId || !user?.id || !organization?.id) return false;

    const { error } = await supabase
      .from('policy_assignments')
      .insert({
        policy_id: policyId,
        user_id: userId,
        organization_id: organization.id,
        assigned_by: user.id,
        notes,
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Student already assigned', variant: 'destructive' });
      } else {
        toast({ title: 'Error assigning student', description: error.message, variant: 'destructive' });
      }
      return false;
    }

    // Log assignment (non-blocking)
    try {
      await supabase.rpc('log_policy_assignment', {
        p_policy_id: policyId,
        p_action: 'assigned',
        p_actor_id: user.id,
        p_target_user_id: userId,
      });
    } catch (logError) {
      console.warn('Failed to log policy assignment:', logError);
    }

    toast({ title: 'Student assigned to policy' });
    await fetchAssignments();
    await fetchLogs();
    return true;
  }, [policyId, user?.id, organization?.id, toast, fetchAssignments, fetchLogs]);

  const revokeAssignment = useCallback(async (assignmentId: string, userId: string): Promise<boolean> => {
    if (!policyId || !user?.id) return false;

    const { error } = await supabase
      .from('policy_assignments')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', assignmentId);

    if (error) {
      toast({ title: 'Error revoking assignment', variant: 'destructive' });
      return false;
    }

    // Log revocation (non-blocking)
    try {
      await supabase.rpc('log_policy_assignment', {
        p_policy_id: policyId,
        p_action: 'revoked',
        p_actor_id: user.id,
        p_target_user_id: userId,
      });
    } catch (logError) {
      console.warn('Failed to log policy revocation:', logError);
    }

    toast({ title: 'Assignment revoked' });
    await fetchAssignments();
    await fetchLogs();
    return true;
  }, [policyId, user?.id, toast, fetchAssignments, fetchLogs]);

  useEffect(() => {
    fetchAssignments();
    fetchLogs();
  }, [fetchAssignments, fetchLogs]);

  return {
    assignments,
    logs,
    loading,
    assignStudent,
    revokeAssignment,
    fetchAssignments,
    fetchLogs,
  };
}
