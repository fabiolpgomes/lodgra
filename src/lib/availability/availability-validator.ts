import { daysBetweenDateOnly, todayInTimeZone } from '@/lib/dates/date-only'
/**
 * Epic 43: Availability Validator
 *
 * Validates reservation against property availability rules:
 * - Minimum nights
 * - Maximum nights
 * - Advance notice requirement
 * - Availability window (3-24 months ahead)
 * - Last-minute booking allowance
 */

export interface AvailabilityRules {
  minNights: number
  maxNights: number
  advanceNoticeDays: number
  allowLastMinuteBookings: boolean
  availabilityWindowMonths: number
  allowBookingsBeyondWindow: boolean
}

export interface ValidationResult {
  isValid: boolean
  requiresApproval: boolean
  reason?: string
  violations: string[]
}

export class AvailabilityValidator {
  /**
   * Validate reservation against availability rules
   *
   * @param checkIn - ISO date of check-in
   * @param checkOut - ISO date of check-out
   * @param rules - Availability rules for property
   * @returns Validation result with approval requirement
   */
  static validate(
    checkIn: string,
    checkOut: string,
    rules: AvailabilityRules,
    today: string = todayInTimeZone()
  ): ValidationResult {
    const violations: string[] = []
    let requiresApproval = false

    // Parse dates
    // Todas as contas em dias de calendário ('YYYY-MM-DD'), sem fuso nem DST.
    const nights = daysBetweenDateOnly(checkIn, checkOut)
    const daysUntilCheckIn = daysBetweenDateOnly(today, checkIn)

    // 1. Validate minimum nights
    if (nights < rules.minNights) {
      violations.push(
        `Mínimo de ${rules.minNights} noite${rules.minNights !== 1 ? 's' : ''} requerido (você solicitou ${nights})`
      )
    }

    // 2. Validate maximum nights
    if (nights > rules.maxNights) {
      violations.push(
        `Máximo de ${rules.maxNights} noites permitido (você solicitou ${nights})`
      )
    }

    // 3. Validate advance notice
    if (daysUntilCheckIn < rules.advanceNoticeDays) {
      if (daysUntilCheckIn < 1 && !rules.allowLastMinuteBookings) {
        // Less than 1 day notice
        violations.push('Reserva marcada para menos de 1 dia')
        requiresApproval = true
      } else if (!rules.allowLastMinuteBookings) {
        // Not enough notice
        violations.push(
          `Aviso prévio de ${rules.advanceNoticeDays} dia${rules.advanceNoticeDays !== 1 ? 's' : ''} requerido (você tem ${daysUntilCheckIn})`
        )
      }
    }

    // 4. Validate availability window
    const monthsAhead = this.getMonthsAhead(checkIn, today)
    if (monthsAhead > rules.availabilityWindowMonths) {
      violations.push(
        `Propriedade disponível por ${rules.availabilityWindowMonths} meses (você está tentando ${monthsAhead} meses adiante)`
      )
      if (!rules.allowBookingsBeyondWindow) {
        requiresApproval = true
      }
    }

    // Determine final validity
    const isValid = violations.length === 0

    return {
      isValid,
      requiresApproval: requiresApproval && isValid === false,
      reason: violations[0], // Primary violation
      violations,
    }
  }

  /**
   * Check if last-minute booking is allowed
   */
  static isLastMinuteAllowed(
    checkIn: string,
    rules: AvailabilityRules,
    today: string = todayInTimeZone()
  ): boolean {
    const daysUntilCheckIn = daysBetweenDateOnly(today, checkIn)

    return daysUntilCheckIn < 1 ? rules.allowLastMinuteBookings : true
  }

  /**
   * Get number of months from today to target date
   */
  private static getMonthsAhead(targetDate: string, today: string): number {
    const months =
      (Number(targetDate.slice(0, 4)) - Number(today.slice(0, 4))) * 12 +
      (Number(targetDate.slice(5, 7)) - Number(today.slice(5, 7)))
    return Math.max(0, months)
  }

  /**
   * Format availability window options
   */
  static getWindowOptions(): Array<{ value: number; label: string }> {
    return [
      { value: 3, label: '3 meses' },
      { value: 6, label: '6 meses' },
      { value: 9, label: '9 meses' },
      { value: 12, label: '12 meses' },
      { value: 24, label: '24 meses' },
    ]
  }

  /**
   * Format notice days options
   */
  static getNoticeDaysOptions(): Array<{ value: number; label: string }> {
    return [
      { value: 0, label: 'Mesmo dia' },
      { value: 1, label: '1 dia' },
      { value: 2, label: '2 dias' },
      { value: 7, label: '7 dias' },
    ]
  }
}
