import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAnonKey, supabaseUrl } from '@/integrations/supabase/config';
import { loadGraceConfig, detectRebootAndReapply, GracePeriodConfig } from '@/lib/policyCache';
import { isStorableEvent } from '@/lib/eventFiltering';

interface TamperDetectionOptions {
  userId: string;
  organizationId?: string;
  isExamModeActive: boolean;
  activePolicyId?: string;
  /** Optional: override grace period config */
  graceConfig?: Partial<GracePeriodConfig>;
}

interface TamperEvent {
  type: string;
  timestamp: Date;
}

export interface TamperDetectionState {
  recentEvents: TamperEvent[];
  showAlert: boolean;
  deviceId: string;
  inGracePeriod: boolean;
  gracePeriodType: 'none' | 'visibility' | 'connectivity' | 'reboot';
  graceExpiresAt: number | null;
}

type PendingTamperInsert = {
  user_id: string;
  device_id: string;
  event_type: string;
  exam_policy_id: string | null;
  organization_id: string;
};

const PENDING_TAMPER_EVENTS_KEY = 'humanfirst_pending_tamper_events_v1';

function enqueuePendingTamperEvent(event: PendingTamperInsert) {
  try {
    const raw = localStorage.getItem(PENDING_TAMPER_EVENTS_KEY);
    const existing: PendingTamperInsert[] = raw ? JSON.parse(raw) : [];
    const next = [...existing.slice(-49), event];
    localStorage.setItem(PENDING_TAMPER_EVENTS_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('[TamperDetection] Failed to enqueue pending event', err);
  }
}

async function flushPendingTamperEvents() {
  try {
    const raw = localStorage.getItem(PENDING_TAMPER_EVENTS_KEY);
    if (!raw) return;

    const pending: PendingTamperInsert[] = JSON.parse(raw);
    if (!Array.isArray(pending) || pending.length === 0) return;

    // FILTER: Only insert storable events per violation-only logging policy
    const storableEvents = pending.filter((event) => isStorableEvent(event.event_type));

    if (storableEvents.length === 0) {
      // All events were filtered out, just clear and return
      localStorage.removeItem(PENDING_TAMPER_EVENTS_KEY);
      return;
    }

    const { error } = await supabase.from('tamper_events').insert(storableEvents);
    if (error) {
      console.warn('[TamperDetection] Failed to flush pending events:', error);
      return;
    }

    localStorage.removeItem(PENDING_TAMPER_EVENTS_KEY);
  } catch (err) {
    console.warn('[TamperDetection] Failed to flush pending events', err);
  }
}

// Generate or retrieve device ID (stored in localStorage)
const getDeviceId = (): string => {
  const storageKey = 'humanfirst_device_id';
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
};

export const useTamperDetection = ({ 
  userId, 
  organizationId,
  isExamModeActive, 
  activePolicyId,
  graceConfig: graceConfigOverride,
}: TamperDetectionOptions) => {
  const [recentEvents, setRecentEvents] = useState<TamperEvent[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [gracePeriodType, setGracePeriodType] = useState<'none' | 'visibility' | 'connectivity' | 'reboot'>('none');
  const [graceExpiresAt, setGraceExpiresAt] = useState<number | null>(null);
  
  const lastEventRef = useRef<string | null>(null);
  const deviceId = useRef(getDeviceId());
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const networkCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectivityGraceRef = useRef<NodeJS.Timeout | null>(null);
  const graceConfigRef = useRef<GracePeriodConfig>(loadGraceConfig());

  // Load grace config on mount
  useEffect(() => {
    const config = loadGraceConfig();
    if (graceConfigOverride) {
      graceConfigRef.current = { ...config, ...graceConfigOverride };
    } else {
      graceConfigRef.current = config;
    }
  }, [graceConfigOverride]);

  // Flush any queued events (e.g., from beforeunload)
  useEffect(() => {
    flushPendingTamperEvents();
  }, []);

  // Check for reboot grace period on mount
  useEffect(() => {
    const rebootInfo = detectRebootAndReapply();
    if (rebootInfo.isReboot && rebootInfo.inGracePeriod) {
      console.log('[TamperDetection] Reboot grace period active');
      setInGracePeriod(true);
      setGracePeriodType('reboot');
      const expiresAt = Date.now() + graceConfigRef.current.reboot_grace_ms;
      setGraceExpiresAt(expiresAt);

      // Clear grace period after timeout
      const timeout = setTimeout(() => {
        setInGracePeriod(false);
        setGracePeriodType('none');
        setGraceExpiresAt(null);
        console.log('[TamperDetection] Reboot grace period ended');
      }, graceConfigRef.current.reboot_grace_ms);

      return () => clearTimeout(timeout);
    }
  }, []);

  const logTamperEvent = useCallback(async (eventType: string, bypassGrace = false) => {
    // Check if in grace period (unless bypassed)
    if (!bypassGrace && inGracePeriod) {
      console.log(`[TamperDetection] Suppressing event during grace period: ${eventType}`);
      return;
    }

    // SECURITY: Require organization_id for multi-tenant isolation
    if (!organizationId) {
      console.warn('[TamperDetection] Cannot log event without organization_id');
      return;
    }

    // Debounce: don't log same event type within 5 seconds
    const eventKey = `${eventType}_${Math.floor(Date.now() / 5000)}`;
    if (lastEventRef.current === eventKey) return;
    lastEventRef.current = eventKey;

    console.log(`[TamperDetection] Logging event: ${eventType}`);
    
    const newEvent: TamperEvent = { type: eventType, timestamp: new Date() };
    setRecentEvents(prev => [...prev.slice(-4), newEvent]);
    setShowAlert(true);

    try {
      const { error } = await supabase
        .from('tamper_events')
        .insert({
          user_id: userId,
          device_id: deviceId.current,
          event_type: eventType,
          exam_policy_id: activePolicyId || null,
          organization_id: organizationId,
        });

      if (error) {
        console.error('[TamperDetection] Failed to log event:', error);
      }
    } catch (err) {
      console.error('[TamperDetection] Error:', err);
    }
  }, [userId, organizationId, activePolicyId, inGracePeriod]);

  // Visibility change detection (tab hidden/minimized)
  useEffect(() => {
    if (!isExamModeActive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Start a timer using configurable grace period
        const gracePeriod = graceConfigRef.current.visibility_change_ms;
        visibilityTimeoutRef.current = setTimeout(() => {
          logTamperEvent('app_backgrounded');
        }, gracePeriod);
      } else {
        // Clear timer if came back within grace period
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
          visibilityTimeoutRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [isExamModeActive, logTamperEvent]);

  // Page unload detection (closing tab/browser during exam)
  useEffect(() => {
    if (!isExamModeActive) return;

    const handleBeforeUnload = () => {
      // Can't reliably call Supabase with auth headers during beforeunload.
      // Queue the event locally and flush on next app load.
      if (!organizationId) return;
      enqueuePendingTamperEvent({
        user_id: userId,
        device_id: deviceId.current,
        event_type: 'app_closed_during_exam',
        exam_policy_id: activePolicyId || null,
        organization_id: organizationId,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isExamModeActive, userId, activePolicyId, organizationId]);

  // Network connectivity monitoring
  useEffect(() => {
    if (!isExamModeActive) return;

    const handleOffline = () => {
      // Start connectivity grace period
      const gracePeriod = graceConfigRef.current.connectivity_loss_ms;
      setInGracePeriod(true);
      setGracePeriodType('connectivity');
      setGraceExpiresAt(Date.now() + gracePeriod);

      connectivityGraceRef.current = setTimeout(() => {
        logTamperEvent('network_disconnected', true); // Bypass grace check
        setInGracePeriod(false);
        setGracePeriodType('none');
        setGraceExpiresAt(null);
      }, gracePeriod);
    };

    const handleOnline = () => {
      // Clear connectivity grace if reconnected quickly
      if (connectivityGraceRef.current) {
        clearTimeout(connectivityGraceRef.current);
        connectivityGraceRef.current = null;
        setInGracePeriod(false);
        setGracePeriodType('none');
        setGraceExpiresAt(null);
      }
      logTamperEvent('network_reconnected');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Periodic network check (detects VPN/DNS issues that don't trigger offline event)
    networkCheckIntervalRef.current = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      } catch {
        logTamperEvent('connectivity_issue_detected');
      }
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (networkCheckIntervalRef.current) {
        clearInterval(networkCheckIntervalRef.current);
      }
    };
  }, [isExamModeActive, logTamperEvent]);

  // Focus loss detection (window loses focus)
  useEffect(() => {
    if (!isExamModeActive) return;

    let focusLostTime: number | null = null;

    const handleBlur = () => {
      focusLostTime = Date.now();
    };

    const handleFocus = () => {
      const focusGracePeriod = graceConfigRef.current.focus_loss_ms;
      // Use configurable focus loss threshold (default much shorter than 10s)
      if (focusLostTime && Date.now() - focusLostTime > focusGracePeriod + 10000) {
        // Only log if focus was lost for grace period + 10 seconds
        logTamperEvent('extended_focus_loss');
      }
      focusLostTime = null;
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isExamModeActive, logTamperEvent]);

  const dismissAlert = useCallback(() => {
    setShowAlert(false);
  }, []);

  return {
    recentEvents,
    showAlert,
    dismissAlert,
    deviceId: deviceId.current,
    inGracePeriod,
    gracePeriodType,
    graceExpiresAt,
  };
};
