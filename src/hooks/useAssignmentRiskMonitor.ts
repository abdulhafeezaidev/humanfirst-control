import { useCallback, useRef, useState } from "react";
import type { AssignmentRiskEvent } from "@/types/assignmentRisk";
import { reportDomainVisit, sendRiskEvent } from "@/lib/assignmentRiskApi";

const LARGE_PASTE_LOG_THRESHOLD = 200;     // Log all pastes > 200 chars
const LARGE_PASTE_WARNING_THRESHOLD = 500; // Show warning popup for pastes > 500 chars
const SUSPICIOUS_CHAR_THRESHOLD = 300;
const SUSPICIOUS_TIME_WINDOW_MS = 2_000;

/**
 * Tracks typing speed and paste events in an assignment editor.
 * Produces risk events without blocking user input.
 * 
 * Layer 4 - PASTE DETECTION:
 * - Log all pastes > 200 characters (character count only, never content)
 * - Show warning popup for pastes > 500 characters
 * - No blocking - friction only
 */
export function useAssignmentRiskMonitor(assignmentId?: string) {
  const [riskEvents, setRiskEvents] = useState<AssignmentRiskEvent[]>([]);
  const [showPasteWarning, setShowPasteWarning] = useState(false);
  const [lastPasteLength, setLastPasteLength] = useState(0);
  const [showIntegrityReminder, setShowIntegrityReminder] = useState(false);
  const [integrityTrigger, setIntegrityTrigger] = useState("");

  // Keystroke tracking for suspicious insert detection
  const keystrokeBuffer = useRef<number[]>([]);

  const pushEvent = useCallback((event: AssignmentRiskEvent) => {
    const enriched = { ...event, assignment_id: assignmentId };
    setRiskEvents((prev) => [...prev, enriched]);
    sendRiskEvent(enriched);
  }, [assignmentId]);

  /** Show the integrity reminder modal for a given trigger event type. */
  const triggerIntegrityReminder = useCallback((trigger: string) => {
    setIntegrityTrigger(trigger);
    setShowIntegrityReminder(true);
  }, []);

  /**
   * Call from the editor's paste handler.
   * Returns true if the paste is large (caller may show friction modal).
   * 
   * Specification compliance:
   * - Log event for pastes > 200 characters
   * - Show warning popup for pastes > 500 characters
   */
  const handlePaste = useCallback(
    (pastedText: string): boolean => {
      const charCount = pastedText.length;

      // Log all large pastes (> 200 chars)
      if (charCount > LARGE_PASTE_LOG_THRESHOLD) {
        const event: AssignmentRiskEvent = {
          type: "editor_large_paste",
          length: charCount,
          timestamp: Date.now(),
        };
        pushEvent(event);
        setLastPasteLength(charCount);

        // Show warning popup for very large pastes (> 500 chars)
        if (charCount > LARGE_PASTE_WARNING_THRESHOLD) {
          setShowPasteWarning(true);
          triggerIntegrityReminder("editor_large_paste");
        }

        return charCount > LARGE_PASTE_WARNING_THRESHOLD;
      }
      return false;
    },
    [pushEvent, triggerIntegrityReminder],
  );

  /**
   * Call on every keydown/input in the editor.
   * Internally tracks characters-per-window for suspicious insert detection.
   */
  const handleKeystroke = useCallback(
    (charsInserted: number = 1) => {
      const now = Date.now();
      // Add entries for every character inserted
      for (let i = 0; i < charsInserted; i++) {
        keystrokeBuffer.current.push(now);
      }

      // Evict entries older than the time window
      const cutoff = now - SUSPICIOUS_TIME_WINDOW_MS;
      keystrokeBuffer.current = keystrokeBuffer.current.filter((t) => t >= cutoff);

      if (keystrokeBuffer.current.length > SUSPICIOUS_CHAR_THRESHOLD) {
        const event: AssignmentRiskEvent = {
          type: "suspicious_insert",
          length: keystrokeBuffer.current.length,
          timestamp: now,
        };
        pushEvent(event);
        triggerIntegrityReminder("suspicious_insert");
        // Reset buffer so we don't fire repeatedly for the same burst
        keystrokeBuffer.current = [];
      }
    },
    [pushEvent],
  );

  const dismissPasteWarning = useCallback(() => {
    setShowPasteWarning(false);
  }, []);

  const dismissIntegrityReminder = useCallback(() => {
    setShowIntegrityReminder(false);
  }, []);

  /** Handle an externally-received risk event (e.g. from the agent via IPC). */
  const handleExternalRiskEvent = useCallback(
    (event: AssignmentRiskEvent) => {
      if (event.type === "ai_domain_visit" && event.domain) {
        // Unknown domains are verified server-side before they are scored as AI usage.
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
    showIntegrityReminder,
    integrityTrigger,
    handlePaste,
    handleKeystroke,
    handleExternalRiskEvent,
    dismissPasteWarning,
    dismissIntegrityReminder,
  };
}
