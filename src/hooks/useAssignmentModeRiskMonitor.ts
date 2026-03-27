/**
 * Hook for Assignment Mode Risk Monitoring
 *
 * Integrates with:
 * - Assignment Mode Workspace browser tracking
 * - Existing risk detection system
 * - Supabase real-time updates
 */

import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AssignmentRiskEvent {
  id: string;
  user_id: string;
  assignment_id?: string;
  domain: string;
  category: string;
  risk: string;
  event_type: string;
  severity_level?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Hook to track and monitor assignment mode risks
 */
export function useAssignmentModeRiskMonitor(assignmentId?: string) {
  const [riskEvents, setRiskEvents] = useState<AssignmentRiskEvent[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Start monitoring when component mounts
  useEffect(() => {
    if (!assignmentId) return;

    const setupMonitoring = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Subscribe to real-time risk events for this assignment
      // Type cast for assignment_risk_events until Supabase types are regenerated
      const subscription = supabase
        .channel(`assignment-risks-${assignmentId}`)
        .on(
          'postgres_changes' as any,
          {
            event: 'INSERT',
            schema: 'public',
            table: 'assignment_risk_events' as any,
            filter: `assignment_id=eq.${assignmentId}`,
          },
          (payload: any) => {
            const newEvent = payload.new as AssignmentRiskEvent;
            setRiskEvents((prev) => [newEvent, ...prev].slice(0, 100));
            updateRiskScore(newEvent);
          },
        )
        .subscribe();

      // Fetch existing events - cast to any due to Supabase type generation
      const { data: existingEvents, error: fetchError } = await (supabase
        .from('assignment_risk_events' as any)
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('timestamp', { ascending: false })
        .limit(50) as any);

      if (existingEvents && !fetchError) {
        setRiskEvents(existingEvents as unknown as AssignmentRiskEvent[]);
        calculateRiskScore(existingEvents as unknown as AssignmentRiskEvent[]);
      }

      setIsMonitoring(true);

      return () => {
        subscription.unsubscribe();
      };
    };

    setupMonitoring();
  }, [assignmentId]);

  /**
   * Calculate overall risk score (0-100)
   */
  const calculateRiskScore = useCallback((events: AssignmentRiskEvent[]) => {
    let score = 0;

    events.forEach((event) => {
      // High risk events
      if (event.risk === 'high' || event.category === 'ai') {
        score += 15;
      }
      // Medium risk events
      else if (event.risk === 'medium') {
        score += 5;
      }
      // Accumulate for typing speed and paste events
      if (event.event_type === 'suspicious_typing') {
        score += 3;
      }
      if (event.event_type === 'large_paste') {
        score += 5;
      }
    });

    // Cap at 100
    setRiskScore(Math.min(score, 100));
  }, []);

  /**
   * Update risk score based on a new event
   */
  const updateRiskScore = useCallback((event: AssignmentRiskEvent) => {
    setRiskScore((prev) => {
      let delta = 0;
      if (event.risk === 'high' || event.category === 'ai') {
        delta = 15;
      } else if (event.risk === 'medium') {
        delta = 5;
      }

      if (event.event_type === 'suspicious_typing') {
        delta += 3;
      }
      if (event.event_type === 'large_paste') {
        delta += 5;
      }

      return Math.min(prev + delta, 100);
    });
  }, []);

  /**
   * Get risk level description
   */
  const getRiskLevel = useCallback((): 'low' | 'medium' | 'high' => {
    if (riskScore < 30) return 'low';
    if (riskScore < 60) return 'medium';
    return 'high';
  }, [riskScore]);

  /**
   * Get AI domain visits
   */
  const getAIDomainVisits = useCallback((): AssignmentRiskEvent[] => {
    return riskEvents.filter((event) => event.category === 'ai');
  }, [riskEvents]);

  /**
   * Get suspicious activity count
   */
  const getSuspiciousActivityCount = useCallback((): number => {
    return riskEvents.filter(
      (event) =>
        event.risk === 'high' ||
        event.event_type === 'suspicious_typing' ||
        event.event_type === 'large_paste',
    ).length;
  }, [riskEvents]);

  return {
    riskEvents,
    riskScore,
    isMonitoring,
    getRiskLevel,
    getAIDomainVisits,
    getSuspiciousActivityCount,
  };
}

export default useAssignmentModeRiskMonitor;
