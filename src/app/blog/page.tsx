import { ArrowRight, Calendar, User } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import Link from 'next/link'

const blogPosts = [
  {
    id: 1,
    title: 'Como Aumentar sua Renda em 30% com Pricing Dinâmico',
    excerpt: 'Aprenda a usar algoritmos inteligentes para definir preços que maximizam seus lucros sem afastar hóspedes.',
    author: 'Pedro Silva',
    date: '21 de maio de 2026',
    category: 'Pricing',
    slug: 'pricing-dinamico',
  },
  {
    id: 2,
    title: 'Guia Completo: Sincronizando com Airbnb e Booking',
    excerpt: 'Passo a passo para integrar suas propriedades com as maiores plataformas e gerenciar tudo em um só lugar.',
    author: 'Maria Santos',
    date: '20 de maio de 2026',
    category: 'Integração',
    slug: 'sincronizar-airbnb-booking',
  },
  {
    id: 3,
    title: 'Tendências de Turismo 2026: O que Esperar',
    excerpt: 'Análise das principais tendências no mercado de aluguel de curta duração e como se preparar.',
    author: 'João Costa',
    date: '18 de maio de 2026',
    category: 'Tendências',
    slug: 'tendencias-2026',
  },
  {
    id: 4,
    title: '5 Erros Comuns que Diminuem seus Lucros',
    excerpt: 'Descubra os erros mais frequentes na gestão de imóveis e como evitá-los facilmente.',
    author: 'Ana Lima',
    date: '15 de maio de 2026',
    category: 'Dicas',
    slug: 'erros-comuns',
  },
  {
    id: 5,
    title: 'Automação para Proprietários: Economize 10h por Semana',
    excerpt: 'Como usar automação para delegar tarefas repetitivas e focar no crescimento do seu negócio.',
    author: 'Carlos Mendes',
    date: '12 de maio de 2026',
    category: 'Automação',
    slug: 'automacao-proprietarios',
  },
  {
    id: 6,
    title: 'Compliance Fiscal: Tudo que Proprietários Precisam Saber',
    excerpt: 'Guia sobre impostos, declarações e obrigações fiscais para quem aluga imóveis.',
    author: 'Beatriz Oliveira',
    date: '10 de maio de 2026',
    category: 'Fiscal',
    slug: 'compliance-fiscal',
  },
]

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-900 to-brand-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Blog Lodgra
          </h1>
          <p className="text-xl text-brand-100 max-w-2xl">
            Artigos, dicas e tendências sobre gestão de imóveis, pricing dinâmico e maximização de lucros.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
            <div className="md:flex">
              <div className="md:w-1/3 bg-gradient-to-r from-brand-900 to-brand-800" />
              <div className="p-8 md:w-2/3">
                <span className="inline-block px-3 py-1 bg-[color:var(--be-blue-pale)] text-brand-900 rounded-full text-sm font-semibold mb-4">
                  {blogPosts[0].category}
                </span>
                <h2 className="text-3xl font-bold mb-4">{blogPosts[0].title}</h2>
                <p className="text-gray-600 mb-6">{blogPosts[0].excerpt}</p>
                <div className="flex items-center gap-6 text-sm text-gray-600 mb-6">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {blogPosts[0].author}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {blogPosts[0].date}
                  </span>
                </div>
                <Link href={`#${blogPosts[0].slug}`} className="inline-flex items-center gap-2 text-brand-900 font-semibold hover:gap-3 transition">
                  Ler artigo completo <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-12">Artigos Recentes</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(1).map((post) => (
              <article
                key={post.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
              >
                <div className="bg-gradient-to-r from-gray-300 to-gray-400 h-48" />
                <div className="p-6">
                  <span className="inline-block px-3 py-1 bg-[color:var(--be-blue-pale)] text-brand-900 rounded-full text-xs font-semibold mb-3">
                    {post.category}
                  </span>
                  <h3 className="text-xl font-bold mb-3 line-clamp-2">{post.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                  </div>
                  <Link href={`#${post.slug}`} className="text-brand-900 font-semibold hover:underline flex items-center gap-2">
                    Ler mais <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-brand-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Receba Dicas Exclusivas</h2>
          <p className="text-lg text-brand-100 mb-8">
            Inscreva-se na nossa newsletter e receba artigos, tendências e dicas exclusivas direto no seu email.
          </p>
          <div className="flex gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="seu@email.com"
              className="flex-1 px-4 py-3 rounded text-gray-900"
            />
            <Button variant="secondary">Inscrever</Button>
          </div>
        </div>
      </section>
    </main>
  )
}
