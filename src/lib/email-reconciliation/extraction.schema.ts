import { z } from 'zod'

export const EmailExtractionSchema = z.object({
  guest_name: z.string().min(1, 'Guest name is required'),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  number_of_guests: z.number().int().min(1, 'At least 1 guest required').optional(),
  total_value: z.number().positive('Total value must be positive').optional(),
  currency: z.string().length(3).optional(),
  reservation_code: z.string().optional(),
  property_name: z.string().optional(),
})

export type EmailExtraction = z.infer<typeof EmailExtractionSchema>

export interface ExtractionResult {
  success: boolean
  data?: EmailExtraction
  error?: string
  confidence: number // 0-1
  raw_response?: string
}
