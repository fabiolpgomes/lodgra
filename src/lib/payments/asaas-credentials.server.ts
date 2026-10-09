import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { generateWebhookToken, lastFour } from './asaas-token'

export type AsaasEnvironment = 'sandbox' | 'production'

export type AsaasCredentials = {
  apiKey: string
  environment: AsaasEnvironment
}

export type AsaasSettingsView = {
  configured: boolean
  environment: AsaasEnvironment
  keyLast4: string | null
  webhookToken: string | null
}

type Row = {
  asaas_api_key: string | null
  asaas_environment: string | null
  asaas_webhook_token: string | null
}

const COLUMNS = 'asaas_api_key, asaas_environment, asaas_webhook_token'

function toEnvironment(value: string | null | undefined): AsaasEnvironment {
  return value === 'production' ? 'production' : 'sandbox'
}

async function loadRow(organizationId: string): Promise<Row | null> {
  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('organization_payment_credentials')
    .select(COLUMNS)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (error) throw new Error('Não foi possível ler as credenciais de pagamento')
  return (data as Row | null) ?? null
}

/** Credenciais para chamar a API do Asaas em nome da organização. Nunca devolver ao navegador. */
export async function getAsaasCredentials(organizationId: string): Promise<AsaasCredentials | null> {
  const row = await loadRow(organizationId)
  if (!row?.asaas_api_key) return null
  return { apiKey: row.asaas_api_key, environment: toEnvironment(row.asaas_environment) }
}

/** Segredo esperado no cabeçalho do webhook da organização. */
export async function getAsaasWebhookToken(organizationId: string): Promise<string | null> {
  return (await loadRow(organizationId))?.asaas_webhook_token ?? null
}

/** Estado para a tela de Definições: nunca inclui a chave completa. */
export async function getAsaasSettingsView(organizationId: string): Promise<AsaasSettingsView> {
  const row = await loadRow(organizationId)
  return {
    configured: Boolean(row?.asaas_api_key),
    environment: toEnvironment(row?.asaas_environment),
    keyLast4: lastFour(row?.asaas_api_key),
    webhookToken: row?.asaas_webhook_token ?? null,
  }
}

export async function saveAsaasCredentials(
  organizationId: string,
  input: { apiKey?: string; environment: AsaasEnvironment; regenerateWebhookToken?: boolean },
): Promise<void> {
  const existing = await loadRow(organizationId)
  const apiKey = input.apiKey ?? existing?.asaas_api_key ?? null
  const needsToken = Boolean(apiKey) && (input.regenerateWebhookToken || !existing?.asaas_webhook_token)

  const admin = await createAdminClient()
  const { error } = await admin
    .from('organization_payment_credentials')
    .upsert({
      organization_id: organizationId,
      asaas_api_key: apiKey,
      asaas_environment: input.environment,
      asaas_webhook_token: needsToken ? generateWebhookToken() : existing?.asaas_webhook_token ?? null,
    }, { onConflict: 'organization_id' })
  if (error) throw new Error('Não foi possível guardar as credenciais de pagamento')
}
