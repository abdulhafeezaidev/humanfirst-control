import { describe, it, expect, vi } from 'vitest';
import { 
  comparePolicies, 
  sortPoliciesByPriority, 
  filterActivePolicies, 
  getEnforcedPolicy,
  getEffectivePolicyForUser,
  getActivePolicy
} from './policyEngine';
import { Policy, PolicyType } from '@/types/policy';

// Mock supabase client
import { setMockQueryResponse, mockSupabase } from '../test/mocks/supabase';

describe('Policy Engine', () => {
  const mockBasePolicy: Partial<Policy> = {
    id: '1',
    title: 'Test Policy',
    status: 'active',
    is_active: true,
  };

  describe('comparePolicies', () => {
    it('prioritizes exam over focus', () => {
      const examPolicy = { ...mockBasePolicy, policy_type: 'exam' as PolicyType, priority: 100, start_time: '2024-01-01', created_at: '2024-01-01' } as Policy;
      const focusPolicy = { ...mockBasePolicy, policy_type: 'focus' as PolicyType, priority: 100, start_time: '2024-01-01', created_at: '2024-01-01' } as Policy;
      
      expect(comparePolicies(examPolicy, focusPolicy)).toBeLessThan(0); // exam wins (negative = a before b)
    });

    it('prioritizes higher explicit priority when types are equal', () => {
      const highPrio = { ...mockBasePolicy, policy_type: 'exam' as PolicyType, priority: 100, start_time: '2024-01-01', created_at: '2024-01-01' } as Policy;
      const lowPrio = { ...mockBasePolicy, policy_type: 'exam' as PolicyType, priority: 50, start_time: '2024-01-01', created_at: '2024-01-01' } as Policy;
      
      expect(comparePolicies(highPrio, lowPrio)).toBeLessThan(0);
    });

    it('prioritizes newer start time when type and priority are equal', () => {
      const newStart = { ...mockBasePolicy, policy_type: 'exam' as PolicyType, priority: 100, start_time: '2024-01-02T10:00:00Z', created_at: '2024-01-01' } as Policy;
      const oldStart = { ...mockBasePolicy, policy_type: 'exam' as PolicyType, priority: 100, start_time: '2024-01-01T10:00:00Z', created_at: '2024-01-01' } as Policy;
      
      expect(comparePolicies(newStart, oldStart)).toBeLessThan(0);
    });
  });

  describe('filterActivePolicies', () => {
    it('filters out inactive policies', () => {
      const active = { ...mockBasePolicy, is_active: true, status: 'active', start_time: '2024-01-01T00:00:00Z', end_time: '2024-12-31T23:59:59Z' } as Policy;
      const inactive = { ...mockBasePolicy, is_active: false, status: 'disabled', start_time: '2024-01-01T00:00:00Z', end_time: '2024-12-31T23:59:59Z' } as Policy;
      
      const result = filterActivePolicies([active, inactive], new Date('2024-06-01T12:00:00Z'));
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(active);
    });

    it('filters out policies outside time window', () => {
      const active = { ...mockBasePolicy, is_active: true, status: 'active', start_time: '2024-01-01T00:00:00Z', end_time: '2024-12-31T23:59:59Z' } as Policy;
      
      const result = filterActivePolicies([active], new Date('2025-06-01T12:00:00Z'));
      expect(result).toHaveLength(0);
    });
  });

  describe('getEnforcedPolicy', () => {
    it('returns null if no policies provided', () => {
      expect(getEnforcedPolicy([])).toBeNull();
    });

    it('returns highest priority active policy', () => {
      const examPolicy = { ...mockBasePolicy, id: 'exam', policy_type: 'exam' as PolicyType, priority: 100, start_time: '2024-01-01T00:00:00Z', end_time: '2024-12-31T23:59:59Z' } as Policy;
      const focusPolicy = { ...mockBasePolicy, id: 'focus', policy_type: 'focus' as PolicyType, priority: 50, start_time: '2024-01-01T00:00:00Z', end_time: '2024-12-31T23:59:59Z' } as Policy;
      
      const result = getEnforcedPolicy([examPolicy, focusPolicy], new Date('2024-06-01T12:00:00Z'));
      expect(result?.id).toBe('exam');
    });
  });

  describe('RPC integrations', () => {
    it('getEffectivePolicyForUser returns policy when found', async () => {
      const mockPolicy = { policy_id: '1', policy_name: 'Test' };
      mockSupabase.rpc.mockResolvedValueOnce({ data: [mockPolicy], error: null });
      
      const result = await getEffectivePolicyForUser('user-1');
      expect(result).toEqual(mockPolicy);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_effective_policy_for_user', { p_user_id: 'user-1' });
    });

    it('getEffectivePolicyForUser returns null when not found', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });
      
      const result = await getEffectivePolicyForUser('user-1');
      expect(result).toBeNull();
    });
  });
});
