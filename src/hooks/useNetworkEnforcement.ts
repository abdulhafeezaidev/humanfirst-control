/**
 * Network Enforcement Hook
 * 
 * Provides DNS pinning verification, fallback resolver checking,
 * DNS override detection, and DoH/DoT awareness.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  NetworkEnforcementConfig,
  DEFAULT_NETWORK_CONFIG,
  NetworkAnomalyLog,
  DNSAnomalyType,
  runNetworkIntegrityCheck,
  detectDNSManipulation,
  detectDoHUsage,
  getAnomalyLogs,
  clearAnomalyLogs,
  getNetworkStatus,
  PINNED_AI_DOMAINS,
} from '@/lib/networkEnforcement';

export interface NetworkEnforcementState {
  status: 'healthy' | 'suspicious' | 'compromised' | 'checking' | 'unknown';
  lastCheckAt: number | null;
  checksPerformed: number;
  anomaliesDetected: number;
  dohDetected: boolean;
  recentAnomalies: NetworkAnomalyLog[];
  domainResults: Array<{
    domain: string;
    status: 'ok' | 'blocked' | 'manipulated' | 'unknown';
    details: string;
  }>;
  isChecking: boolean;
  error: string | null;
}

interface UseNetworkEnforcementOptions {
  enabled?: boolean;
  autoCheck?: boolean;
  checkIntervalMs?: number;
  domainsToCheck?: string[];
  onAnomalyDetected?: (anomaly: NetworkAnomalyLog) => void;
}

export function useNetworkEnforcement({
  enabled = true,
  autoCheck = true,
  checkIntervalMs = 60000,
  domainsToCheck,
  onAnomalyDetected,
}: UseNetworkEnforcementOptions = {}) {
  const [state, setState] = useState<NetworkEnforcementState>({
    status: 'unknown',
    lastCheckAt: null,
    checksPerformed: 0,
    anomaliesDetected: 0,
    dohDetected: false,
    recentAnomalies: [],
    domainResults: [],
    isChecking: false,
    error: null,
  });

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousAnomalyCountRef = useRef(0);

  // Domains to check - use provided or default
  const domains = domainsToCheck || PINNED_AI_DOMAINS.slice(0, 5).map(d => d.domain);

  // Run network integrity check
  const runCheck = useCallback(async () => {
    if (!enabled) return;

    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const result = await runNetworkIntegrityCheck(domains);

      setState(prev => ({
        ...prev,
        status: result.overallStatus,
        lastCheckAt: Date.now(),
        checksPerformed: result.checksPerformed,
        anomaliesDetected: result.anomaliesDetected,
        dohDetected: result.dohStatus.detected,
        domainResults: result.results,
        recentAnomalies: getAnomalyLogs().slice(0, 10),
        isChecking: false,
      }));

      // Notify about new anomalies
      const currentAnomalyCount = getAnomalyLogs().length;
      if (onAnomalyDetected && currentAnomalyCount > previousAnomalyCountRef.current) {
        const newAnomalies = getAnomalyLogs().slice(
          0,
          currentAnomalyCount - previousAnomalyCountRef.current
        );
        newAnomalies.forEach(onAnomalyDetected);
      }
      previousAnomalyCountRef.current = currentAnomalyCount;

    } catch (err) {
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: err instanceof Error ? err.message : 'Check failed',
      }));
    }
  }, [enabled, domains, onAnomalyDetected]);

  // Check specific domain
  const checkDomain = useCallback(async (domain: string) => {
    const result = await detectDNSManipulation(domain);
    
    setState(prev => ({
      ...prev,
      recentAnomalies: getAnomalyLogs().slice(0, 10),
    }));

    return result;
  }, []);

  // Check DoH status
  const checkDoH = useCallback(async () => {
    const result = await detectDoHUsage();
    
    setState(prev => ({
      ...prev,
      dohDetected: result.dohDetected,
      recentAnomalies: getAnomalyLogs().slice(0, 10),
    }));

    return result;
  }, []);

  // Clear anomaly logs
  const clearLogs = useCallback(() => {
    clearAnomalyLogs();
    setState(prev => ({
      ...prev,
      recentAnomalies: [],
      anomaliesDetected: 0,
    }));
  }, []);

  // Initial check on mount
  useEffect(() => {
    if (enabled && autoCheck) {
      runCheck();
    }
  }, [enabled, autoCheck, runCheck]);

  // Set up auto-check interval
  useEffect(() => {
    if (!enabled || !autoCheck) return;

    checkIntervalRef.current = setInterval(() => {
      runCheck();
    }, checkIntervalMs);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, autoCheck, checkIntervalMs, runCheck]);

  // Get status color for UI
  const getStatusColor = useCallback(() => {
    switch (state.status) {
      case 'healthy':
        return 'green';
      case 'suspicious':
        return 'amber';
      case 'compromised':
        return 'red';
      case 'checking':
        return 'blue';
      default:
        return 'gray';
    }
  }, [state.status]);

  // Get status label for UI
  const getStatusLabel = useCallback(() => {
    switch (state.status) {
      case 'healthy':
        return 'Network Integrity OK';
      case 'suspicious':
        return 'Potential DNS Issues';
      case 'compromised':
        return 'DNS Manipulation Detected';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  }, [state.status]);

  return {
    ...state,
    runCheck,
    checkDomain,
    checkDoH,
    clearLogs,
    getStatusColor,
    getStatusLabel,
  };
}
