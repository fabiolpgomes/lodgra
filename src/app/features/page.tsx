import { CheckCircle2, TrendingUp, Zap, BarChart3, Shield, Globe } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import Link from 'next/link'

const features = [
  {
    icon: TrendingUp,
    title: 'Pricing Inteligente',
    description: 'Algoritmo de preços dinâmicos baseado em demanda, sazonalidade e concorrência para maximizar sua receita.',
  },
  {
    icon: Zap,
    title: 'Automação Completa',
    description: 'Sincronize automaticamente com Airbnb, Booking e outras plataformas. Gerencie tudo em um só lugar.',
  },
  {
    icon: BarChart3,
    title: 'Análise de Lucros',
    description: 'Visualize lucros por imóvel, período e canal. Identifique oportunidades de crescimento facilmente.',
  },
  {
    icon: Globe,
    title: 'Integrações Avançadas',
    description: 'Conecte com Stripe, PayPal, Google Calendar, Telegram e centenas de aplicações.',
  },
  {
    icon: Shield,
    title: 'Segurança Enterprise',
    description: 'Criptografia de dados, autenticação 2FA, backup automático e conformidade com LGPD.',
  },
  {
    icon: CheckCircle2,
    title: 'Suporte 24/7',
    description: 'Time dedicado em português pronto para ajudar com implementação e troubleshooting.',
  },
]

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Funcionalidades que Maximizam seus Lucros
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl">
            Descubra como Lodgra ajuda milhares de proprietários a aumentar ganhos em até 30% através de automação inteligente e análise de dados.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary">
              Começar Grátis
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Recursos Principais</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition">
                  <Icon className="w-10 h-10 text-blue-900 mb-4" />
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-6">Pronto para aumentar seus lucros?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Junte-se a mais de 5.000 proprietários que confiam em Lodgra
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register">
              <Button size="lg">Criar Conta Grátis</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
