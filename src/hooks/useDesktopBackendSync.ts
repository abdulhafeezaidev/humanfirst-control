import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DesktopSyncStatus {
  isDesktop: boolean;
  agentConnected: boolean;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  error: string | null;
  policyCount: number;
}

/**
 * Automatically keeps the Electron Desktop enforcement engine synchronized
 * in real-time with the Supabase backend policies, blocked domains, and services.
 */
export function useDesktopBackendSync(): DesktopSyncStatus {
  const { user, organization, role } = useAuth();
  const [agentConnected, setAgentConnected] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [policyCount, setPolicyCount] = useState<number>(0);

  const desktop = typeof window !== 'undefined' ? window.humanfirstDesktop : undefined;
  const isDesktop = Boolean(desktop?.isDesktop);

  const isSyncingRef = useRef(false);

  const syncPoliciesToAgent = useCallback(async () => {
    if (!isDesktop || !desktop?.agentPushPolicies || !user) return;
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    setError(null);

    try {
      // 1. Fetch active exam policies
      let query = supabase
        .from('exam_policies')
        .select('id, title, is_active, start_time, end_time, policy_type, enforcement_level, blocked_categories, blocked_services, assignment_type')
        .eq('is_active', true);

      if (organization?.id) {
        query = query.eq('organization_id', organization.id);
      }

      const { data: policiesData, error: policiesErr } = await query;
      if (policiesErr) throw policiesErr;

      // 2. Fetch blocked AI services (global)
      const { data: aiServicesData } = await supabase
        .from('ai_services')
        .select('name, category, domains, is_blocked_during_exam')
        .eq('is_blocked_during_exam', true);

      // 3. Fetch custom blocked URLs
      let blockedUrlsQuery = supabase.from('blocked_urls').select('url, policy_id');
      if (organization?.id) {
        blockedUrlsQuery = blockedUrlsQuery.eq('organization_id', organization.id);
      }
      const { data: blockedUrlsData } = await blockedUrlsQuery;

      const aiDomains = (aiServicesData || []).flatMap((s) => s.domains || []);
      const customUrls = (blockedUrlsData || []).map((u) => {
        try {
          const parsed = new URL(u.url.startsWith('http') ? u.url : `https://${u.url}`);
          return parsed.hostname;
        } catch {
          return u.url;
        }
      });

      const allBlockedDomains = Array.from(new Set([...aiDomains, ...customUrls]));

      // 4. Map policies for the local agent
      const now = new Date();
      let hasActiveStrictExam = false;

      const mapped = (policiesData || []).map((p) => {
        const isActiveNow =
          p.is_active &&
          now >= new Date(p.start_time) &&
          now <= new Date(p.end_time);

        if (isActiveNow && p.policy_type === 'exam' && p.enforcement_level === 'strict') {
          hasActiveStrictExam = true;
        }

        return {
          id: p.id,
          title: p.title,
          isActive: p.is_active,
          examMode: p.policy_type === 'exam',
          startTime: p.start_time,
          endTime: p.end_time,
          allowedApps: [] as string[],
          blockedApps: [] as string[],
          allowedDomains: [] as string[],
          blockedDomains: allBlockedDomains,
        };
      });

      // 5. Push to local desktop agent
      const pushRes = await desktop.agentPushPolicies(mapped);
      setPolicyCount(mapped.length);

      // 6. If student is on desktop and a strict exam is currently active, ensure examMode is enabled
      if (role === 'student' && hasActiveStrictExam && desktop.setExamMode) {
        await desktop.setExamMode(true).catch(() => {});
      }

      // Check agent connectivity
      if (desktop.agentStatus) {
        const statusRes = await desktop.agentStatus();
        const connected = Boolean(statusRes && (statusRes.ok || statusRes.connected || statusRes.success));
        setAgentConnected(connected);

        // If admin/super_admin, sync status back to Supabase enforcement_config
        if (organization?.id && (role === 'super_admin' || role === 'admin')) {
          await supabase
            .from('enforcement_config')
            .update({
              status: connected ? 'active' : 'not_connected',
              status_message: connected ? 'Agent connected and in sync' : 'Agent offline',
              updated_at: new Date().toISOString(),
            })
            .eq('organization_id', organization.id)
            .then(() => {})
            .catch(() => {});
        }
      }

      setLastSyncedAt(new Date());
    } catch (err: any) {
      console.warn('[DesktopSync] Backend sync failed:', err);
      setError(err?.message || 'Failed to sync with backend');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isDesktop, desktop, user, organization?.id, role]);

  // Initial sync & Realtime backend listener
  useEffect(() => {
    if (!isDesktop || !user) return;

    // Run initial sync
    syncPoliciesToAgent();

    // Subscribe to backend changes in real-time
    const channel = supabase
      .channel('desktop-backend-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exam_policies' },
        () => {
          syncPoliciesToAgent();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocked_urls' },
        () => {
          syncPoliciesToAgent();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_services' },
        () => {
          syncPoliciesToAgent();
        }
      )
      .subscribe();

    // Periodic heartbeat sync every 60s
    const interval = setInterval(() => {
      syncPoliciesToAgent();
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isDesktop, user, syncPoliciesToAgent]);

  return {
    isDesktop,
    agentConnected,
    lastSyncedAt,
    isSyncing,
    error,
    policyCount,
  };
}
