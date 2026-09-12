import { z } from 'zod'

export const EMAIL_EXTRACTION_VERSION = 'email-reservation-extraction/v1' as const
export const EMAIL_EXTRACTION_MAX_CONTENT_CHARS = 100_000

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

function isRealIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const EmailExtractionSchema = z
  .object({
    guest_name: z.string().trim().min(1).nullable(),
    check_in: isoDate.nullable(),
    check_out: isoDate.nullable(),
    total_value: z.number().finite().nonnegative().nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
    source_platform: z.enum(['airbnb', 'booking', 'vrbo']),
    property_identifier_raw: z.string().trim().min(1).nullable(),
    reservation_code: z.string().trim().min(1).nullable(),
    guest_count: z.number().int().positive().nullable(),
    confidence: z.number().finite().min(0).max(1),
  })
  .strict()
  .superRefine((value, context) => {
    for (const field of ['check_in', 'check_out'] as const) {
      const date = value[field]
      if (date && !isRealIsoDate(date)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is not a real calendar date`,
        })
      }
    }
  })

export type EmailExtraction = z.infer<typeof EmailExtractionSchema>
export type EmailExtractionPlatform = EmailExtraction['source_platform']

export interface ExtractionResult {
  success: boolean
  data?: EmailExtraction
  error?: string
  confidence: number
  raw_response?: string
  model?: string
  version: typeof EMAIL_EXTRACTION_VERSION
  truncated: boolean
}

export function hasRequiredReservationFields(
  data: EmailExtraction
): data is EmailExtraction & { guest_name: string; check_in: string; check_out: string } {
  return Boolean(data.guest_name && data.check_in && data.check_out)
}

export function hasRequiredReservationFieldsOnRow<T extends EmailExtraction>(
  data: T
): data is T & { guest_name: string; check_in: string; check_out: string } {
  return hasRequiredReservationFields(data)
}
