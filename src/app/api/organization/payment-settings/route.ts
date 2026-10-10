import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/requireRole'
import { validateAsaasApiKey } from '@/lib/payments/asaas-api-key'
import { getAsaasSettingsView, saveAsaasCredentials } from '@/lib/payments/asaas-credentials.server'

const NO_STORE = { 'Cache-Control': 'private, no-store' } as const

const bodySchema = z.object({
  environment: z.enum(['sandbox', 'production']),
  // Em branco = manter a chave atual. Nunca devolvemos a chave, por isso o formulário não a pré-preenche.
  apiKey: z.string().trim().min(8).max(300).optional(),
  regenerateWebhookToken: z.boolean().optional(),
}).strict()

// GET /api/organization/payment-settings — estado das credenciais (sem a chave) (só admin)
export async function GET() {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })

  try {
    return NextResponse.json(await getAsaasSettingsView(auth.organizationId), { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar as configurações' }, { status: 500 })
  }
}

// PUT /api/organization/payment-settings — guarda chave/ambiente do Asaas (só admin)
export async function PUT(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  if (parsed.data.apiKey) {
    const keyError = validateAsaasApiKey(parsed.data.apiKey, parsed.data.environment)
    if (keyError) return NextResponse.json({ error: keyError }, { status: 400 })
  }

  try {
    await saveAsaasCredentials(auth.organizationId, parsed.data)
    return NextResponse.json(await getAsaasSettingsView(auth.organizationId), { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: 'Não foi possível guardar as configurações' }, { status: 500 })
  }
}
