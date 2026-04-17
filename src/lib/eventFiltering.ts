/**
 * Event Filtering Utility
 * 
 * Applies the lean violation-only logging rule across the app.
 * Only these event types are stored to Supabase:
 */

const STORABLE_EVENT_TYPES = new Set([
  'session_start',
  'session_end',
  'assignment_submitted',
  'blocked_app_killed',
  'blocked_domain_attempt',
  'large_paste_detected',
  'paste_detected',
  'typing_anomaly',
  'paste_acknowledged',
  'app_focus_lost',
  'tamper_attempt',
  'external_browser_attempt',
]);

/**
 * Check if an event type should be stored
 * @param eventType - The event type to check
 * @returns true if the event should be stored to Supabase
 */
export function isStorableEvent(eventType: string | null | undefined): boolean {
  if (!eventType) return false;
  return STORABLE_EVENT_TYPES.has(eventType);
}

/**
 * Filter an array of events to only storable ones
 */
export function filterStorableEvents<T extends { event_type?: string }>(
  events: T[]
): T[] {
  return events.filter((e) => isStorableEvent(e.event_type));
}

/**
 * Get a human-readable list of storable event types
 */
export function getStorableEventTypes(): string[] {
  return Array.from(STORABLE_EVENT_TYPES).sort();
}

/**
 * Validate an event object before storing
 */
export function validateStorableEvent(event: {
  event_type?: string;
  occurred_at?: string | Date;
  metadata?: Record<string, any>;
}): {
  valid: boolean;
  reason?: string;
} {
  if (!event.event_type) {
    return { valid: false, reason: 'event_type is required' };
  }

  if (!isStorableEvent(event.event_type)) {
    return {
      valid: false,
      reason: `event_type "${event.event_type}" is not in the storable events list`,
    };
  }

  return { valid: true };
}
