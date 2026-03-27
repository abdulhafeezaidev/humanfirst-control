/**
 * Policy Resilience System
 * 
 * Provides local caching, integrity validation, auto-reapply after reboot,
 * and grace periods to prevent false tamper signals.
 */

import { supabase } from "@/integrations/supabase/client";

// Types
export interface CachedPolicy {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
  blocked_categories: string[];
  created_at: string;
  updated_at: string;
  organization_id: string | null;
  created_by: string | null;
}

export interface PolicyCache {
  policies: CachedPolicy[];
  checksum: string;
  cached_at: number;
  version: number;
  organization_id: string | null;
}

export interface EnforcementState {
  is_enforcing: boolean;
  last_enforced_at: number;
  policy_id: string | null;
  reboot_count: number;
  session_start: number;
}

export interface GracePeriodConfig {
  visibility_change_ms: number;     // Time before logging tab hidden
  connectivity_loss_ms: number;     // Time before logging network loss
  focus_loss_ms: number;            // Time before logging window focus loss
  reboot_grace_ms: number;          // Grace period after browser restart
  policy_sync_grace_ms: number;     // Grace period for policy sync after cache
}

// Constants
const CACHE_KEY = 'humanfirst_policy_cache';
const ENFORCEMENT_STATE_KEY = 'humanfirst_enforcement_state';
const GRACE_CONFIG_KEY = 'humanfirst_grace_config';
const CACHE_VERSION = 1;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_AGE_MS = 30 * 60 * 1000; // 30 minutes

// Default grace periods (prevent false positives)
export const DEFAULT_GRACE_PERIODS: GracePeriodConfig = {
  visibility_change_ms: 3000,      // 3 seconds before logging tab hidden
  connectivity_loss_ms: 10000,     // 10 seconds before logging network loss
  focus_loss_ms: 2000,             // 2 seconds before logging focus loss
  reboot_grace_ms: 30000,          // 30 seconds grace after browser restart
  policy_sync_grace_ms: 5000,      // 5 seconds to allow policy sync
};

/**
 * Generate SHA-256 checksum for policy data
 */
export async function generateChecksum(data: CachedPolicy[]): Promise<string> {
  const normalized = JSON.stringify(
    data.map(p => ({
      id: p.id,
      title: p.title,
      blocked_categories: [...p.blocked_categories].sort(),
      start_time: p.start_time,
      end_time: p.end_time,
      is_active: p.is_active,
      updated_at: p.updated_at,
    })).sort((a, b) => a.id.localeCompare(b.id))
  );

  const encoder = new TextEncoder();
  const data_buffer = encoder.encode(normalized);
  const hash_buffer = await crypto.subtle.digest('SHA-256', data_buffer);
  const hash_array = Array.from(new Uint8Array(hash_buffer));
  return hash_array.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate checksum of cached policies
 */
export async function validateChecksum(cache: PolicyCache): Promise<boolean> {
  const computed = await generateChecksum(cache.policies);
  return computed === cache.checksum;
}

/**
 * Save policies to local storage with checksum
 */
export async function cachePolicies(
  policies: CachedPolicy[],
  organizationId: string | null
): Promise<PolicyCache> {
  const checksum = await generateChecksum(policies);
  const cache: PolicyCache = {
    policies,
    checksum,
    cached_at: Date.now(),
    version: CACHE_VERSION,
    organization_id: organizationId,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log('[PolicyCache] Policies cached successfully', {
      count: policies.length,
      checksum: checksum.slice(0, 8) + '...',
    });
  } catch (err) {
    console.error('[PolicyCache] Failed to cache policies:', err);
  }

  return cache;
}

/**
 * Load policies from local cache with integrity validation
 */
export async function loadCachedPolicies(): Promise<{
  cache: PolicyCache | null;
  valid: boolean;
  reason: string;
}> {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) {
      return { cache: null, valid: false, reason: 'no_cache' };
    }

    const cache: PolicyCache = JSON.parse(stored);

    // Version check
    if (cache.version !== CACHE_VERSION) {
      return { cache: null, valid: false, reason: 'version_mismatch' };
    }

    // Age check
    const age = Date.now() - cache.cached_at;
    if (age > MAX_CACHE_AGE_MS) {
      return { cache, valid: false, reason: 'cache_expired' };
    }

    // Integrity check
    const isValid = await validateChecksum(cache);
    if (!isValid) {
      console.warn('[PolicyCache] Checksum validation failed - cache may be tampered');
      return { cache, valid: false, reason: 'checksum_mismatch' };
    }

    return { cache, valid: true, reason: 'valid' };
  } catch (err) {
    console.error('[PolicyCache] Error loading cache:', err);
    return { cache: null, valid: false, reason: 'parse_error' };
  }
}

/**
 * Clear the policy cache
 */
export function clearPolicyCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log('[PolicyCache] Cache cleared');
}

/**
 * Check if cache needs refresh
 */
export function isCacheStale(cache: PolicyCache | null): boolean {
  if (!cache) return true;
  return Date.now() - cache.cached_at > DEFAULT_CACHE_TTL_MS;
}

/**
 * Save enforcement state for auto-reapply after reboot
 */
export function saveEnforcementState(state: Partial<EnforcementState>): void {
  try {
    const existing = loadEnforcementState();
    const updated: EnforcementState = {
      is_enforcing: state.is_enforcing ?? existing?.is_enforcing ?? false,
      last_enforced_at: state.last_enforced_at ?? existing?.last_enforced_at ?? 0,
      policy_id: state.policy_id ?? existing?.policy_id ?? null,
      reboot_count: state.reboot_count ?? existing?.reboot_count ?? 0,
      session_start: state.session_start ?? existing?.session_start ?? Date.now(),
    };
    localStorage.setItem(ENFORCEMENT_STATE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[PolicyCache] Failed to save enforcement state:', err);
  }
}

/**
 * Load enforcement state for auto-reapply detection
 */
export function loadEnforcementState(): EnforcementState | null {
  try {
    const stored = localStorage.getItem(ENFORCEMENT_STATE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Detect if this is a reboot/new session requiring enforcement reapply
 */
export function detectRebootAndReapply(): {
  isReboot: boolean;
  shouldReapply: boolean;
  inGracePeriod: boolean;
  previousState: EnforcementState | null;
} {
  const sessionKey = 'humanfirst_session_id';
  const currentSession = sessionStorage.getItem(sessionKey);
  const graceConfig = loadGraceConfig();
  
  // Generate new session ID if not present
  if (!currentSession) {
    const newSession = crypto.randomUUID();
    sessionStorage.setItem(sessionKey, newSession);
  }

  const previousState = loadEnforcementState();
  const isReboot = !currentSession; // No session = browser restarted

  if (!previousState) {
    return {
      isReboot,
      shouldReapply: false,
      inGracePeriod: false,
      previousState: null,
    };
  }

  // Check if we're in reboot grace period
  const timeSinceEnforcement = Date.now() - previousState.last_enforced_at;
  const inGracePeriod = isReboot && timeSinceEnforcement < graceConfig.reboot_grace_ms;

  // Should reapply if was enforcing and policy is likely still active
  const shouldReapply = previousState.is_enforcing && previousState.policy_id !== null;

  if (isReboot) {
    // Update reboot count
    saveEnforcementState({
      ...previousState,
      reboot_count: previousState.reboot_count + 1,
      session_start: Date.now(),
    });
  }

  return {
    isReboot,
    shouldReapply,
    inGracePeriod,
    previousState,
  };
}

/**
 * Save grace period configuration
 */
export function saveGraceConfig(config: Partial<GracePeriodConfig>): void {
  const current = loadGraceConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(GRACE_CONFIG_KEY, JSON.stringify(updated));
}

/**
 * Load grace period configuration
 */
export function loadGraceConfig(): GracePeriodConfig {
  try {
    const stored = localStorage.getItem(GRACE_CONFIG_KEY);
    if (!stored) return DEFAULT_GRACE_PERIODS;
    return { ...DEFAULT_GRACE_PERIODS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_GRACE_PERIODS;
  }
}

/**
 * Sync policies from server with cache fallback
 */
export async function syncPoliciesWithCache(
  organizationId: string | null
): Promise<{
  policies: CachedPolicy[];
  source: 'server' | 'cache';
  cacheValid: boolean;
}> {
  // First, try to load from cache
  const { cache, valid, reason } = await loadCachedPolicies();
  
  // Attempt server sync
  try {
    const query = supabase
      .from('exam_policies')
      .select('*')
      .eq('is_active', true);
    
    if (organizationId) {
      query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;

    if (data) {
      const policies = data as CachedPolicy[];
      await cachePolicies(policies, organizationId);
      return { policies, source: 'server', cacheValid: true };
    }
  } catch (err) {
    console.warn('[PolicyCache] Server sync failed, using cache:', err);
  }

  // Fallback to cache if server failed
  if (cache && valid) {
    console.log('[PolicyCache] Using valid cached policies');
    return { policies: cache.policies, source: 'cache', cacheValid: true };
  }

  // Use stale cache if nothing else available (with warning)
  if (cache) {
    console.warn('[PolicyCache] Using stale cache (reason:', reason, ')');
    return { policies: cache.policies, source: 'cache', cacheValid: false };
  }

  // No policies available
  return { policies: [], source: 'cache', cacheValid: false };
}

/**
 * Get cache metadata for debugging/display
 */
export async function getCacheMetadata(): Promise<{
  exists: boolean;
  valid: boolean;
  reason: string;
  age_ms: number | null;
  policy_count: number;
  checksum_prefix: string | null;
  version: number | null;
}> {
  const { cache, valid, reason } = await loadCachedPolicies();
  
  if (!cache) {
    return {
      exists: false,
      valid: false,
      reason,
      age_ms: null,
      policy_count: 0,
      checksum_prefix: null,
      version: null,
    };
  }

  return {
    exists: true,
    valid,
    reason,
    age_ms: Date.now() - cache.cached_at,
    policy_count: cache.policies.length,
    checksum_prefix: cache.checksum.slice(0, 8),
    version: cache.version,
  };
}
