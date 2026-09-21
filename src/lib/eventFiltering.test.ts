import { describe, it, expect } from 'vitest';
import { 
  isStorableEvent, 
  filterStorableEvents, 
  getStorableEventTypes, 
  validateStorableEvent 
} from './eventFiltering';

describe('Event Filtering', () => {
  describe('isStorableEvent', () => {
    it('returns true for valid events', () => {
      expect(isStorableEvent('session_start')).toBe(true);
      expect(isStorableEvent('tamper_attempt')).toBe(true);
      expect(isStorableEvent('large_paste_detected')).toBe(true);
    });

    it('returns false for invalid or benign events', () => {
      expect(isStorableEvent('mouse_move')).toBe(false);
      expect(isStorableEvent('window_resize')).toBe(false);
      expect(isStorableEvent('key_press')).toBe(false);
    });

    it('handles null or undefined gracefully', () => {
      expect(isStorableEvent(null)).toBe(false);
      expect(isStorableEvent(undefined)).toBe(false);
      expect(isStorableEvent('')).toBe(false);
    });
  });

  describe('filterStorableEvents', () => {
    it('filters out non-storable events from an array', () => {
      const events = [
        { event_type: 'session_start', id: 1 },
        { event_type: 'mouse_move', id: 2 },
        { event_type: 'tamper_attempt', id: 3 },
        { event_type: 'key_press', id: 4 }
      ];

      const result = filterStorableEvents(events);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });
  });

  describe('validateStorableEvent', () => {
    it('returns valid for correct events', () => {
      const result = validateStorableEvent({ event_type: 'app_focus_lost' });
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('returns invalid when event_type is missing', () => {
      const result = validateStorableEvent({});
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('event_type is required');
    });

    it('returns invalid for non-storable event types', () => {
      const result = validateStorableEvent({ event_type: 'keystroke_logged' });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('is not in the storable events list');
    });
  });
});
