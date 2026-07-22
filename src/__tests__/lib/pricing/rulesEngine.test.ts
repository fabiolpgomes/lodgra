/**
 * Story 36.11: Rules Engine Tests
 */

import {
  evaluateRule,
  applyRuleAction,
  calculateFinalPrice,
  enforceGuardrails,
  validateRule,
} from '@/lib/pricing/rulesEngine';
import { PricingRule, PriceGuardrails } from '@/types/pricing';

describe('rulesEngine', () => {
  const mockContext = {
    occupancy_rate: 80,
    days_until_full: 5,
    season: 'peak' as const,
    day_of_week: 5,
    days_until_checkin: 10,
    base_price: 100,
  };

  const mockGuardrails: PriceGuardrails = {
    property_id: 'prop-1',
    min_price: 50,
    max_price: 200,
  };

  describe('evaluateRule', () => {
    it('should evaluate occupancy condition', () => {
      const condition = {
        type: 'occupancy' as const,
        operator: '>=',
        value: 80,
      };
      expect(evaluateRule(condition, mockContext)).toBe(true);
    });

    it('should evaluate season condition', () => {
      const condition = {
        type: 'season' as const,
        operator: '=',
        value: 'peak',
      };
      expect(evaluateRule(condition, mockContext)).toBe(true);
    });

    it('should return false for unmet condition', () => {
      const condition = {
        type: 'occupancy' as const,
        operator: '>=',
        value: 90,
      };
      expect(evaluateRule(condition, mockContext)).toBe(false);
    });
  });

  describe('applyRuleAction', () => {
    it('should increase price by percent', () => {
      const action = { type: 'increase_percent' as const, value: 10 };
      expect(applyRuleAction(100, action)).toBe(110);
    });

    it('should decrease price by percent', () => {
      const action = { type: 'decrease_percent' as const, value: 10 };
      expect(applyRuleAction(100, action)).toBe(90);
    });

    it('should set fixed price', () => {
      const action = { type: 'set_price' as const, value: 150 };
      expect(applyRuleAction(100, action)).toBe(150);
    });
  });

  describe('enforceGuardrails', () => {
    it('should enforce minimum price', () => {
      expect(enforceGuardrails(40, mockGuardrails)).toBe(50);
    });

    it('should enforce maximum price', () => {
      expect(enforceGuardrails(250, mockGuardrails)).toBe(200);
    });

    it('should allow price within range', () => {
      expect(enforceGuardrails(100, mockGuardrails)).toBe(100);
    });
  });

  describe('validateRule', () => {
    const validRule: PricingRule = {
      id: 'rule-1',
      property_id: 'prop-1',
      name: 'Test Rule',
      enabled: true,
      priority: 1,
      condition: { type: 'occupancy', operator: '>=', value: 80 },
      action: { type: 'increase_percent', value: 10 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('should validate correct rule', () => {
      const result = validateRule(validRule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject rule without name', () => {
      const invalid = { ...validRule, name: '' };
      const result = validateRule(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
