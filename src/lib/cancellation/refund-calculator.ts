/**
 * Refund Calculator (Story 37.4)
 * Determines refund percentage based on Airbnb cancellation policy model
 *
 * Input: Policy type, stay duration, days until check-in, whether during stay
 * Output: Refund percentage (0-100) + reasoning
 */

import {
  CancellationPolicyType,
  StayDuration,
  RefundCalculationInput,
  RefundCalculationResult,
  PropertyCancellationPolicy,
} from '@/types/cancellation.types';

/**
 * Calculate refund percentage based on cancellation policy
 *
 * @param input - Calculation parameters
 * @returns Refund percentage (0-100) and reason
 *
 * POLICY LOGIC (Airbnb exact):
 *
 * FLEXIBLE (short & long):
 *  - Until 1 day before check-in: 100% refund
 *  - 1 day before to 1 day after check-in: 50% refund
 *  - After 1 day into stay: 50% refund
 *
 * MODERATE (short & long):
 *  - Until 5 days before check-in: 100% refund
 *  - 5 days before to 5 days after check-in: 50% refund
 *  - After 5 days into stay: 50% refund
 *
 * LIMITED (short & long):
 *  - Until 14 days before check-in: 100% refund
 *  - 14 to 7 days before check-in: 50% refund
 *  - 7 days before or during stay: 0% refund
 *
 * FIRM (short & long):
 *  - Until 30 days before check-in: 100% refund
 *  - 30 to 7 days before check-in: 50% refund
 *  - 7 days before or during stay: 0% refund
 *
 * RIGID (long-stay only):
 *  - All periods: 0% refund (non-refundable)
 *
 * NON-REFUNDABLE (short-stay variant of Rigid):
 *  - All periods: 0% refund + -10% discount on rate
 */
export function calculateRefund(input: RefundCalculationInput): RefundCalculationResult {
  const {
    policy_type,
    stay_duration,
    days_until_checkin,
    during_stay,
    total_reservation_amount,
  } = input;

  let refund_percentage = 0;
  let reason = '';

  // Determine refund percentage based on policy
  switch (policy_type) {
    case 'flexible':
      refund_percentage = calculateFlexibleRefund(days_until_checkin, during_stay);
      reason = getFlexibleReason(days_until_checkin, during_stay);
      break;

    case 'moderate':
      refund_percentage = calculateModerateRefund(days_until_checkin, during_stay);
      reason = getModerateReason(days_until_checkin, during_stay);
      break;

    case 'limited':
      refund_percentage = calculateLimitedRefund(days_until_checkin, during_stay);
      reason = getLimitedReason(days_until_checkin, during_stay);
      break;

    case 'firm':
      refund_percentage = calculateFirmRefund(days_until_checkin, during_stay);
      reason = getFirmReason(days_until_checkin, during_stay);
      break;

    case 'rigid':
      refund_percentage = 0; // Rigid is always non-refundable
      reason = 'Rígida de longa duração: Não reembolsável';
      break;

    default:
      throw new Error(`Unknown policy type: ${policy_type}`);
  }

  // Clamp to 0-100
  refund_percentage = Math.max(0, Math.min(100, refund_percentage));

  return {
    refund_percentage,
    refund_amount: Math.round((total_reservation_amount * refund_percentage) / 100 * 100) / 100,
    reason,
    policy_type,
    stay_duration,
  };
}

// ==============================================================================
// FLEXIBLE POLICY
// ==============================================================================

function calculateFlexibleRefund(days_until_checkin: number, during_stay: boolean): number {
  // Until 1 day before check-in: 100% refund
  if (days_until_checkin > 1) return 100;

  // 1 day before to 1 day after check-in, or during stay: 50% refund
  return 50;
}

function getFlexibleReason(days_until_checkin: number, during_stay: boolean): string {
  if (days_until_checkin > 1) {
    return `Flexível: Reembolso integral (${days_until_checkin} dias antes do check-in)`;
  }
  if (during_stay) {
    return 'Flexível: Reembolso parcial (50%) - cancelamento durante a estadia';
  }
  return `Flexível: Reembolso parcial (50%) - ${Math.max(0, days_until_checkin)} dia(s) antes do check-in`;
}

// ==============================================================================
// MODERATE POLICY
// ==============================================================================

function calculateModerateRefund(days_until_checkin: number, during_stay: boolean): number {
  // Until 5 days before check-in: 100% refund
  if (days_until_checkin > 5) return 100;

  // 5 days before to 5 days after check-in, or during stay: 50% refund
  return 50;
}

function getModerateReason(days_until_checkin: number, during_stay: boolean): string {
  if (days_until_checkin > 5) {
    return `Moderada: Reembolso integral (${days_until_checkin} dias antes do check-in)`;
  }
  if (during_stay) {
    return 'Moderada: Reembolso parcial (50%) - cancelamento durante a estadia';
  }
  return `Moderada: Reembolso parcial (50%) - ${Math.max(0, days_until_checkin)} dia(s) antes do check-in`;
}

// ==============================================================================
// LIMITED POLICY
// ==============================================================================

function calculateLimitedRefund(days_until_checkin: number, during_stay: boolean): number {
  // Until 14 days before check-in: 100% refund
  if (days_until_checkin > 14) return 100;

  // 14 to 7 days before check-in: 50% refund
  if (days_until_checkin >= 7) return 50;

  // Less than 7 days before or during stay: 0% refund
  return 0;
}

function getLimitedReason(days_until_checkin: number, during_stay: boolean): string {
  if (days_until_checkin > 14) {
    return `Limitada: Reembolso integral (${days_until_checkin} dias antes do check-in)`;
  }
  if (days_until_checkin > 7) {
    return `Limitada: Reembolso parcial (50%) - ${days_until_checkin} dias antes do check-in`;
  }
  if (during_stay) {
    return 'Limitada: Sem reembolso - cancelamento durante a estadia';
  }
  return `Limitada: Sem reembolso - ${Math.max(0, days_until_checkin)} dia(s) antes do check-in`;
}

// ==============================================================================
// FIRM POLICY
// ==============================================================================

function calculateFirmRefund(days_until_checkin: number, during_stay: boolean): number {
  // Until 30 days before check-in: 100% refund
  if (days_until_checkin > 30) return 100;

  // 30 to 7 days before check-in: 50% refund
  if (days_until_checkin >= 7) return 50;

  // Less than 7 days before or during stay: 0% refund
  return 0;
}

function getFirmReason(days_until_checkin: number, during_stay: boolean): string {
  if (days_until_checkin > 30) {
    return `Firme: Reembolso integral (${days_until_checkin} dias antes do check-in)`;
  }
  if (days_until_checkin > 7) {
    return `Firme: Reembolso parcial (50%) - ${days_until_checkin} dias antes do check-in`;
  }
  if (during_stay) {
    return 'Firme: Sem reembolso - cancelamento durante a estadia';
  }
  return `Firme: Sem reembolso - ${Math.max(0, days_until_checkin)} dia(s) antes do check-in`;
}

// ==============================================================================
// HELPER: Calculate days until check-in
// ==============================================================================

export function calculateDaysUntilCheckIn(checkInDate: Date): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const checkIn = new Date(checkInDate);
  checkIn.setUTCHours(0, 0, 0, 0);

  const diffMs = checkIn.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

// ==============================================================================
// HELPER: Determine if cancellation is during stay
// ==============================================================================

export function isDuringStay(checkInDate: Date, checkOutDate: Date): boolean {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const checkIn = new Date(checkInDate);
  checkIn.setUTCHours(0, 0, 0, 0);

  const checkOut = new Date(checkOutDate);
  checkOut.setUTCHours(0, 0, 0, 0);

  return today >= checkIn && today < checkOut;
}

// ==============================================================================
// HELPER: Determine stay duration (short vs long)
// ==============================================================================

export function determineStayDuration(checkInDate: Date, checkOutDate: Date): 'short' | 'long' {
  const checkIn = new Date(checkInDate);
  checkIn.setUTCHours(0, 0, 0, 0);

  const checkOut = new Date(checkOutDate);
  checkOut.setUTCHours(0, 0, 0, 0);

  const diffMs = checkOut.getTime() - checkIn.getTime();
  const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return nights >= 28 ? 'long' : 'short';
}

// ==============================================================================
// INTEGRATION HELPER: Calculate refund for a reservation
// ==============================================================================

export function calculateRefundForReservation(
  policy: PropertyCancellationPolicy,
  checkInDate: Date,
  checkOutDate: Date,
  totalAmount: number
): RefundCalculationResult {
  const daysUntilCheckIn = calculateDaysUntilCheckIn(checkInDate);
  const during_stay = isDuringStay(checkInDate, checkOutDate);
  const stayDuration = determineStayDuration(checkInDate, checkOutDate);

  return calculateRefund({
    policy_type: policy.policy_type,
    stay_duration: stayDuration,
    days_until_checkin: daysUntilCheckIn,
    during_stay,
    total_reservation_amount: totalAmount,
  });
}
