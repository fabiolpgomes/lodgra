'use client'

import { useState } from 'react'
import { CreditCard, ShieldCheck, ExternalLink, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  organization: {
    id: string
    asaas_api_key: string | null
    asaas_environment: string | null
  }
}

export function PaymentSettings({ organization }: Props) {
  const [apiKey, setApiKey] = useState(organization.asaas_api_key || '')
  const [environment, setEnvironment] = useState(organization.asaas_environment || 'sandbox')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          asaas_api_key: apiKey,
          asaas_environment: environment
        })
        .eq('id', organization.id)

      if (error) throw error
      toast.success('Configurações de pagamento atualizadas!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error('Erro ao salvar: ' + message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Configuração de Pagamentos (Brasil)</h2>
            <p className="text-xs text-gray-500">Conecte sua conta Asaas para receber via PIX direto dos hóspedes</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
              Ambiente
              <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Escolha Sandbox para testes</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="env" 
                  value="sandbox" 
                  checked={environment === 'sandbox'} 
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Sandbox (Testes)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="env" 
                  value="production" 
                  checked={environment === 'production'} 
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 font-medium">Produção (Real)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              API Access Token (Asaas)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="\$aak_..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
            />
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 flex gap-3 border border-blue-100">
          <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 leading-relaxed">
            <p className="font-bold mb-1">Segurança de Dados</p>
            Suas chaves de API são usadas exclusivamente para gerar as cobranças em seu nome. O dinheiro cai direto na sua conta Asaas.
            <a href="https://www.asaas.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-2 font-bold hover:underline">
              Como obter minha API Key no Asaas? <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/10"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  )
}
