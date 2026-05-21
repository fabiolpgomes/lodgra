import { Check } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import Link from 'next/link'

const plans = [
  {
    name: 'Essencial',
    price: 'R$ 49',
    period: '/mês',
    description: 'Para proprietários iniciantes',
    features: [
      'Até 2 imóveis',
      'Sincronização com Airbnb e Booking',
      'Dashboard de lucros básico',
      'Suporte por email',
      'Histórico de 3 meses',
      'Relatórios mensais',
    ],
    cta: 'Começar com Essencial',
    highlight: false,
  },
  {
    name: 'Expansão',
    price: 'R$ 99',
    period: '/mês',
    description: 'Para proprietários em crescimento',
    features: [
      'Até 10 imóveis',
      'Sincronização com múltiplas plataformas',
      'Pricing dinâmico inteligente',
      'Análise avançada de lucros',
      'Suporte por chat e email',
      'Histórico de 1 ano',
      'API access',
      'Automação de workflows',
    ],
    cta: 'Escolher Expansão',
    highlight: true,
  },
  {
    name: 'Premium',
    price: 'R$ 199',
    period: '/mês',
    description: 'Para grandes operações',
    features: [
      'Imóveis ilimitados',
      'Pricing inteligente com IA',
      'Automação completa',
      'Relatórios customizados',
      'Suporte prioritário 24/7',
      'Histórico completo',
      'API avançada com webhooks',
      'Integração customizada',
      'Account manager dedicado',
    ],
    cta: 'Escolher Premium',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Preços Transparentes e Flexíveis
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Comece grátis, escale conforme cresce. Sem taxas escondidas, sem contrato de longa duração.
          </p>
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

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
          <div className="space-y-6">
            {[
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
  )
}
