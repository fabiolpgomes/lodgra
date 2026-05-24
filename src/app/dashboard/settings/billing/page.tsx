'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/common/ui/button'
import { BillingPreview } from '@/components/billing/BillingPreview'

export default function BillingPage() {
  const params = useParams()
  const orgId = params.orgId as string

  if (!orgId) {
    return (
      <div className="p-8">
        <p className="text-red-600">Organization ID not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Faturação</h1>
        <p className="mt-1 text-gray-600">Gerencie seu plano de assinatura e propriedades extras</p>
      </div>

      {/* Billing Preview Card */}
      <div className="max-w-2xl">
        <BillingPreview
          orgId={orgId}
          onManagePlan={() => window.location.href = '/onboarding/select-plan'}
          onAddExtraProperty={() => window.location.href = '/dashboard/properties?action=add-extra'}
        />
      </div>

      {/* Links Section */}
      <div className="space-y-4 border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold text-gray-900">Ações Rápidas</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/pricing">
            <Button variant="outline" className="w-full">
              Ver Todos os Planos
            </Button>
          </Link>

          <Link href="/onboarding/select-plan">
            <Button variant="outline" className="w-full">
              Alterar Plano
            </Button>
          </Link>

          <Link href="/dashboard/properties">
            <Button variant="outline" className="w-full">
              Minhas Propriedades
            </Button>
          </Link>

          <a href="https://billing.stripe.com/login" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full">
              Gerenciar no Stripe
            </Button>
          </a>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4 border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold text-gray-900">Perguntas Frequentes</h2>

        <div className="space-y-4">
          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold text-gray-900 cursor-pointer">
              Como faço upgrade do meu plano?
            </summary>
            <p className="mt-3 text-gray-600">
              Clique em "Alterar Plano" acima ou navegue até a página de planos. Escolha o novo plano e complete o checkout. Sua assinatura será atualizada imediatamente com crédito proporcional aplicado.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold text-gray-900 cursor-pointer">
              Posso adicionar propriedades extras?
            </summary>
            <p className="mt-3 text-gray-600">
              Sim! Você pode adicionar propriedades extras a R$49/mês cada uma. Clique no botão "Adicionar Propriedade Extra" acima para começar.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold text-gray-900 cursor-pointer">
              Como cancelo minha assinatura?
            </summary>
            <p className="mt-3 text-gray-600">
              Você pode cancelar a qualquer momento sem penalidades. Acesse o portal Stripe clicando no botão "Gerenciar no Stripe" ou entre em contato com nosso suporte.
            </p>
          </details>

          <details className="border border-gray-200 rounded-lg p-4">
            <summary className="font-semibold text-gray-900 cursor-pointer">
              Quando serei cobrado?
            </summary>
            <p className="mt-3 text-gray-600">
              As cobranças ocorrem no mesmo dia de cada mês (seu dia de ciclo de faturamento). Você receberá uma notificação por email 3 dias antes da cobrança.
            </p>
          </details>
        </div>
      </div>

      {/* Support */}
      <div className="border-t border-gray-200 pt-8">
        <div className="rounded-lg bg-blue-50 p-6">
          <h3 className="font-semibold text-blue-900">Precisa de ajuda?</h3>
          <p className="mt-2 text-sm text-blue-800">
            Entre em contato com nosso time de suporte: <a href="mailto:support@lodgra.io" className="underline">support@lodgra.io</a>
          </p>
        </div>
      </div>
    </div>
  )
}
