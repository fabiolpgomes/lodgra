import { BookOpen, Zap, BarChart3, Settings, Shield, HelpCircle } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import Link from 'next/link'

const docCategories = [
  {
    icon: BookOpen,
    title: 'Guia de Início Rápido',
    description: 'Configure sua primeira propriedade em 5 minutos',
    topics: [
      'Criar conta',
      'Adicionar propriedade',
      'Sincronizar com Airbnb/Booking',
    ],
  },
  {
    icon: Zap,
    title: 'Automação',
    description: 'Automatize suas operações com workflows inteligentes',
    topics: [
      'Configurar sincronização',
      'Criar automações',
      'Webhooks',
    ],
  },
  {
    icon: BarChart3,
    title: 'Análise de Dados',
    description: 'Entenda seus dados e tome melhores decisões',
    topics: [
      'Dashboard de lucros',
      'Relatórios personalizados',
      'Exportar dados',
    ],
  },
  {
    icon: Settings,
    title: 'Configurações',
    description: 'Customize Lodgra de acordo com suas necessidades',
    topics: [
      'Preferências de conta',
      'Integrações',
      'Equipe e permissões',
    ],
  },
  {
    icon: Shield,
    title: 'Segurança',
    description: 'Proteja seus dados e operações',
    topics: [
      'Autenticação 2FA',
      'Permissões de usuário',
      'Backup de dados',
    ],
  },
  {
    icon: HelpCircle,
    title: 'FAQ',
    description: 'Respostas para as perguntas mais comuns',
    topics: [
      'Suporte técnico',
      'Problemas comuns',
      'Contatar suporte',
    ],
  },
]

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Documentação Completa
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl">
            Guias passo a passo, tutoriais em vídeo e referência técnica para você aproveitar ao máximo Lodgra.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Button size="lg" variant="secondary">
              Explorar Docs
            </Button>
            <Button size="lg" variant="outline">
              Ver Vídeos
            </Button>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <input
            type="text"
            placeholder="Buscar na documentação..."
            className="w-full px-6 py-3 rounded-lg border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {docCategories.map((category) => {
              const Icon = category.icon
              return (
                <div
                  key={category.title}
                  className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-lg transition cursor-pointer"
                >
                  <Icon className="w-10 h-10 text-blue-900 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{category.title}</h3>
                  <p className="text-gray-600 mb-6">{category.description}</p>
                  <ul className="space-y-2 mb-6">
                    {category.topics.map((topic) => (
                      <li key={topic} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="w-1 h-1 bg-blue-900 rounded-full" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                  <Link href="#" className="text-blue-900 font-semibold hover:underline">
                    Ler mais →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-50 py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">Ainda tem dúvidas?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Nosso time de suporte está pronto para ajudar
          </p>
          <Link href="mailto:support@lodgra.io">
            <Button size="lg">Enviar Email para Suporte</Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
