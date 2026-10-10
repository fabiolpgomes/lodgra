'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, ShieldCheck, ExternalLink, Loader2, Save, KeyRound } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { toast } from 'sonner'

interface Props {
  initial: {
    configured: boolean
    environment: 'sandbox' | 'production'
    keyLast4: string | null
    webhookToken: string | null
  }
}

export function PaymentSettings({ initial }: Props) {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>(initial.environment)
  const [loading, setLoading] = useState(false)
  const unchanged = apiKey.trim() === '' && environment === initial.environment
  const webhookUrl = typeof window === 'undefined' ? '/api/webhooks/asaas' : `${window.location.origin}/api/webhooks/asaas`

  async function save(extra: { regenerateWebhookToken?: boolean } = {}) {
    setLoading(true)
    try {
      const response = await fetch('/api/organization/payment-settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          environment,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          ...extra,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error ?? 'Não foi possível guardar.')
      }
      setApiKey('')
      toast.success('Configurações de pagamento atualizadas!')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível guardar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Configuração de Pagamentos (Brasil)</h2>
            <p className="text-xs text-gray-600">Conecte sua conta Asaas para receber via PIX direto dos hóspedes</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              Ambiente
              <span className="text-[10px] font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Escolha Sandbox para testes</span>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <label className="flex w-full cursor-pointer items-center gap-2 sm:w-auto">
                <input
                  type="radio"
                  name="env"
                  value="sandbox"
                  checked={environment === 'sandbox'}
                  onChange={() => setEnvironment('sandbox')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-600">Sandbox (Testes)</span>
              </label>
              <label className="flex w-full cursor-pointer items-center gap-2 sm:w-auto">
                <input
                  type="radio"
                  name="env"
                  value="production"
                  checked={environment === 'production'}
                  onChange={() => setEnvironment('production')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-600 font-medium">Produção (Real)</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="asaas-api-key" className="block text-sm font-bold text-gray-700 mb-1">
              API Access Token (Asaas)
            </label>
            <input
              id="asaas-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={initial.configured ? `Configurada (termina em ${initial.keyLast4 ?? '••••'}). Deixe em branco para manter.` : '\\$aak_...'}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">Por segurança, a chave guardada nunca é mostrada de novo.</p>
          </div>
        </div>

        {initial.configured && (
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <KeyRound className="h-4 w-4" /> Webhook de confirmação de pagamento
            </div>
            <p className="text-xs text-gray-600">
              No painel do Asaas (Integrações → Webhooks), use esta URL e este token de autenticação:
            </p>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">URL</p>
              <code className="block break-all rounded bg-gray-50 px-3 py-2 text-xs">{webhookUrl}</code>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Token de autenticação</p>
              {initial.webhookToken ? (
                <code className="block break-all rounded bg-gray-50 px-3 py-2 text-xs">{initial.webhookToken}</code>
              ) : (
                <p className="text-xs text-amber-700">Ainda não gerado.</p>
              )}
            </div>
            <Button type="button" variant="outline" disabled={loading} onClick={() => void save({ regenerateWebhookToken: true })}>
              {initial.webhookToken ? 'Gerar novo token' : 'Gerar token'}
            </Button>
            {initial.webhookToken && (
              <p className="text-xs text-gray-500">Ao gerar um novo token, atualize-o também no Asaas, ou as confirmações de pagamento deixam de chegar.</p>
            )}
          </div>
        )}

        <div className="bg-brand-50 rounded-xl p-4 flex gap-3 border border-brand-100">
          <ShieldCheck className="h-5 w-5 text-brand-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-brand-800 leading-relaxed">
            <p className="font-bold mb-1">Segurança de Dados</p>
            Suas chaves de API são usadas exclusivamente para gerar as cobranças em seu nome. O dinheiro cai direto na sua conta Asaas.
            <a href="https://www.asaas.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-2 font-bold hover:underline">
              Como obter minha API Key no Asaas? <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="flex justify-stretch pt-2 sm:justify-end">
          <Button
            type="button"
            variant="premium-primary"
            onClick={() => void save()}
            disabled={loading || unchanged}
            className="h-11 w-full gap-2 rounded-xl px-8 font-bold sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  )
}
