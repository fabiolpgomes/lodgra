import { z } from 'zod'
import { NextResponse } from 'next/server'

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .optional(),
  full_name: z.string().min(1, 'Nome é obrigatório').max(100),
  role: z.enum(['admin', 'gestor', 'viewer']).optional().default('viewer'),
  access_all_properties: z.boolean().optional().default(false),
  property_ids: z.array(z.string().uuid('ID de propriedade inválido')).optional().default([]),
})

export const UpdateUserSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'gestor', 'viewer']).optional(),
  access_all_properties: z.boolean().optional(),
  property_ids: z.array(z.string().uuid()).optional(),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .optional(),
})

export const UpdateReservationSchema = z.object({
  property_listing_id: z.string().uuid('ID de listing inválido'),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de check-in inválida'),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de check-out inválida'),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  number_of_guests: z.coerce.number().int().positive().optional().default(1),
  total_amount: z.coerce.number().positive().nullable().optional(),
  guest_first_name: z.string().min(1).max(100),
  guest_last_name: z.string().min(1).max(100),
  guest_email: z.string().email('Email do hóspede inválido'),
  guest_phone: z.string().max(20).nullable().optional(),
})

export const PatchReservationSchema = z.object({
  internal_notes: z.string().max(2000),
})

export const UpdateExpenseSchema = z.object({
  property_id: z.string().uuid('ID de propriedade inválido'),
  description: z.string().min(1).max(255),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  category: z.string().min(1).max(100),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  notes: z.string().max(500).nullable().optional(),
})

export const NotificationSchema = z.object({
  reservation_id: z.string().uuid('ID de reserva inválido'),
  type: z.enum(['creation', 'cancellation']).optional().default('creation'),
})

// ─── Validation helper ────────────────────────────────────────────────────────

type ValidationSuccess<T> = { ok: true; data: T }
type ValidationError = { ok: false; response: NextResponse }

export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationSuccess<T> | ValidationError {
  const result = schema.safeParse(data)
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Dados inválidos', details: result.error.flatten() },
        { status: 400 }
      ),
    }
  }
  return { ok: true, data: result.data }
}
