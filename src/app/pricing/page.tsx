import { Check, X } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import Link from 'next/link'
import { PublicNav } from '@/components/landing/organisms/PublicNav'
import { PublicFooter } from '@/components/landing/organisms/PublicFooter'

const plans = [
  {
    name: 'Essencial',
    price: 'R$ 59',
    period: '/mês',
    description: 'Saia da planilha. Controle uma unidade com lucro claro.',
    properties: '1 unidade incluída',
    extra: '+R$49 por unidade extra',
    features: [
      'Motor de Reserva Direta',
      'Sync iCal',
      'Calendário unificado',
      'Gestão básica de reservas',
      'Dashboard de lucros',
      'Suporte por email',
    ],
    cta: 'Começar com Essencial',
    highlight: false,
  },
  {
    name: 'Expansão',
    price: 'R$ 149',
    period: '/mês',
    description: 'Coordene sem caos. Até 3 unidades e automações de limpeza.',
    properties: '3 unidades incluídas',
    extra: '+R$49 por unidade extra',
    features: [
      'Tudo do Essencial',
      'Portal de Limpadores (WhatsApp)',
      'Relatórios por Proprietário',
      'Equipe até 5 pessoas',
      'Automação de workflows',
      'Suporte por chat e email',
    ],
    cta: 'Escolher Expansão',
    highlight: true,
  },
  {
    name: 'Premium',
    price: 'R$ 397',
    period: '/mês',
    description: 'Automatize operação e receita. Inteligência para grandes portfólios.',
    properties: '10 unidades incluídas',
    extra: '+R$49 por unidade extra',
    features: [
      'Tudo do Expansão',
      'API Completa',
      'Forecast & BI Avançado',
      'Gerente Dedicado',
      'Unidades extras sob demanda',
      'Suporte prioritário 24/7',
    ],
    cta: 'Escolher Premium',
    highlight: false,
  },
]

const featureMatrix = [
  { name: 'Motor de Reserva Direta', essencial: true, expansao: true, premium: true },
  { name: 'Portal de Limpadores (WhatsApp)', essencial: false, expansao: true, premium: true },
  { name: 'Relatórios por Proprietário', essencial: false, expansao: true, premium: true },
  { name: 'API Completa', essencial: false, expansao: false, premium: true },
  { name: 'Forecast & BI Avançado', essencial: false, expansao: false, premium: true },
  { name: 'Automação de Workflows', essencial: false, expansao: true, premium: true },
  { name: 'Equipe Colaborativa', essencial: false, expansao: true, premium: true },
]

export default function PricingPage() {
  return (
    <>
      <PublicNav />
      <main className="min-h-screen bg-white pt-18">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Preços Transparentes e Flexíveis
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-4">
            Pague apenas pelo que usa. Preços por imóvel, sem taxas escondidas.
          </p>
          <p className="text-lg text-blue-200">
            Quanto mais imóveis, mais economia você tem. Escalabilidade sem limite.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-8 border border-blue-200">
            <h2 className="text-2xl font-bold mb-6">Como Funciona</h2>
            <p className="text-gray-600 mb-8">
              Escolha um plano com propriedades incluídas. Precisar de mais? Adicione propriedades extras por R$ 49/mês cada.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900 mb-2">Essencial</div>
                <p className="text-gray-600 text-sm">
                  <span className="block font-semibold text-lg text-blue-900">R$ 59/mês</span>
                  1 propriedade incluída
                  <span className="block text-xs mt-1">+ R$ 49/extra</span>
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900 mb-2">Expansão</div>
                <p className="text-gray-600 text-sm">
                  <span className="block font-semibold text-lg text-blue-900">R$ 149/mês</span>
                  3 propriedades incluídas
                  <span className="block text-xs mt-1">+ R$ 49/extra</span>
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900 mb-2">Premium</div>
                <p className="text-gray-600 text-sm">
                  <span className="block font-semibold text-lg text-blue-900">R$ 397/mês</span>
                  10 propriedades incluídas
                  <span className="block text-xs mt-1">+ R$ 49/extra</span>
                </p>
              </div>
            </div>
            <div className="border-t border-blue-200 mt-8 pt-8">
              <p className="text-center text-gray-600 font-semibold mb-4">Exemplos de Custo Mensal</p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-semibold text-gray-900">Essencial + 2 extras</p>
                  <p className="text-blue-900 font-bold mt-1">R$ 157/mês</p>
                  <p className="text-gray-600 text-xs mt-1">R$ 59 + (2 × R$ 49)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-semibold text-gray-900">Expansão + 2 extras</p>
                  <p className="text-blue-900 font-bold mt-1">R$ 247/mês</p>
                  <p className="text-gray-600 text-xs mt-1">R$ 149 + (2 × R$ 49)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-semibold text-gray-900">Premium + 5 extras</p>
                  <p className="text-blue-900 font-bold mt-1">R$ 642/mês</p>
                  <p className="text-gray-600 text-xs mt-1">R$ 397 + (5 × R$ 49)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg shadow-lg overflow-hidden transition transform hover:scale-105 ${
                  plan.highlight ? 'ring-2 ring-blue-900 md:scale-105 bg-blue-50' : 'bg-white'
                }`}
              >
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <div className="text-4xl font-bold">
                      {plan.price}
                      {plan.period && <span className="text-lg text-gray-600">{plan.period}</span>}
                    </div>
                  </div>

                  <Link href="/register" className="block w-full mb-8">
                    <Button
                      className="w-full"
                      variant={plan.highlight ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>

                  <ul className="space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
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
                <tr className="bg-blue-900 text-white">
                  <th className="border border-gray-300 p-4 text-left">Funcionalidade</th>
                  <th className="border border-gray-300 p-4 text-center">Essencial</th>
                  <th className="border border-gray-300 p-4 text-center">Expansão</th>
                  <th className="border border-gray-300 p-4 text-center">Premium</th>
                </tr>
              </thead>
              <tbody>
                {featureMatrix.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-100">
                    <td className="border border-gray-300 p-4">{row.name}</td>
                    <td className="border border-gray-300 p-4 text-center">
                      {row.essencial ? (
                        <Check className="w-6 h-6 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-6 h-6 text-gray-500 mx-auto" />
                      )}
                    </td>
                    <td className="border border-gray-300 p-4 text-center">
                      {row.expansao ? (
                        <Check className="w-6 h-6 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-6 h-6 text-gray-500 mx-auto" />
                      )}
                    </td>
                    <td className="border border-gray-300 p-4 text-center">
                      {row.premium ? (
                        <Check className="w-6 h-6 text-green-600 mx-auto" />
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
                a: 'Cada plano inclui um número de propriedades. Se precisar de mais, pague apenas R$49/mês por cada propriedade extra. Sem surpresas.',
              },
              {
                q: 'Posso mudar de plano depois?',
                a: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. Ajustamos o valor de forma proporcional no seu próximo ciclo de cobrança.',
              },
              {
                q: 'E se eu não precisar mais de propriedades extras?',
                a: 'Você pode remover propriedades extras quando quiser. Elas sairão da sua cobrança no próximo ciclo.',
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
