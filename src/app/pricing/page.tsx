import { Check, X } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import Link from 'next/link'
import { PLAN_DISPLAY, PLAN_LIMITS, PLAN_PRICES, formatPlanPrice } from '@/lib/billing/plans'
import { PublicNav } from '@/components/landing/organisms/PublicNav'
import { PublicFooter } from '@/components/landing/organisms/PublicFooter'

const CURRENCY = 'brl' as const
const brl = (n: number) => formatPlanPrice(n, CURRENCY)

const plans = PLAN_DISPLAY.map(plan => ({
  ...plan,
  price: PLAN_PRICES[plan.id][CURRENCY],
  included: PLAN_LIMITS[plan.id].maxProperties ?? 0,
}))

// Exemplos: sempre abaixo do limite em que o plano seguinte fica mais barato
const examples = [
  { plan: plans[0], extras: 1 },
  { plan: plans[1], extras: 2 },
  { plan: plans[2], extras: 3 },
  { plan: plans[3], extras: 5 },
]

const featureMatrix = [
  { name: 'Motor de Reserva Direta', essencial: true, expansao: true, premium: true, enterprise: true },
  { name: 'Portal de Limpadores (WhatsApp)', essencial: false, expansao: true, premium: true, enterprise: true },
  { name: 'Relatórios por Proprietário', essencial: false, expansao: true, premium: true, enterprise: true },
  { name: 'Automação de Workflows', essencial: false, expansao: true, premium: true, enterprise: true },
  { name: 'Equipe Colaborativa', essencial: false, expansao: true, premium: true, enterprise: true },
  { name: 'Equipe ilimitada', essencial: false, expansao: false, premium: false, enterprise: true },
]

export default function PricingPage() {
  return (
    <>
      <PublicNav />
      <main className="min-h-screen bg-white pt-18">
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-900 to-brand-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Preços Transparentes e Flexíveis
          </h1>
          <p className="text-xl text-brand-100 max-w-2xl mx-auto mb-4">
            Um valor mensal fixo com imóveis incluídos. Sem taxas por reserva.
          </p>
          <p className="text-lg text-brand-200">
            Precisa de mais imóveis? Adicione só os que usar.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-[color:var(--be-blue-pale)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-8 border border-[color:var(--be-blue-light)]">
            <h2 className="text-2xl font-bold mb-6">Como Funciona</h2>
            <p className="text-gray-600 mb-8">
              Escolha um plano com propriedades incluídas. Precisa de mais? Cada propriedade adicional custa{' '}
              {brl(PLAN_PRICES.essencial.brl.extraProperty)}/mês ({brl(PLAN_PRICES.enterprise.brl.extraProperty)}/mês no Enterprise).
            </p>
            <div className="grid md:grid-cols-4 gap-8">
              {plans.map(plan => (
                <div key={plan.id} className="text-center">
                  <div className="text-2xl font-bold text-brand-900 mb-2">{plan.name}</div>
                  <p className="text-gray-600 text-sm">
                    <span className="block font-semibold text-lg text-brand-900">{brl(plan.price.monthly)}/mês</span>
                    {plan.included} {plan.included === 1 ? 'propriedade incluída' : 'propriedades incluídas'}
                    <span className="block text-xs mt-1">+ {brl(plan.price.extraProperty)}/adicional</span>
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-[color:var(--be-blue-light)] mt-8 pt-8">
              <p className="text-center text-gray-600 font-semibold mb-4">Exemplos de Custo Mensal</p>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                {examples.map(({ plan, extras }) => (
                  <div key={plan.id} className="bg-gray-50 p-4 rounded">
                    <p className="font-semibold text-gray-900">{plan.name} + {extras} {extras === 1 ? 'adicional' : 'adicionais'}</p>
                    <p className="text-brand-900 font-bold mt-1">{brl(plan.price.monthly + extras * plan.price.extraProperty)}/mês</p>
                    <p className="text-gray-600 text-xs mt-1">
                      {brl(plan.price.monthly)} + ({extras} × {brl(plan.price.extraProperty)})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-lg shadow-lg overflow-hidden transition transform hover:scale-105 ${
                  plan.highlighted ? 'ring-2 ring-brand-900 md:scale-105 bg-[color:var(--be-blue-pale)]' : 'bg-white'
                }`}
              >
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <div className="text-4xl font-bold">
                      {brl(plan.price.monthly)}
                      <span className="text-lg text-gray-600">/mês</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">+ {brl(plan.price.extraProperty)}/mês por propriedade adicional</p>
                  </div>

                  <Link href="/register" className="block w-full mb-8">
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                    >
                      Escolher {plan.name}
                    </Button>
                  </Link>

                  <ul className="space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Comparação de Funcionalidades</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-brand-900 text-white">
                  <th className="border border-gray-300 p-4 text-left">Funcionalidade</th>
                  <th className="border border-gray-300 p-4 text-center">Essencial</th>
                  <th className="border border-gray-300 p-4 text-center">Expansão</th>
                  <th className="border border-gray-300 p-4 text-center">Premium</th>
                  <th className="border border-gray-300 p-4 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {featureMatrix.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-100">
                    <td className="border border-gray-300 p-4">{row.name}</td>
                    <td className="border border-gray-300 p-4 text-center">
                      {row.essencial ? (
                        <Check className="w-6 h-6 text-emerald-700 mx-auto" />
                      ) : (
                        <X className="w-6 h-6 text-gray-500 mx-auto" />
                      )}
                    </td>
                    <td className="border border-gray-300 p-4 text-center">
                      {row.expansao ? (
                        <Check className="w-6 h-6 text-emerald-700 mx-auto" />
                      ) : (
                        <X className="w-6 h-6 text-gray-500 mx-auto" />
                      )}
                    </td>
                    <td className="border border-gray-300 p-4 text-center">
                      {row.premium ? (
                        <Check className="w-6 h-6 text-emerald-700 mx-auto" />
                      ) : (
                        <X className="w-6 h-6 text-gray-500 mx-auto" />
                      )}
                    </td>
                    <td className="border border-gray-300 p-4 text-center">
                      {row.enterprise ? (
                        <Check className="w-6 h-6 text-emerald-700 mx-auto" />
                      ) : (
                        <X className="w-6 h-6 text-gray-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Como funciona o modelo de propriedades?',
                a: `Cada plano inclui um número de propriedades. Se precisar de mais, cada propriedade adicional custa ${brl(PLAN_PRICES.essencial.brl.extraProperty)}/mês (${brl(PLAN_PRICES.enterprise.brl.extraProperty)}/mês no Enterprise acima de 20). O sistema avisa o valor antes de adicionar.`,
              },
              {
                q: 'Posso mudar de plano depois?',
                a: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. Ajustamos o valor de forma proporcional no seu próximo ciclo de cobrança.',
              },
              {
                q: 'E se eu não precisar mais de propriedades extras?',
                a: 'Ao excluir uma propriedade, a cobrança adicional é ajustada automaticamente, de forma proporcional.',
              },
              {
                q: 'Há período de teste gratuito?',
                a: 'Oferecemos 7 dias de teste PAGO. Se não gostar, devolvemos 100% do seu dinheiro, sem perguntas.',
              },
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim, sem penalidades. Você pode cancelar sua assinatura a qualquer momento pelo dashboard.',
              },
              {
                q: 'Vocês oferecem desconto anual?',
                a: 'Sim, planos anuais têm até 20% de desconto. Fale com nosso time de vendas para mais detalhes.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="border-b pb-6">
                <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </main>
      <PublicFooter />
    </>
  )
}
