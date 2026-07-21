/**
 * Story 36.6: Tests for PricingCalculator constraint functions
 */
import { PricingCalculator } from '@/lib/pricing/pricing-calculator';
import { SeasonalPricingRule, PricingConstraints } from '@/types/pricing.types';

describe('PricingCalculator - Constraints', () => {
  describe('applyPricingConstraints', () => {
    it('should return price unchanged if within range', () => {
      const constraints: PricingConstraints = {
        min_nightly_price: 50,
        max_nightly_price: 150,
      };
      const result = PricingCalculator.applyPricingConstraints(100, constraints);
      expect(result.price).toBe(100);
      expect(result.constrained).toBe(false);
      expect(result.warning).toBeUndefined();
    });

    it('should constrain price to minimum', () => {
      const constraints: PricingConstraints = {
        min_nightly_price: 50,
      };
      const result = PricingCalculator.applyPricingConstraints(30, constraints);
      expect(result.price).toBe(50);
      expect(result.constrained).toBe(true);
      expect(result.warning).toContain('below minimum');
    });

    it('should constrain price to maximum', () => {
      const constraints: PricingConstraints = {
        max_nightly_price: 150,
      };
      const result = PricingCalculator.applyPricingConstraints(200, constraints);
      expect(result.price).toBe(150);
      expect(result.constrained).toBe(true);
      expect(result.warning).toContain('exceeds maximum');
    });

    it('should handle null/undefined constraints gracefully', () => {
      const constraints: PricingConstraints = {};
      const result = PricingCalculator.applyPricingConstraints(100, constraints);
      expect(result.price).toBe(100);
      expect(result.constrained).toBe(false);
    });

    it('should handle zero price with constraints', () => {
      const constraints: PricingConstraints = {
        min_nightly_price: 50,
      };
      const result = PricingCalculator.applyPricingConstraints(0, constraints);
      expect(result.price).toBe(50);
      expect(result.constrained).toBe(true);
    });
  });

  describe('isDateInSeasonalRule', () => {
    const rules: SeasonalPricingRule[] = [
      {
        id: '1',
        property_id: 'prop-1',
        name: 'Summer',
        date_start: '2026-06-01',
        date_end: '2026-08-31',
        price_per_night: 150,
        is_active: true,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    it('should return true if date is in active rule', () => {
      const result = PricingCalculator.isDateInSeasonalRule('2026-07-15', rules);
      expect(result).toBe(true);
    });

    it('should return false if date is outside rule range', () => {
      const result = PricingCalculator.isDateInSeasonalRule('2026-05-15', rules);
      expect(result).toBe(false);
    });

    it('should return false if rule is inactive', () => {
      const inactiveRules = [{ ...rules[0], is_active: false }];
      const result = PricingCalculator.isDateInSeasonalRule('2026-07-15', inactiveRules);
      expect(result).toBe(false);
    });

    it('should include start and end dates', () => {
      expect(PricingCalculator.isDateInSeasonalRule('2026-06-01', rules)).toBe(true);
      expect(PricingCalculator.isDateInSeasonalRule('2026-08-31', rules)).toBe(true);
    });
  });

  describe('getSeasonalRate', () => {
    const rules: SeasonalPricingRule[] = [
      {
        id: '1',
        property_id: 'prop-1',
        name: 'Summer',
        date_start: '2026-06-01',
        date_end: '2026-08-31',
        price_per_night: 150,
        is_active: true,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      {
        id: '2',
        property_id: 'prop-1',
        name: 'Winter',
        date_start: '2026-12-01',
        date_end: '2027-02-28',
        price_per_night: 80,
        is_active: true,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
    ];

    it('should return seasonal rate for matching date', () => {
      const rate = PricingCalculator.getSeasonalRate('2026-07-15', rules);
      expect(rate).toBe(150);
    });

    it('should return null if no matching rule', () => {
      const rate = PricingCalculator.getSeasonalRate('2026-05-15', rules);
      expect(rate).toBeNull();
    });

    it('should return null if rule is inactive', () => {
      const inactiveRules = [{ ...rules[0], is_active: false }];
      const rate = PricingCalculator.getSeasonalRate('2026-07-15', inactiveRules);
      expect(rate).toBeNull();
    });

    it('should handle multiple overlapping rules (first match wins)', () => {
      const overlappingRules = [
        { ...rules[0], id: '1', price_per_night: 150 },
        { ...rules[0], id: '2', price_per_night: 200 },
      ];
      const rate = PricingCalculator.getSeasonalRate('2026-07-15', overlappingRules);
      expect(rate).toBe(150); // First rule
    });
  });

  describe('validatePriceRange', () => {
    it('should validate correct range', () => {
      const result = PricingCalculator.validatePriceRange(50, 150);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject negative minimum', () => {
      const result = PricingCalculator.validatePriceRange(-10, 150);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('negative');
    });

    it('should reject negative maximum', () => {
      const result = PricingCalculator.validatePriceRange(50, -10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('negative');
    });

    it('should reject min > max', () => {
      const result = PricingCalculator.validatePriceRange(150, 50);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed');
    });

    it('should accept null/undefined values', () => {
      expect(PricingCalculator.validatePriceRange(null, null).valid).toBe(true);
      expect(PricingCalculator.validatePriceRange(undefined, undefined).valid).toBe(true);
      expect(PricingCalculator.validatePriceRange(50, null).valid).toBe(true);
      expect(PricingCalculator.validatePriceRange(null, 150).valid).toBe(true);
    });

    it('should accept equal min and max', () => {
      const result = PricingCalculator.validatePriceRange(100, 100);
      expect(result.valid).toBe(true);
    });
  });

  describe('detectOverlappingRules', () => {
    it('should detect overlapping date ranges', () => {
      const rules: SeasonalPricingRule[] = [
        {
          id: '1',
          property_id: 'prop-1',
          name: 'Rule 1',
          date_start: '2026-06-01',
          date_end: '2026-07-15',
          price_per_night: 100,
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
        {
          id: '2',
          property_id: 'prop-1',
          name: 'Rule 2',
          date_start: '2026-07-10',
          date_end: '2026-08-15',
          price_per_night: 150,
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ];

      const overlaps = PricingCalculator.detectOverlappingRules(rules);
      expect(overlaps).toHaveLength(1);
      expect(overlaps[0].rule1.id).toBe('1');
      expect(overlaps[0].rule2.id).toBe('2');
    });

    it('should not detect non-overlapping rules', () => {
      const rules: SeasonalPricingRule[] = [
        {
          id: '1',
          property_id: 'prop-1',
          name: 'Rule 1',
          date_start: '2026-06-01',
          date_end: '2026-07-15',
          price_per_night: 100,
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
        {
          id: '2',
          property_id: 'prop-1',
          name: 'Rule 2',
          date_start: '2026-08-01',
          date_end: '2026-09-15',
          price_per_night: 150,
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ];

      const overlaps = PricingCalculator.detectOverlappingRules(rules);
      expect(overlaps).toHaveLength(0);
    });

    it('should detect adjacent dates as non-overlapping', () => {
      const rules: SeasonalPricingRule[] = [
        {
          id: '1',
          property_id: 'prop-1',
          name: 'Rule 1',
          date_start: '2026-06-01',
          date_end: '2026-07-15',
          price_per_night: 100,
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
        {
          id: '2',
          property_id: 'prop-1',
          name: 'Rule 2',
          date_start: '2026-07-16',
          date_end: '2026-08-15',
          price_per_night: 150,
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ];

      const overlaps = PricingCalculator.detectOverlappingRules(rules);
      expect(overlaps).toHaveLength(0);
    });

    it('should handle edge case where rule contained in another', () => {
      const rules: SeasonalPricingRule[] = [
        {
          id: '1',
          property_id: 'prop-1',
          name: 'Rule 1',
          date_start: '2026-06-01',
          date_end: '2026-08-31',
          price_per_night: 100,
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
        {
          id: '2',
          property_id: 'prop-1',
          name: 'Rule 2',
          date_start: '2026-07-01',
          date_end: '2026-07-31',
          price_per_night: 150,
          is_active: true,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ];

      const overlaps = PricingCalculator.detectOverlappingRules(rules);
      expect(overlaps).toHaveLength(1);
    });
  });
});
