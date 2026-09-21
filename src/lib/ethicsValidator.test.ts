import { describe, it, expect } from 'vitest';
import {
  ETHICAL_CONSTRAINTS,
  validateMechanismCompliance,
  isEventTypeAllowed,
  validateEventLanguage,
  generateEthicsAuditReport,
  getConstraintDescription
} from './ethicsValidator';

describe('Ethics Validator', () => {
  describe('validateMechanismCompliance', () => {
    it('passes compliant code', () => {
      const code = `
        function detectBlur() {
          window.addEventListener('blur', () => logEvent('app_backgrounded'));
        }
      `;
      const results = validateMechanismCompliance(code, 'Test Mechanism', [
        ETHICAL_CONSTRAINTS.NO_CONTENT_READING,
        ETHICAL_CONSTRAINTS.NO_KEYSTROKE_LOGGING
      ]);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.valid)).toBe(true);
    });

    it('fails when forbidden patterns are found', () => {
      const forbiddenCode = `
        function trackUser() {
          document.addEventListener('keydown', (e) => log(e.key));
          const text = document.body.innerText;
        }
      `;
      const results = validateMechanismCompliance(forbiddenCode, 'Malicious Mechanism', [
        ETHICAL_CONSTRAINTS.NO_KEYSTROKE_LOGGING,
        ETHICAL_CONSTRAINTS.NO_CONTENT_READING
      ]);

      const keydownViolation = results.find(r => r.constraint === ETHICAL_CONSTRAINTS.NO_KEYSTROKE_LOGGING);
      const readingViolation = results.find(r => r.constraint === ETHICAL_CONSTRAINTS.NO_CONTENT_READING);

      expect(keydownViolation?.valid).toBe(false);
      expect(keydownViolation?.reason).toContain('keydown');
      
      expect(readingViolation?.valid).toBe(false);
      expect(readingViolation?.reason).toContain('innerText');
    });
  });

  describe('isEventTypeAllowed', () => {
    it('returns true for allowed events', () => {
      expect(isEventTypeAllowed('app_backgrounded')).toBe(true);
      expect(isEventTypeAllowed('network_disconnected')).toBe(true);
    });

    it('returns false for unknown events', () => {
      expect(isEventTypeAllowed('user_cheated_on_test')).toBe(false);
    });
  });

  describe('validateEventLanguage', () => {
    it('validates neutral terminology', () => {
      const result = validateEventLanguage('focus_lost_event');
      expect(result.valid).toBe(true);
    });

    it('flags accusatory terminology and suggests alternatives', () => {
      const cheatResult = validateEventLanguage('cheating_detected');
      expect(cheatResult.valid).toBe(false);
      expect(cheatResult.suggestion).toBe('focus_integrity_event');

      const suspiciousResult = validateEventLanguage('suspicious_activity');
      expect(suspiciousResult.valid).toBe(false);
      expect(suspiciousResult.suggestion).toBe('focus_signal');
    });
  });

  describe('generateEthicsAuditReport', () => {
    it('generates a complete compliant report for v1.0 mechanisms', () => {
      const report = generateEthicsAuditReport();
      expect(report.allPassed).toBe(true);
      expect(report.summary.failed).toBe(0);
      expect(report.results.length).toBeGreaterThan(0);
      expect(report.version).toBe('1.0.0');
    });
  });

  describe('getConstraintDescription', () => {
    it('returns correct descriptions', () => {
      expect(getConstraintDescription(ETHICAL_CONSTRAINTS.NO_KEYSTROKE_LOGGING))
        .toContain('Never records keystrokes');
      expect(getConstraintDescription('invalid_constraint' as any))
        .toBe('Unknown constraint');
    });
  });
});
