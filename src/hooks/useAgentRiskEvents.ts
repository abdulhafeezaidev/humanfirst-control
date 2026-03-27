import { useEffect, useRef } from "react";
import type { AssignmentRiskEvent } from "@/types/assignmentRisk";

/**
 * Subscribes to AI-risk alerts forwarded by the Electron main process
 * (e.g. when the Windows agent detects an AI domain visit).
 *
 * Only active inside the Electron desktop app — a no-op in the browser.
 */
export function useAgentRiskEvents(
  onEvent: (event: AssignmentRiskEvent) => void,
) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    const desktop = window.humanfirstDesktop;
    if (!desktop?.isDesktop || typeof desktop.onRiskAlert !== "function") {
      return;
    }

    const unsubscribe = desktop.onRiskAlert((event) => {
      callbackRef.current(event as AssignmentRiskEvent);
    });

    return unsubscribe;
  }, []);
}
