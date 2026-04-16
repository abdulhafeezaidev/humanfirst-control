import { useCallback, useRef, useState } from "react";
import type { AssignmentRiskEvent } from "@/types/assignmentRisk";
import { reportDomainVisit, sendRiskEvent } from "@/lib/assignmentRiskApi";

const PASTE_LOG_MIN = 50;
const PASTE_LARGE_THRESHOLD = 200;
const TYPING_ANOMALY_CHARS = 300;
const TYPING_ANOMALY_WINDOW_MS = 5_000;

export function useAssignmentRiskMonitor(assignmentId?: string) {
  const [riskEvents, setRiskEvents] = useState<AssignmentRiskEvent[]>([]);
  const [showPasteWarning, setShowPasteWarning] = useState(false);
  const [lastPasteLength, setLastPasteLength] = useState(0);
  const [pendingPasteAcknowledgement, setPendingPasteAcknowledgement] = useState<{
    characterCount: number;
    occurredAt: string;
    pasteIndex: number;
  } | null>(null);
  const [lastPasteMeta, setLastPasteMeta] = useState<{
    characterCount: number;
    occurredAt: string;
    pasteIndex: number;
    isLarge: boolean;
  } | null>(null);
  const [showIntegrityReminder, setShowIntegrityReminder] = useState(false);
  const [integrityTrigger, setIntegrityTrigger] = useState("");

  const contentSnapshots = useRef<Array<{ at: number; length: number }>>([]);
  const pasteIndexRef = useRef(0);
  const lastPasteEventAtRef = useRef(0);

  const pushEvent = useCallback((event: AssignmentRiskEvent) => {
    const enriched = { ...event, assignment_id: assignmentId };
    setRiskEvents((prev) => [...prev, enriched]);
    void sendRiskEvent(enriched);
  }, [assignmentId]);

  const triggerIntegrityReminder = useCallback((trigger: string) => {
    setIntegrityTrigger(trigger);
    setShowIntegrityReminder(true);
  }, []);

  const handlePaste = useCallback((pastedText: string) => {
    const charCount = pastedText.length;
    const now = Date.now();
    const occurredAt = new Date(now).toISOString();
    pasteIndexRef.current += 1;
    const nextIndex = pasteIndexRef.current;

    setLastPasteLength(charCount);
    setLastPasteMeta({
      characterCount: charCount,
      occurredAt,
      pasteIndex: nextIndex,
      isLarge: charCount > PASTE_LARGE_THRESHOLD,
    });
    lastPasteEventAtRef.current = now;

    if (charCount < PASTE_LOG_MIN) return;

    if (charCount <= PASTE_LARGE_THRESHOLD) {
      pushEvent({
        type: "paste_detected",
        length: charCount,
        timestamp: now,
      });
      return;
    }

    setPendingPasteAcknowledgement({ characterCount: charCount, occurredAt, pasteIndex: nextIndex });
    setShowPasteWarning(true);
    triggerIntegrityReminder("large_paste_detected");
    pushEvent({
      type: "large_paste_detected",
      length: charCount,
      timestamp: now,
      severity_level: "MEDIUM",
    });
  }, [pushEvent, triggerIntegrityReminder]);

  const handleContentLength = useCallback((nextLength: number) => {
    const now = Date.now();
    contentSnapshots.current.push({ at: now, length: nextLength });
    contentSnapshots.current = contentSnapshots.current.filter((s) => now - s.at <= TYPING_ANOMALY_WINDOW_MS);

    if (contentSnapshots.current.length < 2) return;
    if (now - lastPasteEventAtRef.current < 1500) return;

    const oldest = contentSnapshots.current[0];
    const newest = contentSnapshots.current[contentSnapshots.current.length - 1];
    const charactersAdded = newest.length - oldest.length;
    const timeSeconds = Math.max(0.001, (newest.at - oldest.at) / 1000);
    if (charactersAdded <= TYPING_ANOMALY_CHARS || timeSeconds >= 5) return;

    pushEvent({
      type: "typing_anomaly",
      length: charactersAdded,
      timestamp: now,
      severity_level: "MEDIUM",
    });
    triggerIntegrityReminder("typing_anomaly");
    contentSnapshots.current = [];
  }, [pushEvent, triggerIntegrityReminder]);

  const acknowledgePasteWarning = useCallback(() => {
    if (pendingPasteAcknowledgement) {
      pushEvent({
        type: "paste_acknowledged",
        length: pendingPasteAcknowledgement.characterCount,
        timestamp: Date.now(),
      });
    }
    setPendingPasteAcknowledgement(null);
    setShowPasteWarning(false);
  }, [pendingPasteAcknowledgement, pushEvent]);

  const dismissIntegrityReminder = useCallback(() => {
    setShowIntegrityReminder(false);
  }, []);

  const handleExternalRiskEvent = useCallback(
    (event: AssignmentRiskEvent) => {
      if (event.type === "ai_domain_visit" && event.domain) {
        void reportDomainVisit({
          domain: event.domain,
          assignmentId: assignmentId,
          sessionId: event.session_id,
          processName: event.process_name,
        });

        triggerIntegrityReminder(event.type);
        setRiskEvents((prev) => [...prev, { ...event, assignment_id: assignmentId }]);
        return;
      }

      pushEvent(event);
      triggerIntegrityReminder(event.type);
    },
    [assignmentId, pushEvent, triggerIntegrityReminder],
  );

  return {
    riskEvents,
    showPasteWarning,
    lastPasteLength,
    pendingPasteAcknowledgement,
    lastPasteMeta,
    showIntegrityReminder,
    integrityTrigger,
    handlePaste,
    handleContentLength,
    handleExternalRiskEvent,
    acknowledgePasteWarning,
    dismissIntegrityReminder,
  };
}
