import { ExtractionResult } from './extraction.schema'

export interface ValidationResult {
  valid: boolean
  confidence: number
  issues: ValidationIssue[]
}

export interface ValidationIssue {
  field: string
  severity: 'error' | 'warning'
  message: string
  value?: unknown
}

/**
 * AC4: Deterministic validation rules post-LLM
 * Rule 1: Reject check_out <= check_in
 * Rule 2: Reduce confidence if total_value diverges >3× from historical ADR
 * Rule 3: Allow empty/generic name but mark incomplete
 */
export function validateExtraction(
  extraction: ExtractionResult,
  propertyHistoricalAdr?: { adultNights: number; avgRate: number }
): ValidationResult {
  const issues: ValidationIssue[] = []
  let confidence = extraction.confidence || 0

  if (!extraction.success || !extraction.data) {
    return {
      valid: false,
      confidence: 0,
      issues: [{ field: 'extraction', severity: 'error', message: 'Extraction failed' }],
    }
  }

  const data = extraction.data

  // RULE 1: Reject check_out <= check_in
  if (data.check_out && data.check_in) {
    const checkIn = new Date(data.check_in)
    const checkOut = new Date(data.check_out)

    if (checkOut <= checkIn) {
      issues.push({
        field: 'dates',
        severity: 'error',
        message: `check_out (${data.check_out}) must be after check_in (${data.check_in})`,
        value: { check_in: data.check_in, check_out: data.check_out },
      })
      return { valid: false, confidence: 0, issues }
    }

    // Calculate nights for ADR comparison
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    if (nights <= 0) {
      issues.push({
        field: 'dates',
        severity: 'error',
        message: `Invalid stay duration: ${nights} nights`,
        value: { check_in: data.check_in, check_out: data.check_out, nights },
      })
      return { valid: false, confidence: 0, issues }
    }
  }

  // RULE 2: Check total_value against historical ADR
  if (data.total_value && propertyHistoricalAdr) {
    const nights = data.check_in && data.check_out
      ? Math.ceil(
          (new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 1

    const expectedMin = propertyHistoricalAdr.avgRate * nights * 0.33 // 1/3 threshold
    const expectedMax = propertyHistoricalAdr.avgRate * nights * 3 // 3× threshold

    if (data.total_value < expectedMin || data.total_value > expectedMax) {
      const deviation = data.total_value / (propertyHistoricalAdr.avgRate * nights)
      issues.push({
        field: 'total_value',
        severity: 'warning',
        message: `total_value diverges ${deviation.toFixed(2)}× from historical ADR (expected €${expectedMin.toFixed(2)}–€${expectedMax.toFixed(2)})`,
        value: {
          total_value: data.total_value,
          expectedMin,
          expectedMax,
          deviation,
        },
      })

      // Reduce confidence by 30% for significant deviation
      confidence = Math.max(0, confidence - 0.3)
    }
  }

  // RULE 3: Check for empty/generic name
  const genericNames = ['Hóspede', 'Guest', 'Cliente', 'Customer', '', null]
  if (!data.guest_name || genericNames.includes(data.guest_name.trim())) {
    issues.push({
      field: 'guest_name',
      severity: 'warning',
      message: `Name is empty or generic ("${data.guest_name}"); marked as incomplete but not blocking`,
      value: { guest_name: data.guest_name },
    })

    // Reduce confidence by 20% for missing/generic name but don't fail
    confidence = Math.max(0, confidence - 0.2)
  }

  return {
    valid: issues.every(i => i.severity !== 'error'),
    confidence,
    issues,
  }
}

/**
 * Calculate property historical ADR from recent bookings
 * Used for Rule 2 validation
 */
export function calculatePropertyAdr(recentBookings: Array<{
  checkIn: Date
  checkOut: Date
  totalValue: number
}>): { adultNights: number; avgRate: number } {
  if (recentBookings.length === 0) {
    return { adultNights: 0, avgRate: 0 }
  }

  let totalNights = 0
  let totalRevenue = 0

  for (const booking of recentBookings) {
    const nights = Math.ceil(
      (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )
    totalNights += nights
    totalRevenue += booking.totalValue
  }

  return {
    adultNights: totalNights,
    avgRate: totalRevenue / totalNights,
  }
}
