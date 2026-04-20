'use client'

import React from 'react'
import Link from 'next/link'
import {
  LucideBarChart3,
  LucideGlobe,
  LucideSmartphone,
  LucideZap,
  LucideArrowRight,
  LucideCheckCircle2,
  LucideTrendingUp,
  LucideChevronDown
} from 'lucide-react'
import { Logo } from '@/components/landing/atoms/Logo'
import { useState } from 'react'

export const BrazilLanding: React.FC = () => {
  const [isLangOpen, setIsLangOpen] = useState(false)

  const currentLang = { code: 'pt-BR', label: 'Brasil', flag: '🇧🇷' }

  const languages = [
    { code: 'pt-BR', label: 'Brasil', flag: '🇧🇷' },
    { code: 'pt', label: 'Portugal', flag: '🇵🇹' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ]

  return (
    <div className="min-h-screen bg-white text-lodgra-dark font-lodgra-body selection:bg-lodgra-blue/10">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-lodgra-gray bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <span className="text-3xl font-bold tracking-tight text-lodgra-blue font-lodgra-heading">LODGRA</span>
            </div>

            <div className="hidden lg:flex items-center gap-10 text-sm font-semibold text-lodgra-dark">
              <a href="#features" className="hover:text-lodgra-blue transition-colors">Funcionalidades</a>
              <a href="#comparison" className="hover:text-lodgra-blue transition-colors">Diferenciais</a>
              <a href="#pricing" className="hover:text-lodgra-blue transition-colors">Planos</a>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Seletor de Idioma */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 text-sm font-bold text-lodgra-dark hover:text-lodgra-blue transition-colors py-2"
              >
                {currentLang.flag} <span className="hidden sm:inline">{currentLang.label}</span>
                <LucideChevronDown className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-lodgra-gray rounded-xl shadow-xl overflow-hidden min-w-[170px] animate-fade-in">
                  {languages.map((lang) => (
                    <Link
                      key={lang.code}
                      href={`/${lang.code}`}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${
                        lang.code === 'pt-BR'
                        ? 'bg-lodgra-blue text-white'
                        : 'text-lodgra-dark hover:bg-lodgra-gray'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      {lang.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/login" className="hidden sm:inline-block text-sm font-bold text-lodgra-blue hover:opacity-80 transition-opacity">Entrar</Link>
            <Link href="/register" className="px-6 py-2.5 bg-lodgra-blue text-white text-sm font-bold rounded-full hover:bg-lodgra-blue/90 transition-all shadow-md active:scale-95">
              Começar Agora
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lodgra-gray border border-zinc-200 text-lodgra-blue text-xs font-bold tracking-wider uppercase mb-10">
            A Inteligência que a sua gestão merece
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-8 leading-[1.15] text-lodgra-blue font-lodgra-heading">
            Transforme sua propriedade em uma <br />
            <span className="text-lodgra-gold">máquina de faturamento.</span>
          </h1>

          <p className="text-lg md:text-xl text-lodgra-dark max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Gestão profissional de aluguel por temporada focada em dados, não em palpites. Lodgra é a plataforma definitiva para quem busca escala e prosperidade.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link href="/register" className="w-full sm:w-auto px-10 py-4 bg-lodgra-gold hover:bg-lodgra-gold/90 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group text-lg">
              Ver demonstração gratuita
              <LucideArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features" className="w-full sm:w-auto px-10 py-4 bg-white hover:bg-lodgra-gray text-lodgra-blue font-bold rounded-xl transition-all border border-zinc-200">
              Conhecer recursos
            </a>
          </div>

          <div className="mt-20 flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="font-lodgra-heading font-bold text-xl">AIRBNB</span>
            <span className="font-lodgra-heading font-bold text-xl">BOOKING.COM</span>
            <span className="font-lodgra-heading font-bold text-xl">VRBO</span>
            <span className="font-lodgra-heading font-bold text-xl">EXPEDIA</span>
          </div>
        </div>
      </section>

      {/* Features - The "Lacuna" focus */}
      <section id="features" className="py-24 px-6 bg-lodgra-gray">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6 text-lodgra-blue font-lodgra-heading">
                Relatórios financeiros que <br />o Stays não te entrega.
              </h2>
              <p className="text-lg text-lodgra-dark mb-8 leading-relaxed">
                Pare de apenas &ldquo;tentar entender&rdquo; quanto sobrou no fim do mês. Lodgra calcula o lucro líquido real por unidade, descontando taxas, limpeza e impostos automaticamente.
              </p>
                <ul className="space-y-4">
                {[
                  "Recebimento via PIX nativo com baixa automática",
                  "Dashboard de Profit & Loss (P&L) em tempo real",
                  "Cálculo automático de repasse para proprietários",
                  "Análise comparativa de ADR e Taxa de Ocupação",
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 font-semibold text-lodgra-blue">
                    <div className="mt-1 w-5 h-5 bg-lodgra-gold/10 rounded-full flex items-center justify-center">
                        <LucideCheckCircle2 className="w-4 h-4 text-lodgra-gold" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-[32px] p-8 shadow-xl border border-zinc-100 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                 <LucideBarChart3 className="w-40 h-40" />
               </div>
               <div className="relative z-10">
                 <div className="flex gap-4 mb-8">
                    <div className="h-24 flex-1 bg-lodgra-gray rounded-2xl border border-zinc-100 p-4">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">Receita Mensal</div>
                      <div className="text-2xl font-bold text-lodgra-blue">R$ 24.500</div>
                      <div className="text-[10px] text-lodgra-green font-bold mt-1">+12% vs last mo.</div>
                    </div>
                    <div className="h-24 flex-1 bg-lodgra-gray rounded-2xl border border-zinc-100 p-4">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">Lucro Líquido</div>
                      <div className="text-2xl font-bold text-lodgra-gold">R$ 14.230</div>
                      <div className="text-[10px] text-lodgra-green font-bold mt-1">Real Margin: 58%</div>
                    </div>
                 </div>
                 <div className="h-48 w-full bg-lodgra-gray rounded-2xl border border-zinc-100 flex items-center justify-center">
                    <LucideTrendingUp className="w-12 h-12 text-lodgra-blue opacity-20" />
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Difference Grid */}
      <section id="comparison" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-lodgra-blue font-lodgra-heading">Criado para a realidade do Brasil.</h2>
            <p className="text-lg text-lodgra-dark">Simplicidade global com motor de recebimento local.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white border border-zinc-200 hover:border-lodgra-gold transition-all group">
               <LucideZap className="w-10 h-10 text-lodgra-blue mb-6 stroke-[1.5]" />
               <h3 className="text-xl font-bold mb-4 text-lodgra-blue font-lodgra-heading">Checkout PIX Integrado</h3>
               <p className="text-zinc-600 leading-relaxed text-sm">
                 Chega de conferir extrato. O hóspede paga via PIX, o sistema reconhece o pagamento pelo Asaas e confirma a reserva na hora. <strong>100% automatizado.</strong>
               </p>
            </div>
            <div className="p-8 rounded-3xl bg-white border border-zinc-200 hover:border-lodgra-gold transition-all group border-lodgra-blue">
               <LucideBarChart3 className="w-10 h-10 text-lodgra-blue mb-6 stroke-[1.5]" />
               <h3 className="text-xl font-bold mb-4 text-lodgra-blue font-lodgra-heading">Split de Pagamentos</h3>
               <p className="text-zinc-600 leading-relaxed text-sm">
                 Para gestores profissionais. O dinheiro da reserva já cai separado: parte do proprietário, parte do gestor e taxa de limpeza. Transparência total via Pagar.me.
               </p>
            </div>
            <div className="p-8 rounded-3xl bg-white border border-zinc-200 hover:border-lodgra-gold transition-all group">
               <LucideGlobe className="w-10 h-10 text-lodgra-blue mb-6 stroke-[1.5]" />
               <h3 className="text-xl font-bold mb-4 text-lodgra-blue font-lodgra-heading">Localização de Verdade</h3>
               <p className="text-zinc-600 leading-relaxed text-sm">
                 Emissão automatizada de Nota Fiscal (NFS-e), suporte local via WhatsApp e conformidade total com as leis brasileiras de hospedagem.
               </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-lodgra-gray">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-lodgra-blue font-lodgra-heading">Investimento para prosperar.</h2>
            <p className="text-lg text-lodgra-dark">Preços transparentes, escaláveis e sem taxas de setup gringas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter', price: '97', sub: 'Até 3 imóveis',
                features: ['Gestão de Canais Nativa', 'Site de Reserva Direta', 'Relatórios Básicos', 'Suporte E-mail'],
                featured: false
              },
              {
                name: 'Professional', price: '297', sub: 'Até 10 imóveis',
                features: ['Tudo do Starter', 'Relatórios Financeiros Avançados', 'Gestão Operacional', 'Suporte WhatsApp 1:1'],
                featured: true
              },
              {
                name: 'Enterprise', price: '497', sub: '10+ (Base)',
                features: ['Tudo do Professional', 'Multi-usuários Ilimitados', 'Portal do Proprietário', 'Sucesso do Cliente Dedicado'],
                featured: false
              }
            ].map((tier) => (
              <div key={tier.name} className={`p-10 rounded-[32px] bg-white border-2 flex flex-col transition-all hover:shadow-2xl ${tier.featured ? 'border-lodgra-gold scale-105 shadow-xl relative z-10' : 'border-zinc-100'}`}>
                {tier.featured && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-lodgra-gold text-white px-4 py-1 text-xs font-bold uppercase tracking-widest rounded-full">
                    Mais recomendado
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-lodgra-blue font-lodgra-heading">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-5xl font-bold text-lodgra-blue">R$ {tier.price}</span>
                    <span className="text-zinc-400 font-medium text-sm">/mês</span>
                  </div>
                  <p className="text-lodgra-gold font-bold text-sm mt-2">{tier.sub}</p>
                </div>
                <div className="space-y-5 flex-1 mb-10 text-[15px]">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-center gap-3 font-medium text-lodgra-dark">
                      <LucideCheckCircle2 className="w-5 h-5 text-lodgra-green" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link href="/register" className={`w-full py-4 text-center rounded-xl font-bold transition-all ${tier.featured ? 'bg-lodgra-blue text-white hover:bg-lodgra-blue/90' : 'bg-lodgra-gray text-lodgra-blue hover:bg-zinc-200'}`}>
                  Escolher plano {tier.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-lodgra-blue font-lodgra-heading">
            Pare de lutar com seu software e comece a escalar.
          </h2>
          <p className="text-xl text-lodgra-dark mb-12 max-w-2xl mx-auto">
            Junte-se aos gestores que decidiram pela inteligência e design em sua operação de aluguel por temporada.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <Link href="/register" className="px-12 py-5 bg-lodgra-blue text-white font-bold rounded-xl text-xl shadow-xl hover:shadow-lodgra-blue/20 transition-all">
              Criar minha conta grátis
            </Link>
            <div className="flex items-center gap-4">
               <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-zinc-200" />
                  ))}
               </div>
               <span className="text-sm font-bold text-zinc-500 underline">+800 gestores ativos</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-lodgra-gray bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
            <div className="max-w-xs">
               <div className="flex items-center gap-3 mb-6">
                  <Logo size="sm" />
                  <span className="text-xl font-bold text-lodgra-blue font-lodgra-heading">LODGRA</span>
               </div>
               <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                 A plataforma de inteligência financeira para gestores profissionais de aluguel por temporada no Brasil e no mundo.
               </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-12 text-sm font-semibold">
               <div className="flex flex-col gap-4">
                  <span className="text-zinc-400 uppercase tracking-widest text-[10px]">Produto</span>
                  <a href="#" className="text-lodgra-dark hover:text-lodgra-blue">Funcionalidades</a>
                  <a href="#" className="text-lodgra-dark hover:text-lodgra-blue">Relatórios</a>
                  <a href="#" className="text-lodgra-dark hover:text-lodgra-blue">Precificação</a>
               </div>
               <div className="flex flex-col gap-4">
                  <span className="text-zinc-400 uppercase tracking-widest text-[10px]">Empresa</span>
                  <a href="#" className="text-lodgra-dark hover:text-lodgra-blue">Sobre</a>
                  <a href="#" className="text-lodgra-dark hover:text-lodgra-blue">Suporte</a>
                  <a href="#" className="text-lodgra-dark hover:text-lodgra-blue">Blog</a>
               </div>
               <div className="flex flex-col gap-4">
                  <span className="text-zinc-400 uppercase tracking-widest text-[10px]">Legal</span>
                  <Link href="/terms" className="text-lodgra-dark hover:text-lodgra-blue">Termos</Link>
                  <Link href="/privacy" className="text-lodgra-dark hover:text-lodgra-blue">Privacidade</Link>
               </div>
            </div>
          </div>
          <div className="pt-12 border-t border-lodgra-gray flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-400 text-xs font-bold">
            <p>© 2026 LODGRA. All rights reserved.</p>
            <div className="flex gap-8">
               <span>Portugal</span>
               <span>Brasil</span>
               <span>Spain</span>
               <span>USA</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
