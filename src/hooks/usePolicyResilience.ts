/**
 * Policy Resilience Hook
 * 
 * Manages policy caching, integrity validation, auto-reapply after reboot,
 * and grace periods for tamper detection.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CachedPolicy,
  GracePeriodConfig,
  syncPoliciesWithCache,
  loadCachedPolicies,
  cachePolicies,
  detectRebootAndReapply,
  loadGraceConfig,
  saveEnforcementState,
  loadEnforcementState,
  getCacheMetadata,
  isCacheStale,
  DEFAULT_GRACE_PERIODS,
} from '@/lib/policyCache';
import { supabase } from '@/integrations/supabase/client';

export interface PolicyResilienceState {
  policies: CachedPolicy[];
  activePolicyId: string | null;
  source: 'server' | 'cache' | 'pending';
  cacheValid: boolean;
  isEnforcing: boolean;
  inGracePeriod: boolean;
  lastSyncAt: number | null;
  syncError: string | null;
  rebootDetected: boolean;
  integrityStatus: 'valid' | 'stale' | 'invalid' | 'unknown';
}

export interface GracePeriodState {
  config: GracePeriodConfig;
  visibilityGraceActive: boolean;
  connectivityGraceActive: boolean;
  rebootGraceActive: boolean;
  graceExpiresAt: number | null;
}

interface UsePolicyResilienceOptions {
  organizationId: string | null;
  userId: string | null;
  autoSync?: boolean;
  syncIntervalMs?: number;
}

export function usePolicyResilience({
  organizationId,
  userId,
  autoSync = true,
  syncIntervalMs = 60000, // 1 minute default
}: UsePolicyResilienceOptions) {
  const [state, setState] = useState<PolicyResilienceState>({
    policies: [],
    activePolicyId: null,
    source: 'pending',
    cacheValid: false,
    isEnforcing: false,
    inGracePeriod: false,
    lastSyncAt: null,
    syncError: null,
    rebootDetected: false,
    integrityStatus: 'unknown',
  });

  const [graceState, setGraceState] = useState<GracePeriodState>({
    config: DEFAULT_GRACE_PERIODS,
    visibilityGraceActive: false,
    connectivityGraceActive: false,
    rebootGraceActive: false,
    graceExpiresAt: null,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const graceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Determine active policy from current time
  const getActivePolicy = useCallback((policies: CachedPolicy[]): CachedPolicy | null => {
    const now = new Date();
    return policies.find(p => {
      const start = new Date(p.start_time);
      const end = new Date(p.end_time);
      return p.is_active && now >= start && now <= end;
    }) || null;
  }, []);

  // Sync policies from server with cache fallback
  const syncPolicies = useCallback(async () => {
    try {
      const result = await syncPoliciesWithCache(organizationId);
      const activePolicy = getActivePolicy(result.policies);

      setState(prev => ({
        ...prev,
        policies: result.policies,
        activePolicyId: activePolicy?.id || null,
        source: result.source,
        cacheValid: result.cacheValid,
        lastSyncAt: Date.now(),
        syncError: null,
        integrityStatus: result.cacheValid ? 'valid' : (result.source === 'cache' ? 'stale' : 'valid'),
      }));

      // Update enforcement state
      if (activePolicy) {
        saveEnforcementState({
          is_enforcing: true,
          last_enforced_at: Date.now(),
          policy_id: activePolicy.id,
        });
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Sync failed';
      setState(prev => ({
        ...prev,
        syncError: error,
      }));
      throw err;
    }
  }, [organizationId, getActivePolicy]);

  // Initialize on mount - detect reboot and load cache
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initialize = async () => {
      // Load grace config
      const graceConfig = loadGraceConfig();
      setGraceState(prev => ({ ...prev, config: graceConfig }));

      // Detect reboot
      const rebootInfo = detectRebootAndReapply();
      
      if (rebootInfo.isReboot) {
        console.log('[PolicyResilience] Reboot detected', {
          shouldReapply: rebootInfo.shouldReapply,
          inGracePeriod: rebootInfo.inGracePeriod,
        });

        setState(prev => ({
          ...prev,
          rebootDetected: true,
          inGracePeriod: rebootInfo.inGracePeriod,
        }));

        // Set grace period state
        if (rebootInfo.inGracePeriod) {
          const graceExpiresAt = Date.now() + graceConfig.reboot_grace_ms;
          setGraceState(prev => ({
            ...prev,
            rebootGraceActive: true,
            graceExpiresAt,
          }));

          // Clear grace period after timeout
          graceTimeoutRef.current = setTimeout(() => {
            setGraceState(prev => ({
              ...prev,
              rebootGraceActive: false,
              graceExpiresAt: null,
            }));
            setState(prev => ({ ...prev, inGracePeriod: false }));
          }, graceConfig.reboot_grace_ms);
        }
      }

      // Load cached policies first for fast startup
      const { cache, valid } = await loadCachedPolicies();
      if (cache) {
        const activePolicy = getActivePolicy(cache.policies);
        setState(prev => ({
          ...prev,
          policies: cache.policies,
          activePolicyId: activePolicy?.id || null,
          source: 'cache',
          cacheValid: valid,
          integrityStatus: valid ? 'valid' : 'stale',
        }));
      }

      // Then sync from server
      await syncPolicies();
    };

    initialize();

    return () => {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
      }
    };
  }, [syncPolicies, getActivePolicy]);

  // Set up auto-sync interval
  useEffect(() => {
    if (!autoSync) return;

    syncIntervalRef.current = setInterval(() => {
      syncPolicies().catch(console.error);
    }, syncIntervalMs);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, syncIntervalMs, syncPolicies]);

  // Subscribe to realtime policy updates
  useEffect(() => {
    const channel = supabase
      .channel('policy-resilience')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exam_policies' },
        () => {
          console.log('[PolicyResilience] Policy change detected, syncing...');
          syncPolicies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncPolicies]);

  // Start visibility grace period
  const startVisibilityGrace = useCallback(() => {
    const { config } = graceState;
    setGraceState(prev => ({
      ...prev,
      visibilityGraceActive: true,
      graceExpiresAt: Date.now() + config.visibility_change_ms,
    }));

    return config.visibility_change_ms;
  }, [graceState]);

  // Start connectivity grace period
  const startConnectivityGrace = useCallback(() => {
    const { config } = graceState;
    setGraceState(prev => ({
      ...prev,
      connectivityGraceActive: true,
      graceExpiresAt: Date.now() + config.connectivity_loss_ms,
    }));

    return config.connectivity_loss_ms;
  }, [graceState]);

  // Clear any active grace period
  const clearGracePeriod = useCallback((type: 'visibility' | 'connectivity' | 'reboot' | 'all') => {
    setGraceState(prev => {
      const updates: Partial<GracePeriodState> = {};
      
      if (type === 'visibility' || type === 'all') {
        updates.visibilityGraceActive = false;
      }
      if (type === 'connectivity' || type === 'all') {
        updates.connectivityGraceActive = false;
      }
      if (type === 'reboot' || type === 'all') {
        updates.rebootGraceActive = false;
      }
      
      const allCleared = 
        !(updates.visibilityGraceActive ?? prev.visibilityGraceActive) &&
        !(updates.connectivityGraceActive ?? prev.connectivityGraceActive) &&
        !(updates.rebootGraceActive ?? prev.rebootGraceActive);

      return {
        ...prev,
        ...updates,
        graceExpiresAt: allCleared ? null : prev.graceExpiresAt,
      };
    });
  }, []);

  // Check if any grace period is active
  const isInGracePeriod = useCallback(() => {
    return (
      graceState.visibilityGraceActive ||
      graceState.connectivityGraceActive ||
      graceState.rebootGraceActive
    );
  }, [graceState]);

  // Force refresh from server
  const forceRefresh = useCallback(async () => {
    return syncPolicies();
  }, [syncPolicies]);

  // Get cache metadata for debugging
  const getCacheInfo = useCallback(async () => {
    return getCacheMetadata();
  }, []);

  // Update enforcement status
  const setEnforcing = useCallback((enforcing: boolean, policyId?: string) => {
    saveEnforcementState({
      is_enforcing: enforcing,
      last_enforced_at: Date.now(),
      policy_id: policyId || state.activePolicyId,
    });

    setState(prev => ({
      ...prev,
      isEnforcing: enforcing,
    }));
  }, [state.activePolicyId]);

  return {
    // State
    ...state,
    graceState,
    activePolicy: state.activePolicyId 
      ? state.policies.find(p => p.id === state.activePolicyId) 
      : null,

    // Actions
    syncPolicies,
    forceRefresh,
    startVisibilityGrace,
    startConnectivityGrace,
    clearGracePeriod,
    isInGracePeriod,
    setEnforcing,
    getCacheInfo,
  };
}
