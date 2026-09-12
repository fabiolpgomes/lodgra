import { EmailExtractionSchema, hasRequiredReservationFields } from '../extraction.schema'

const valid = {
  guest_name: 'Nuno Correia',
  check_in: '2026-09-29',
  check_out: '2026-09-30',
  total_value: 162.09,
  currency: 'EUR',
  source_platform: 'booking',
  property_identifier_raw: 'AHS Premium Apart',
  reservation_code: '5762083928',
  guest_count: 3,
  confidence: 0.98,
}

describe('email-reservation-extraction/v1 schema', () => {
  it('accepts the exact versioned contract', () => {
    const result = EmailExtractionSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) expect(hasRequiredReservationFields(result.data)).toBe(true)
  })

  it('accepts explicit nulls but does not accept the result for reservation creation', () => {
    const result = EmailExtractionSchema.safeParse({
      ...valid, guest_name: null, check_in: null, check_out: null,
      total_value: null, currency: null, property_identifier_raw: null,
      reservation_code: null, guest_count: null,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(hasRequiredReservationFields(result.data)).toBe(false)
  })

  it('rejects omitted and unknown keys', () => {
    const { currency: _currency, ...missing } = valid
    expect(EmailExtractionSchema.safeParse(missing).success).toBe(false)
    expect(EmailExtractionSchema.safeParse({ ...valid, phone: '+351900000000' }).success).toBe(false)
  })

  it('rejects impossible calendar dates and coercion', () => {
    expect(EmailExtractionSchema.safeParse({ ...valid, check_in: '2026-02-30' }).success).toBe(false)
    expect(EmailExtractionSchema.safeParse({ ...valid, total_value: '162.09' }).success).toBe(false)
  })

  it('rejects invalid platform, currency and confidence', () => {
    expect(EmailExtractionSchema.safeParse({ ...valid, source_platform: 'expedia' }).success).toBe(false)
    expect(EmailExtractionSchema.safeParse({ ...valid, currency: 'eur' }).success).toBe(false)
    expect(EmailExtractionSchema.safeParse({ ...valid, confidence: 1.1 }).success).toBe(false)
  })
})
