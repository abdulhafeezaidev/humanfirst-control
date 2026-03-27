/**
 * Device Trust Score Hook
 * 
 * Calculates and manages device trust scores using deterministic,
 * non-ML signals with time-based decay.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  TrustScore,
  TrustLevel,
  DeviceTrustInput,
  TamperEventInput,
  EnforcementSession,
  calculateTrustScore,
  getTrustLevelDisplay,
  generateAdminExplanation,
  DEFAULT_TRUST_CONFIG,
  TrustScoringConfig,
} from '@/lib/deviceTrust';

export interface UseDeviceTrustOptions {
  deviceId: string;
  userId?: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
  config?: Partial<TrustScoringConfig>;
}

export interface DeviceTrustState {
  trustScore: TrustScore | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: number | null;
}

export function useDeviceTrust({
  deviceId,
  userId,
  autoRefresh = false,
  refreshIntervalMs = 300000, // 5 minutes
  config: configOverride,
}: UseDeviceTrustOptions) {
  const [state, setState] = useState<DeviceTrustState>({
    trustScore: null,
    isLoading: true,
    error: null,
    lastRefresh: null,
  });

  const config = useMemo(() => ({
    ...DEFAULT_TRUST_CONFIG,
    ...configOverride,
  }), [configOverride]);

  // Fetch device data and calculate trust score
  const calculateScore = useCallback(async () => {
    if (!deviceId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch tamper events for this device
      const { data: tamperEvents, error: tamperError } = await supabase
        .from('tamper_events')
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (tamperError) throw tamperError;

      // Convert to input format
      const tamperEventInputs: TamperEventInput[] = (tamperEvents || []).map(e => ({
        id: e.id,
        eventType: e.event_type,
        timestamp: new Date(e.timestamp).getTime(),
        resolved: e.resolved,
        severity: getSeverityFromType(e.event_type),
      }));

      // Build device trust input
      // For now, use defaults for fields we don't have direct data for
      const firstEvent = tamperEvents?.[tamperEvents.length - 1];
      const lastEvent = tamperEvents?.[0];

      const deviceInput: DeviceTrustInput = {
        deviceId,
        tamperEvents: tamperEventInputs,
        enforcementSessions: buildSessionsFromEvents(tamperEventInputs),
        firstSeenAt: firstEvent 
          ? new Date(firstEvent.timestamp).getTime() 
          : Date.now() - 7 * 24 * 60 * 60 * 1000, // Default to 7 days ago
        lastActiveAt: lastEvent 
          ? new Date(lastEvent.timestamp).getTime() 
          : Date.now(),
        totalExamsTaken: countUniqueExams(tamperEvents || []),
        networkAnomalies: countNetworkAnomalies(tamperEventInputs),
        policyViolations: countPolicyViolations(tamperEventInputs),
        successfulExams: countSuccessfulExams(tamperEvents || []),
      };

      const trustScore = calculateTrustScore(deviceInput, config);

      setState({
        trustScore,
        isLoading: false,
        error: null,
        lastRefresh: Date.now(),
      });

    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to calculate trust score',
      }));
    }
  }, [deviceId, config]);

  // Initial calculation
  useEffect(() => {
    calculateScore();
  }, [calculateScore]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      calculateScore();
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshIntervalMs, calculateScore]);

  // Get display properties
  const displayProps = useMemo(() => {
    if (!state.trustScore) return null;
    return getTrustLevelDisplay(state.trustScore.level);
  }, [state.trustScore]);

  // Get admin explanation
  const adminExplanation = useMemo(() => {
    if (!state.trustScore) return null;
    return generateAdminExplanation(state.trustScore);
  }, [state.trustScore]);

  return {
    ...state,
    displayProps,
    adminExplanation,
    refresh: calculateScore,
  };
}

// Helper functions

function getSeverityFromType(eventType: string): 'low' | 'medium' | 'high' {
  const highSeverity = ['extension_disabled', 'policy_bypassed', 'dns_manipulation_detected'];
  const mediumSeverity = ['app_closed_during_exam', 'connectivity_issue_detected', 'extended_focus_loss'];
  
  if (highSeverity.includes(eventType)) return 'high';
  if (mediumSeverity.includes(eventType)) return 'medium';
  return 'low';
}

function buildSessionsFromEvents(events: TamperEventInput[]): EnforcementSession[] {
  // Group events by approximate session (within 2 hours)
  const sessions: EnforcementSession[] = [];
  let currentSession: EnforcementSession | null = null;
  const SESSION_GAP_MS = 2 * 60 * 60 * 1000; // 2 hours

  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  sortedEvents.forEach(event => {
    if (!currentSession || event.timestamp - (currentSession.endTime || currentSession.startTime) > SESSION_GAP_MS) {
      // Start new session
      if (currentSession) {
        sessions.push(currentSession);
      }
      currentSession = {
        startTime: event.timestamp,
        endTime: event.timestamp,
        policyId: 'unknown',
        wasInterrupted: false,
        tamperEvents: 1,
      };
    } else {
      // Continue current session
      currentSession.endTime = event.timestamp;
      currentSession.tamperEvents++;
      
      // Mark as interrupted if certain events occurred
      if (['app_closed_during_exam', 'extension_disabled'].includes(event.eventType)) {
        currentSession.wasInterrupted = true;
      }
    }
  });

  if (currentSession) {
    sessions.push(currentSession);
  }

  return sessions;
}

function countUniqueExams(events: any[]): number {
  const uniquePolicies = new Set(events.map(e => e.exam_policy_id).filter(Boolean));
  return Math.max(uniquePolicies.size, 1); // At least 1 if there are any events
}

function countNetworkAnomalies(events: TamperEventInput[]): number {
  return events.filter(e => 
    ['network_disconnected', 'connectivity_issue_detected', 'dns_manipulation_detected'].includes(e.eventType)
  ).length;
}

function countPolicyViolations(events: TamperEventInput[]): number {
  return events.filter(e => 
    ['policy_bypassed', 'extension_disabled'].includes(e.eventType)
  ).length;
}

function countSuccessfulExams(events: any[]): number {
  // Count exams without critical violations
  const examPolicies = new Set(events.map(e => e.exam_policy_id).filter(Boolean));
  const failedExams = new Set(
    events
      .filter(e => ['policy_bypassed', 'extension_disabled', 'app_closed_during_exam'].includes(e.event_type))
      .map(e => e.exam_policy_id)
      .filter(Boolean)
  );
  
  return Math.max(0, examPolicies.size - failedExams.size);
}

/**
 * Hook to get trust scores for multiple devices
 */
export function useMultipleDeviceTrust(deviceIds: string[]) {
  const [scores, setScores] = useState<Map<string, TrustScore>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (deviceIds.length === 0) {
      setIsLoading(false);
      return;
    }

    const calculateAllScores = async () => {
      setIsLoading(true);
      const newScores = new Map<string, TrustScore>();

      // Fetch all tamper events at once
      const { data: allEvents } = await supabase
        .from('tamper_events')
        .select('*')
        .in('device_id', deviceIds)
        .order('timestamp', { ascending: false });

      // Group by device
      const eventsByDevice = new Map<string, any[]>();
      deviceIds.forEach(id => eventsByDevice.set(id, []));
      (allEvents || []).forEach(event => {
        const existing = eventsByDevice.get(event.device_id) || [];
        existing.push(event);
        eventsByDevice.set(event.device_id, existing);
      });

      // Calculate score for each device
      eventsByDevice.forEach((events, deviceId) => {
        const tamperEventInputs: TamperEventInput[] = events.map(e => ({
          id: e.id,
          eventType: e.event_type,
          timestamp: new Date(e.timestamp).getTime(),
          resolved: e.resolved,
          severity: getSeverityFromType(e.event_type),
        }));

        const firstEvent = events[events.length - 1];
        const lastEvent = events[0];

        const deviceInput: DeviceTrustInput = {
          deviceId,
          tamperEvents: tamperEventInputs,
          enforcementSessions: buildSessionsFromEvents(tamperEventInputs),
          firstSeenAt: firstEvent 
            ? new Date(firstEvent.timestamp).getTime() 
            : Date.now() - 7 * 24 * 60 * 60 * 1000,
          lastActiveAt: lastEvent 
            ? new Date(lastEvent.timestamp).getTime() 
            : Date.now(),
          totalExamsTaken: countUniqueExams(events),
          networkAnomalies: countNetworkAnomalies(tamperEventInputs),
          policyViolations: countPolicyViolations(tamperEventInputs),
          successfulExams: countSuccessfulExams(events),
        };

        newScores.set(deviceId, calculateTrustScore(deviceInput));
      });

      setScores(newScores);
      setIsLoading(false);
    };

    calculateAllScores();
  }, [deviceIds.join(',')]);

  return { scores, isLoading };
}
