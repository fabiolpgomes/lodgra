/**
 * Refund Calculator Tests (Story 37.4)
 * Validate all Airbnb cancellation policy scenarios
 */

import {
  calculateRefund,
  calculateDaysUntilCheckIn,
  isDuringStay,
  determineStayDuration,
} from '@/lib/cancellation/refund-calculator';
import { RefundCalculationInput } from '@/types/cancellation.types';

describe('Refund Calculator', () => {
  const baseAmount = 500; // EUR for calculations

  // ==============================================================================
  // HELPER TESTS
  // ==============================================================================

  describe('calculateDaysUntilCheckIn', () => {
    it('should return correct days for future check-in', () => {
      const today = new Date();
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + 10);

      const days = calculateDaysUntilCheckIn(checkIn);
      expect(days).toBe(10);
    });

    it('should return 0 for today check-in', () => {
      const today = new Date();
      const days = calculateDaysUntilCheckIn(today);
      expect(days).toBe(0);
    });

    it('should return negative for past check-in', () => {
      const today = new Date();
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() - 5);

      const days = calculateDaysUntilCheckIn(checkIn);
      expect(days).toBeLessThan(0);
    });
  });

  describe('isDuringStay', () => {
    it('should return true if cancellation is during stay', () => {
      const today = new Date();
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() - 1); // Yesterday
      const checkOut = new Date(today);
      checkOut.setDate(checkOut.getDate() + 5); // 5 days from now

      const during = isDuringStay(checkIn, checkOut);
      expect(during).toBe(true);
    });

    it('should return false if cancellation is before check-in', () => {
      const today = new Date();
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + 5); // 5 days from now
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 3);

      const during = isDuringStay(checkIn, checkOut);
      expect(during).toBe(false);
    });

    it('should return false if cancellation is after check-out', () => {
      const today = new Date();
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() - 10);
      const checkOut = new Date(today);
      checkOut.setDate(checkOut.getDate() - 5);

      const during = isDuringStay(checkIn, checkOut);
      expect(during).toBe(false);
    });
  });

  describe('determineStayDuration', () => {
    it('should return "short" for <28 nights', () => {
      const checkIn = new Date();
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 7); // 7 nights

      const duration = determineStayDuration(checkIn, checkOut);
      expect(duration).toBe('short');
    });

    it('should return "long" for 28+ nights', () => {
      const checkIn = new Date();
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 28); // 28 nights

      const duration = determineStayDuration(checkIn, checkOut);
      expect(duration).toBe('long');
    });

    it('should return "long" for 30+ nights', () => {
      const checkIn = new Date();
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 30); // 30 nights

      const duration = determineStayDuration(checkIn, checkOut);
      expect(duration).toBe('long');
    });
  });

  // ==============================================================================
  // FLEXIBLE POLICY TESTS
  // ==============================================================================

  describe('Flexible Policy', () => {
    it('should return 100% refund 2+ days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 2,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(100);
      expect(result.refund_amount).toBe(baseAmount);
    });

    it('should return 50% refund 1 day before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 1,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(50);
      expect(result.refund_amount).toBe(baseAmount * 0.5);
    });

    it('should return 50% refund on day of check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 0,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(50);
    });

    it('should return 50% refund during stay', () => {
      const input: RefundCalculationInput = {
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: -2,
        during_stay: true,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(50);
    });
  });

  // ==============================================================================
  // MODERATE POLICY TESTS
  // ==============================================================================

  describe('Moderate Policy', () => {
    it('should return 100% refund 6+ days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: 6,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(100);
    });

    it('should return 50% refund 5 days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: 5,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(50);
    });

    it('should return 50% refund 4 days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: 4,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(50);
    });

    it('should return 50% refund during stay', () => {
      const input: RefundCalculationInput = {
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: -1,
        during_stay: true,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(50);
    });
  });

  // ==============================================================================
  // LIMITED POLICY TESTS
  // ==============================================================================

  describe('Limited Policy', () => {
    it('should return 100% refund 15+ days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'limited',
        stay_duration: 'short',
        days_until_checkin: 15,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(100);
    });

    it('should return 50% refund 14 days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'limited',
        stay_duration: 'short',
        days_until_checkin: 14,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(50);
    });

    it('should return 50% refund 7 days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'limited',
        stay_duration: 'short',
        days_until_checkin: 7,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(50);
    });

    it('should return 0% refund 6 days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'limited',
        stay_duration: 'short',
        days_until_checkin: 6,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(0);
    });

    it('should return 0% refund during stay', () => {
      const input: RefundCalculationInput = {
        policy_type: 'limited',
        stay_duration: 'short',
        days_until_checkin: -2,
        during_stay: true,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(0);
    });
  });

  // ==============================================================================
  // FIRM POLICY TESTS
  // ==============================================================================

  describe('Firm Policy', () => {
    it('should return 100% refund 31+ days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 31,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(100);
    });

    it('should return 50% refund 30 days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 30,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(50);
    });

    it('should return 50% refund 7 days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 7,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(50);
    });

    it('should return 0% refund 6 days before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 6,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(0);
    });

    it('should return 0% refund during stay', () => {
      const input: RefundCalculationInput = {
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: -5,
        during_stay: true,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(0);
    });
  });

  // ==============================================================================
  // RIGID POLICY TESTS
  // ==============================================================================

  describe('Rigid Policy', () => {
    it('should return 0% refund always (long-stay)', () => {
      const input: RefundCalculationInput = {
        policy_type: 'rigid',
        stay_duration: 'long',
        days_until_checkin: 45,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(0);
      expect(result.refund_amount).toBe(0);
    });

    it('should return 0% refund even 1 day before check-in', () => {
      const input: RefundCalculationInput = {
        policy_type: 'rigid',
        stay_duration: 'long',
        days_until_checkin: 1,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(0);
    });

    it('should return 0% refund during stay', () => {
      const input: RefundCalculationInput = {
        policy_type: 'rigid',
        stay_duration: 'long',
        days_until_checkin: -15,
        during_stay: true,
        total_reservation_amount: baseAmount,
      };

      const result = calculateRefund(input);
      expect(result.refund_percentage).toBe(0);
    });
  });

  // ==============================================================================
  // EDGE CASES & AMOUNTS
  // ==============================================================================

  describe('Refund Amount Calculations', () => {
    it('should calculate correct EUR amount for 100% refund', () => {
      const input: RefundCalculationInput = {
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 10,
        during_stay: false,
        total_reservation_amount: 1250,
      };

      const result = calculateRefund(input);
      expect(result.refund_amount).toBe(1250);
    });

    it('should calculate correct EUR amount for 50% refund', () => {
      const input: RefundCalculationInput = {
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 0,
        during_stay: false,
        total_reservation_amount: 1000,
      };

      const result = calculateRefund(input);
      expect(result.refund_amount).toBe(500);
    });

    it('should calculate correct EUR amount for 0% refund', () => {
      const input: RefundCalculationInput = {
        policy_type: 'rigid',
        stay_duration: 'long',
        days_until_checkin: 5,
        during_stay: false,
        total_reservation_amount: 2500,
      };

      const result = calculateRefund(input);
      expect(result.refund_amount).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const input: RefundCalculationInput = {
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: 3,
        during_stay: false,
        total_reservation_amount: 333.33,
      };

      const result = calculateRefund(input);
      expect(result.refund_amount).toBe(166.67); // 50% of 333.33
    });
  });

  // ==============================================================================
  // BOTH SHORT & LONG STAY
  // ==============================================================================

  describe('Long-stay policies (28+ nights)', () => {
    it('should apply same logic for flexible policy', () => {
      const short_input: RefundCalculationInput = {
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 1,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const long_input: RefundCalculationInput = {
        policy_type: 'flexible',
        stay_duration: 'long',
        days_until_checkin: 1,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const short_result = calculateRefund(short_input);
      const long_result = calculateRefund(long_input);

      expect(short_result.refund_percentage).toBe(long_result.refund_percentage);
    });

    it('should apply same logic for moderate policy', () => {
      const short_input: RefundCalculationInput = {
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: 4,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const long_input: RefundCalculationInput = {
        policy_type: 'moderate',
        stay_duration: 'long',
        days_until_checkin: 4,
        during_stay: false,
        total_reservation_amount: baseAmount,
      };

      const short_result = calculateRefund(short_input);
      const long_result = calculateRefund(long_input);

      expect(short_result.refund_percentage).toBe(long_result.refund_percentage);
    });
  });
});
