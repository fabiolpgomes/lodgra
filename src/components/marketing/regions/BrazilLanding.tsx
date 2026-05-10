'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  LucideBarChart3,
  LucideGlobe,
  LucideZap,
  LucideChevronDown,
  LucideChevronRight
} from 'lucide-react'
import { Logo } from '@/components/landing/atoms/Logo'

export const BrazilLanding: React.FC = () => {
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  async function handleCheckout(plan: string) {
    setCheckoutLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, currency: 'brl' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      window.location.href = `/register?plan=${plan}`
    } catch {
      window.location.href = `/register?plan=${plan}`
    } finally {
      setCheckoutLoading(null)
    }
  }

  const currentLang = { code: 'pt-BR', label: 'Brasil', flag: '🇧🇷' }

  const languages = [
    { code: 'pt-BR', label: 'Brasil', flag: '🇧🇷' },
    { code: 'pt', label: 'Portugal', flag: '🇵🇹' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ]

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#3c3c3c] font-light selection:bg-[#1c69d4]/10">
      {/* Navbar - top-nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#ffffff] border-b border-[#e6e6e6]">
        <div className="max-w-[1440px] mx-auto px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <span className="text-[18px] font-bold tracking-tight text-[#262626]">LODGRA</span>
            </div>

            <div className="hidden lg:flex items-center gap-8 text-[14px] font-normal tracking-[0.3px] text-[#262626]">
              <a href="#features" className="hover:text-[#1c69d4] transition-colors">Funcionalidades</a>
              <a href="#comparison" className="hover:text-[#1c69d4] transition-colors">Diferenciais</a>
              <a href="#pricing" className="hover:text-[#1c69d4] transition-colors">Planos</a>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 text-[14px] font-normal tracking-[0.3px] text-[#262626] hover:text-[#1c69d4] transition-colors py-2"
              >
                {currentLang.flag} <span className="hidden sm:inline">{currentLang.label}</span>
                <LucideChevronDown className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangOpen && (
                <div className="absolute top-full right-0 mt-4 bg-[#ffffff] border border-[#e6e6e6] min-w-[170px] shadow-sm rounded-none z-50">
                  {languages.map((lang) => (
                    <Link
                      key={lang.code}
                      href={`/${lang.code}`}
                      className={`flex items-center gap-3 px-4 py-3 text-[14px] transition-colors ${
                        lang.code === 'pt-BR'
                        ? 'bg-[#1c69d4] text-[#ffffff] font-bold'
                        : 'text-[#262626] hover:bg-[#fafafa]'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      {lang.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/login" className="text-[13px] font-bold tracking-[1.5px] uppercase text-[#262626] hover:text-[#1c69d4] transition-colors">
              Entrar
            </Link>
            <a href="#pricing" className="bg-[#1c69d4] text-[#ffffff] rounded-none uppercase font-bold text-[14px] tracking-[0.5px] px-[32px] h-[48px] flex items-center justify-center hover:bg-[#0653b6] transition-colors">
              Ver Planos
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section - hero-band-dark */}
      <section className="relative bg-[#1a2129] pt-[144px] pb-[80px] px-6">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-[80px] items-center">
          <div>
            <h1 className="text-[40px] md:text-[64px] font-bold mb-6 leading-[1.05] text-[#ffffff]">
              Transforme sua propriedade em uma máquina de faturamento.
            </h1>
            <p className="text-[16px] font-light text-[#bbbbbb] mb-[48px] leading-[1.55] max-w-[600px]">
              O PMS definitivo para gestão profissional de aluguel por temporada focada em dados. Escale sua operação com um motor de reserva direta integrado e controle total de calendário e finanças.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a href="#pricing" className="w-full sm:w-auto bg-[#1c69d4] hover:bg-[#0653b6] text-[#ffffff] rounded-none uppercase font-bold text-[14px] tracking-[0.5px] px-[32px] h-[48px] flex items-center justify-center transition-colors">
                Iniciar teste
              </a>
              <a href="#features" className="w-full sm:w-auto bg-transparent border border-[#ffffff] text-[#ffffff] hover:bg-[#ffffff] hover:text-[#1a2129] rounded-none uppercase font-bold text-[14px] tracking-[0.5px] px-[32px] h-[48px] flex items-center justify-center transition-colors">
                Ver demonstração
              </a>
            </div>
            
            <p className="mt-[24px] text-[12px] font-normal tracking-[0.5px] text-[#9a9a9a]">
              Sem trial gratuito · Pague o plano · 7 dias de garantia de reembolso
            </p>
          </div>
          
          <div className="bg-[#262e38] p-[24px] border border-[#3c3c3c] rounded-none w-full hidden md:block">
             <div className="bg-[#1a2129] p-[24px] rounded-none border border-[#3c3c3c]">
                <div className="flex justify-between items-center mb-6 border-b border-[#3c3c3c] pb-4">
                  <h3 className="text-[18px] font-bold text-[#ffffff]">Performance Geral</h3>
                  <div className="text-[12px] font-normal tracking-[0.5px] text-[#22c55e] uppercase">Crescimento +18%</div>
                </div>
                <div className="h-[160px] flex items-end gap-2">
                  {[40, 60, 45, 80, 65, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 bg-[#1c69d4] hover:bg-[#0653b6] transition-colors rounded-none" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 mt-4">
               <div className="bg-[#1a2129] p-[24px] rounded-none border border-[#3c3c3c]">
                  <div className="text-[12px] text-[#9a9a9a] uppercase tracking-[0.5px] mb-2">Receita Direta</div>
                  <div className="text-[24px] font-bold text-[#ffffff]">R$ 32.450</div>
               </div>
               <div className="bg-[#1a2129] p-[24px] rounded-none border border-[#3c3c3c]">
                  <div className="text-[12px] text-[#9a9a9a] uppercase tracking-[0.5px] mb-2">Ocupação</div>
                  <div className="text-[24px] font-bold text-[#ffffff]">78%</div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features - Light canvas */}
      <section id="features" className="py-[80px] px-6 bg-[#ffffff]">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[80px] items-center">
            <div>
              <h2 className="text-[32px] md:text-[48px] font-bold mb-[24px] text-[#262626] leading-[1.1]">
                O coração da sua operação:<br />Reserva Direta e Finanças Claras.
              </h2>
              <p className="text-[16px] font-light text-[#3c3c3c] mb-[32px] leading-[1.55]">
                Pare de perder margem para as OTAs. Lodgra traz um motor de reserva direta robusto e calcula o lucro líquido real por unidade, descontando taxas e impostos automaticamente.
              </p>
              <div className="w-[48px] h-[4px] bg-[#1c69d4] mb-[32px]"></div>
              
              <ul className="space-y-[16px]">
                {[
                  "Motor de Reserva Direta livre de comissões",
                  "Sincronização de Calendário via iCal instantânea",
                  "Dashboard de Profit & Loss (P&L) em tempo real",
                  "Cálculo automático de repasse para proprietários",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-[16px] font-light text-[#262626]">
                    <div className="mt-1 w-[8px] h-[8px] bg-[#1c69d4] rounded-none flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              
              <a href="#comparison" className="inline-flex items-center gap-2 mt-[48px] text-[13px] font-bold uppercase tracking-[1.5px] text-[#262626] hover:text-[#1c69d4] transition-colors">
                VER TODAS FUNCIONALIDADES <LucideChevronRight className="w-4 h-4" />
              </a>
            </div>
            
            <div className="bg-[#fafafa] p-[24px] border border-[#e6e6e6] rounded-none">
               <div className="bg-[#ffffff] p-[24px] border border-[#e6e6e6] rounded-none mb-4">
                  <div className="flex justify-between items-center mb-6 border-b border-[#e6e6e6] pb-4">
                    <h3 className="text-[16px] font-bold text-[#262626] uppercase tracking-[1.5px]">Profit & Loss</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[12px] font-normal tracking-[0.5px] text-[#6b6b6b] mb-1">Receita Mensal</div>
                      <div className="text-[24px] font-bold text-[#262626]">R$ 24.500</div>
                    </div>
                    <div>
                      <div className="text-[12px] font-normal tracking-[0.5px] text-[#6b6b6b] mb-1">Lucro Líquido</div>
                      <div className="text-[24px] font-bold text-[#262626]">R$ 14.230</div>
                    </div>
                  </div>
               </div>
               <div className="bg-[#ffffff] p-[24px] border border-[#e6e6e6] rounded-none h-[180px] flex items-center justify-center">
                  <LucideBarChart3 className="w-16 h-16 text-[#e6e6e6]" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Difference Grid - Surface Soft */}
      <section id="comparison" className="py-[80px] px-6 bg-[#f7f7f7]">
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-[48px]">
            <h2 className="text-[32px] md:text-[48px] font-bold mb-[16px] text-[#262626] leading-[1.1]">Diferenciais de Conversão.</h2>
            <p className="text-[16px] font-light text-[#3c3c3c] leading-[1.55]">Ferramentas essenciais para gestores profissionais operarem no piloto automático.</p>
            <div className="w-[48px] h-[4px] bg-[#1c69d4] mt-[32px]"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
            {[
              {
                icon: <LucideZap className="w-8 h-8 text-[#1c69d4] mb-[24px] stroke-[1.5]" />,
                title: 'Checkout PIX Integrado',
                desc: 'O hóspede paga via PIX, o sistema reconhece o pagamento e confirma a reserva na hora. 100% automatizado.'
              },
              {
                icon: <LucideBarChart3 className="w-8 h-8 text-[#1c69d4] mb-[24px] stroke-[1.5]" />,
                title: 'P&L e Gestão Financeira',
                desc: 'Visualize receitas, despesas e lucro real em um dashboard claro. Emita relatórios detalhados com um clique.'
              },
              {
                icon: <LucideGlobe className="w-8 h-8 text-[#1c69d4] mb-[24px] stroke-[1.5]" />,
                title: 'Booking Direto',
                desc: 'Tenha seu próprio site de reservas otimizado para conversão, sem comissões abusivas das OTAs.'
              },
              {
                icon: <svg className="w-8 h-8 text-[#1c69d4] mb-[24px] stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                title: 'Sincronização iCal',
                desc: 'Mantenha o calendário atualizado em tempo real com Airbnb, Booking, VRBO e outros canais.'
              },
              {
                icon: <svg className="w-8 h-8 text-[#1c69d4] mb-[24px] stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                title: 'Suporte Multi-moeda',
                desc: 'Aceite pagamentos em BRL, USD, EUR e converta automaticamente para facilitar a sua contabilidade.'
              },
              {
                icon: <svg className="w-8 h-8 text-[#1c69d4] mb-[24px] stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>,
                title: 'Split de Pagamentos',
                desc: 'Dinheiro da reserva separado: parte do proprietário, gestor e taxa de limpeza. Zero bitributação.'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-[#ffffff] p-[24px] rounded-none border border-[#e6e6e6] hover:border-[#262626] transition-colors">
                 {feature.icon}
                 <h3 className="text-[18px] font-bold mb-[16px] text-[#262626] leading-[1.4]">{feature.title}</h3>
                 <p className="text-[14px] font-light text-[#3c3c3c] leading-[1.55]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing - Light Canvas */}
      <section id="pricing" className="py-[80px] px-6 bg-[#ffffff]">
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-[48px]">
            <h2 className="text-[32px] md:text-[48px] font-bold mb-[16px] text-[#262626] leading-[1.1]">Planos de Investimento.</h2>
            <p className="text-[16px] font-light text-[#3c3c3c] leading-[1.55]">Preços transparentes, escaláveis e sem taxas de setup.</p>
            <div className="w-[48px] h-[4px] bg-[#1c69d4] mt-[32px]"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
            {[
              {
                name: 'Essencial', price: '59', sub: 'Por unidade/mês',
                description: 'Ideal para iniciar a profissionalização com reservas diretas e iCal.',
                features: ['Motor de Reserva Direta', 'Sync iCal', 'Calendário unificado', 'Gestão básica de reservas'],
                featured: false
              },
              {
                name: 'Expansão', price: '89', sub: 'Por unidade/mês + R$5/reserva',
                description: 'Desbloqueie relatórios financeiros, P&L e automações avançadas.',
                features: ['Tudo do Essencial', 'Relatórios Financeiros', 'Split de Pagamentos', 'Gestão Operacional (Limpeza)'],
                featured: true
              },
              {
                name: 'Pro', price: '130', sub: 'Por unidade/mês + 1% da receita',
                description: 'Inteligência para grandes portfólios e gestão de múltiplos proprietários.',
                features: ['Tudo do Expansão', 'Portal do Proprietário', 'Pricing Dinâmico', 'Suporte Prioritário VIP'],
                featured: false
              }
            ].map((tier) => (
              <div key={tier.name} className={`bg-[#fafafa] p-[32px] rounded-none border transition-colors ${tier.featured ? 'border-[#262626]' : 'border-[#e6e6e6]'}`}>
                {tier.featured && (
                  <div className="mb-[24px] text-[13px] font-bold uppercase tracking-[1.5px] text-[#1c69d4]">
                    MAIS POPULAR
                  </div>
                )}
                <div className="mb-[32px]">
                  <h3 className="text-[24px] font-bold text-[#262626] leading-[1.25] mb-[8px]">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-[32px] font-bold text-[#262626]">R$ {tier.price}</span>
                    <span className="text-[14px] font-light text-[#6b6b6b]">/mês</span>
                  </div>
                  <p className="text-[14px] font-bold text-[#262626] mt-[8px]">{tier.sub}</p>
                  <p className="text-[14px] font-light text-[#3c3c3c] mt-[16px] leading-[1.55] min-h-[44px]">{tier.description}</p>
                </div>
                
                <div className="w-full h-[1px] bg-[#e6e6e6] mb-[32px]"></div>

                <div className="space-y-[16px] flex-1 mb-[48px]">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-start gap-4 text-[14px] font-light text-[#3c3c3c]">
                      <div className="mt-1 w-[6px] h-[6px] bg-[#262626] rounded-none flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                {tier.name === 'Pro' ? (
                  <button
                    disabled
                    className="w-full bg-[#ebebeb] text-[#9a9a9a] rounded-none uppercase font-bold text-[14px] tracking-[0.5px] px-[32px] h-[48px] flex items-center justify-center cursor-not-allowed"
                  >
                    Em breve
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(tier.name === 'Essencial' ? 'starter' : 'growth')}
                    disabled={checkoutLoading !== null}
                    className={`w-full rounded-none uppercase font-bold text-[14px] tracking-[0.5px] px-[32px] h-[48px] flex items-center justify-center transition-colors ${
                      tier.featured 
                        ? 'bg-[#1c69d4] hover:bg-[#0653b6] text-[#ffffff]' 
                        : 'bg-transparent border border-[#262626] text-[#262626] hover:bg-[#262626] hover:text-[#ffffff]'
                    } disabled:opacity-70`}
                  >
                    {checkoutLoading === (tier.name === 'Essencial' ? 'starter' : 'growth')
                      ? 'PROCESSANDO...'
                      : `ESCOLHER ${tier.name.toUpperCase()}`}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-[48px] flex flex-wrap gap-[24px] text-[12px] font-normal tracking-[0.5px] text-[#6b6b6b] border-t border-[#e6e6e6] pt-[24px]">
            <span>Garantia de 7 dias</span>
            <span className="hidden sm:block text-[#cccccc]">|</span>
            <span>Sem contrato de fidelidade</span>
            <span className="hidden sm:block text-[#cccccc]">|</span>
            <span>Cancele quando quiser</span>
          </div>
        </div>
      </section>

      {/* Testimonials - Surface Card */}
      <section className="py-[80px] px-6 bg-[#fafafa]">
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-[48px]">
            <h2 className="text-[32px] md:text-[48px] font-bold mb-[16px] text-[#262626] leading-[1.1]">Gestores que confiam.</h2>
            <p className="text-[16px] font-light text-[#3c3c3c] leading-[1.55]">Mais de 800 propriedades gerenciadas com alta performance diária.</p>
            <div className="w-[48px] h-[4px] bg-[#1c69d4] mt-[32px]"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
             {[
               {
                 quote: "O repasse financeiro e o motor de reserva direta mudaram o jogo para nós. A transparência e a facilidade de recebimento reduziram nossa dor de cabeça em 90%.",
                 initial: "M",
                 name: "Marcelo Santos",
                 role: "Gestor, 12 imóveis em SC"
               },
               {
                 quote: "Testei todos os softwares do mercado, e o Lodgra é disparado o mais rápido e focado em lucro. Entender meu P&L por unidade nunca foi tão claro.",
                 initial: "A",
                 name: "Ana Costa",
                 role: "Proprietária, 5 imóveis em SP"
               },
               {
                 quote: "A sincronização via iCal não falha, e meus clientes adoram o portal do hóspede e o processo de checkout. Excelente suporte e evolução constante.",
                 initial: "R",
                 name: "Ricardo Silva",
                 role: "Host Profissional, RJ"
               }
             ].map((testimonial, i) => (
               <div key={i} className="bg-[#ffffff] p-[32px] rounded-none border border-[#e6e6e6] flex flex-col">
                  <div className="text-[12px] text-[#1c69d4] mb-[24px]">{'★★★★★'}</div>
                  <p className="text-[#3c3c3c] text-[16px] font-light leading-[1.55] mb-[32px] italic">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-[16px] mt-auto">
                     <div className="w-[40px] h-[40px] bg-[#f7f7f7] border border-[#e6e6e6] rounded-none flex items-center justify-center font-bold text-[#262626]">
                       {testimonial.initial}
                     </div>
                     <div>
                       <div className="font-bold text-[14px] text-[#262626]">{testimonial.name}</div>
                       <div className="text-[12px] font-light text-[#6b6b6b]">{testimonial.role}</div>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* CTA final - Dark Band */}
      <section className="bg-[#1a2129] py-[80px] px-6">
        <div className="max-w-[1440px] mx-auto text-center">
          <h2 className="text-[32px] md:text-[48px] font-bold mb-[24px] text-[#ffffff] leading-[1.1] max-w-[800px] mx-auto">
            Pare de lutar com seu software e comece a escalar.
          </h2>
          <p className="text-[16px] font-light text-[#bbbbbb] mb-[48px] max-w-[600px] mx-auto leading-[1.55]">
            Escolha seu plano, pague e teste por 7 dias. Se não ficar satisfeito, devolvemos 100% do valor — sem perguntas.
          </p>
          <div className="flex justify-center">
            <a href="#pricing" className="bg-[#ffffff] text-[#1a2129] hover:bg-[#e6e6e6] rounded-none uppercase font-bold text-[14px] tracking-[0.5px] px-[32px] h-[48px] flex items-center justify-center transition-colors">
              ESCOLHER MEU PLANO
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-[64px] bg-[#f7f7f7] border-t border-[#e6e6e6]">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-[48px] mb-[64px]">
            <div className="max-w-[300px]">
               <div className="flex items-center gap-3 mb-[24px]">
                  <Logo size="sm" />
                  <span className="text-[16px] font-bold text-[#262626] tracking-tight">LODGRA</span>
               </div>
               <p className="text-[#3c3c3c] text-[14px] font-light leading-[1.55]">
                 A plataforma de inteligência financeira para gestores profissionais de aluguel por temporada no Brasil e no mundo.
               </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-[48px] text-[14px] font-light">
               <div className="flex flex-col gap-[16px]">
                  <span className="text-[#9a9a9a] uppercase tracking-[1.5px] text-[12px] font-bold">Produto</span>
                  <a href="#" className="text-[#3c3c3c] hover:text-[#1c69d4] transition-colors">Funcionalidades</a>
                  <a href="#" className="text-[#3c3c3c] hover:text-[#1c69d4] transition-colors">Relatórios</a>
                  <a href="#" className="text-[#3c3c3c] hover:text-[#1c69d4] transition-colors">Precificação</a>
               </div>
               <div className="flex flex-col gap-[16px]">
                  <span className="text-[#9a9a9a] uppercase tracking-[1.5px] text-[12px] font-bold">Empresa</span>
                  <a href="#" className="text-[#3c3c3c] hover:text-[#1c69d4] transition-colors">Sobre</a>
                  <a href="#" className="text-[#3c3c3c] hover:text-[#1c69d4] transition-colors">Suporte</a>
                  <a href="#" className="text-[#3c3c3c] hover:text-[#1c69d4] transition-colors">Blog</a>
               </div>
               <div className="flex flex-col gap-[16px]">
                  <span className="text-[#9a9a9a] uppercase tracking-[1.5px] text-[12px] font-bold">Legal</span>
                  <Link href="/terms" className="text-[#3c3c3c] hover:text-[#1c69d4] transition-colors">Termos</Link>
                  <Link href="/privacy" className="text-[#3c3c3c] hover:text-[#1c69d4] transition-colors">Privacidade</Link>
               </div>
            </div>
          </div>
          <div className="pt-[32px] border-t border-[#e6e6e6] flex flex-col md:flex-row justify-between items-center gap-[24px] text-[#6b6b6b] text-[12px] font-normal tracking-[0.5px]">
            <p>© 2026 LODGRA. All rights reserved.</p>
            <div className="flex gap-[24px]">
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
