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
    <div className="min-h-screen bg-[#ffffff] text-[#181818] font-[family-name:var(--font-hanken-grotesk)] selection:bg-[#ffc000]/20">
      {/* Navbar - top-nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#ffffff] border-b border-[#1E3A8A]/10">
        <div className="max-w-[1440px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Logo size="md" />
            </div>

            <div className="hidden lg:flex items-center gap-8 text-[13px] font-black tracking-[1px] text-[#1E3A8A] uppercase">
              <a href="#features" className="hover:text-[#ffc000] transition-colors">Funcionalidades</a>
              <a href="#comparison" className="hover:text-[#ffc000] transition-colors">Diferenciais</a>
              <a href="#pricing" className="hover:text-[#ffc000] transition-colors">Planos</a>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 text-[13px] font-black tracking-[1px] text-[#1E3A8A] uppercase hover:text-[#ffc000] transition-colors py-2"
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
                      className={`flex items-center gap-3 px-4 py-3 text-[13px] transition-colors uppercase tracking-[1px] ${
                        lang.code === 'pt-BR'
                        ? 'bg-[#1E3A8A] text-[#ffffff] font-black'
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

            <Link href="/login" className="text-[13px] font-black tracking-[1.5px] uppercase text-[#1E3A8A] hover:text-[#ffc000] transition-colors">
              Entrar
            </Link>
            <a href="#pricing" className="bg-[#ffc000] text-[#1E3A8A] rounded-none uppercase font-black text-[14px] tracking-[1px] px-[32px] h-[48px] flex items-center justify-center hover:bg-[#e6ac00] transition-colors">
              Ver Planos
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section - Clinical Performance */}
      <section className="relative bg-[#1E3A8A] pt-[144px] pb-[80px] px-6 border-b border-[#ffffff]/10">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-[80px] items-center">
          <div>
            <h1 className="text-[40px] md:text-[64px] font-black mb-6 leading-[1.05] text-[#ffffff] uppercase tracking-[-1px]">
              PRECISÃO EM GESTÃO.<br />RESULTADOS EM ESCALA.
            </h1>
            <p className="text-[17px] font-light text-[#f8f8f8]/70 mb-[48px] leading-[1.6] max-w-[600px]">
              O PMS definitivo para gestão profissional de aluguel por temporada focada em infraestrutura de dados. Escale sua operação com um motor de reserva direta de alta performance e controle cirúrgico.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a href="#pricing" className="w-full sm:w-auto bg-[#ffc000] hover:bg-[#e6ac00] text-[#1E3A8A] rounded-none uppercase font-black text-[14px] tracking-[1.5px] px-[40px] h-[56px] flex items-center justify-center transition-all">
                Iniciar Operação
              </a>
              <a href="#features" className="w-full sm:w-auto bg-transparent border border-[#ffffff]/20 text-[#ffffff] hover:bg-[#ffffff] hover:text-[#1E3A8A] rounded-none uppercase font-black text-[14px] tracking-[1.5px] px-[40px] h-[56px] flex items-center justify-center transition-all">
                Dossier Técnico
              </a>
            </div>
            
            <p className="mt-[24px] text-[12px] font-normal tracking-[0.5px] text-[#9a9a9a]">
              Sem trial gratuito · Pague o plano · 7 dias de garantia de reembolso
            </p>
          </div>
          
          <div className="bg-[#1a2e6b] p-[32px] border border-[#ffffff]/10 rounded-none w-full hidden lg:block shadow-2xl">
             <div className="bg-[#1E3A8A] p-[32px] rounded-none border border-[#ffffff]/10">
                <div className="flex justify-between items-center mb-6 border-b border-[#ffffff]/10 pb-4">
                  <h3 className="text-[14px] font-black text-[#ffffff] uppercase tracking-[2px]">Métrica de Performance</h3>
                  <div className="text-[12px] font-black tracking-[1px] text-[#059669] uppercase bg-[#059669]/10 px-3 py-1">CRESCIMENTO +18.4%</div>
                </div>
                <div className="h-[160px] flex items-end gap-3">
                  {[40, 60, 45, 80, 65, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 bg-[#ffc000] hover:bg-[#e6ac00] transition-all rounded-none" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 mt-4">
               <div className="bg-[#1E3A8A] p-[24px] rounded-none border border-[#ffffff]/10">
                  <div className="text-[11px] text-[#ffffff]/50 uppercase font-black tracking-[1.5px] mb-2">Receita Direta</div>
                  <div className="text-[28px] font-black text-[#ffffff] tracking-tight">R$ 32.450</div>
               </div>
               <div className="bg-[#1E3A8A] p-[24px] rounded-none border border-[#ffffff]/10">
                  <div className="text-[11px] text-[#ffffff]/50 uppercase font-black tracking-[1.5px] mb-2">Ocupação</div>
                  <div className="text-[28px] font-black text-[#ffffff] tracking-tight">78.2%</div>
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
              <h2 className="text-[32px] md:text-[48px] font-black mb-[24px] text-[#1E3A8A] leading-[1.1] uppercase tracking-[-0.5px]">
                INFRAESTRUTURA<br />DE ALTA PERFORMANCE.
              </h2>
              <p className="text-[17px] font-light text-[#181818] mb-[32px] leading-[1.6]">
                Elimine a dependência de intermediários. O Lodgra integra um motor de reserva direta de grau industrial que processa dados financeiros e operacionais com precisão cirúrgica.
              </p>
              <div className="w-[64px] h-[4px] bg-[#ffc000] mb-[32px]"></div>
              
              <ul className="space-y-[16px]">
                {[
                  "Motor de Reserva Direta com latência zero",
                  "Sincronização Atômica via iCal real-time",
                  "Dashboard P&L com granularidade total",
                  "Cálculo de repasse via algoritmo proprietário",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-[15px] font-black text-[#1E3A8A] uppercase tracking-[0.5px]">
                    <div className="mt-1.5 w-[10px] h-[10px] bg-[#ffc000] rounded-none flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              
              <a href="#comparison" className="inline-flex items-center gap-2 mt-[48px] text-[13px] font-black uppercase tracking-[1.5px] text-[#1E3A8A] hover:text-[#ffc000] transition-colors border-b-2 border-[#ffc000] pb-1">
                ESPECIFICAÇÕES TÉCNICAS <LucideChevronRight className="w-4 h-4" />
              </a>
            </div>
            
            <div className="bg-[#fafafa] p-[24px] border border-[#e6e6e6] rounded-none">
               <div className="bg-[#ffffff] p-[24px] border border-[#e6e6e6] rounded-none mb-4">
                  <div className="flex justify-between items-center mb-6 border-b border-[#e6e6e6] pb-4">
                    <h3 className="text-[16px] font-bold text-[#262626] uppercase tracking-[1.5px]">Profit & Loss</h3>
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[11px] font-black tracking-[1.5px] text-[#1E3A8A]/50 mb-1 uppercase">Receita Bruta</div>
                      <div className="text-[24px] font-black text-[#1E3A8A]">R$ 24.500</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black tracking-[1.5px] text-[#059669] mb-1 uppercase">Eficiência Líquida</div>
                      <div className="text-[24px] font-black text-[#059669]">R$ 14.230</div>
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
          <div className="mb-[64px]">
            <h2 className="text-[32px] md:text-[48px] font-black mb-[16px] text-[#1E3A8A] leading-[1.1] uppercase tracking-[-0.5px]">DIFERENCIAIS TÉCNICOS.</h2>
            <p className="text-[17px] font-light text-[#181818] leading-[1.6]">Ferramentas de engenharia para gestores que operam com rigor profissional.</p>
            <div className="w-[64px] h-[4px] bg-[#ffc000] mt-[32px]"></div>
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
              <div key={i} className="bg-[#ffffff] p-[32px] rounded-none border border-[#1E3A8A]/10 hover:border-[#ffc000] transition-all group">
                 {React.cloneElement(feature.icon as React.ReactElement<React.SVGProps<SVGSVGElement>, 'svg'>, { className: 'w-10 h-10 text-[#1E3A8A] mb-[24px] stroke-[2] group-hover:text-[#ffc000] transition-colors' })}
                 <h3 className="text-[18px] font-black mb-[16px] text-[#1E3A8A] leading-[1.4] uppercase tracking-[0.5px]">{feature.title}</h3>
                 <p className="text-[14px] font-light text-[#181818]/80 leading-[1.6]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing - Light Canvas */}
      <section id="pricing" className="py-[80px] px-6 bg-[#ffffff]">
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-[64px]">
            <h2 className="text-[32px] md:text-[48px] font-black mb-[16px] text-[#1E3A8A] leading-[1.1] uppercase tracking-[-0.5px]">PLANOS DE INVESTIMENTO.</h2>
            <p className="text-[17px] font-light text-[#181818] leading-[1.6]">Infraestrutura escalável com precificação transparente.</p>
            <div className="w-[64px] h-[4px] bg-[#ffc000] mt-[32px]"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
            {[
              {
                name: 'Essencial', price: '59', sub: 'por unidade / mes',
                description: 'Ideal para iniciar a profissionalização com reservas diretas e iCal.',
                features: ['Motor de Reserva Direta', 'Sync iCal', 'Calendário unificado', 'Gestão básica de reservas'],
                featured: false
              },
              {
                name: 'Expansão', price: '89', sub: 'por unidade / mes + R$5 / reserva',
                description: 'Desbloqueie relatórios financeiros, P&L e automações avançadas.',
                features: ['Tudo do Essencial', 'Relatórios Financeiros', 'Split de Pagamentos', 'Gestão Operacional (Limpeza)'],
                featured: true
              },
              {
                name: 'Pro', price: '130', sub: 'por unidade / mes + 1% da receita',
                description: 'Inteligência para grandes portfólios e gestão de múltiplos proprietários.',
                features: ['Tudo do Expansão', 'Portal do Proprietário', 'Pricing Dinâmico', 'Suporte Prioritário VIP'],
                featured: false
              }
            ].map((tier) => (
              <div key={tier.name} className={`bg-[#ffffff] p-[40px] rounded-none border transition-all ${tier.featured ? 'border-[#1E3A8A] shadow-xl' : 'border-[#1E3A8A]/10'}`}>
                {tier.featured && (
                  <div className="mb-[24px] text-[11px] font-black uppercase tracking-[2px] text-[#ffc000] bg-[#1E3A8A] inline-block px-3 py-1">
                    MAIS POPULAR
                  </div>
                )}
                <div className="mb-[32px]">
                  <h3 className="text-[28px] font-black text-[#1E3A8A] leading-[1.1] mb-[8px] uppercase">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-[40px] font-black text-[#1E3A8A] tracking-tighter">R$ {tier.price}</span>
                    <span className="text-[14px] font-light text-[#181818]/60">/unidade</span>
                  </div>
                  <p className="text-[12px] font-black text-[#059669] bg-[#059669]/5 inline-block px-2 py-0.5 mt-[8px] uppercase tracking-[1px]">{tier.sub}</p>
                  <p className="text-[15px] font-light text-[#181818]/80 mt-[24px] leading-[1.6] min-h-[44px]">{tier.description}</p>
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
                    className="w-full bg-[#ffffff] text-[#ef4444] border border-[#ef4444]/20 rounded-none uppercase font-black text-[14px] tracking-[1.5px] px-[32px] h-[56px] flex items-center justify-center cursor-not-allowed"
                  >
                    Em breve
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(tier.name === 'Essencial' ? 'starter' : 'growth')}
                    disabled={checkoutLoading !== null}
                    className={`w-full rounded-none uppercase font-black text-[14px] tracking-[1.5px] px-[32px] h-[56px] flex items-center justify-center transition-all ${
                      tier.featured 
                        ? 'bg-[#1E3A8A] hover:bg-[#152a66] text-[#ffc000]' 
                        : 'bg-transparent border-2 border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-[#ffffff]'
                    } disabled:opacity-70`}
                  >
                    {checkoutLoading === (tier.name === 'Essencial' ? 'starter' : 'growth')
                      ? 'PROCESSANDO...'
                      : `ATIVAR ${tier.name.toUpperCase()}`}
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
          <div className="mb-[64px]">
            <h2 className="text-[32px] md:text-[48px] font-black mb-[16px] text-[#1E3A8A] leading-[1.1] uppercase tracking-[-0.5px]">RELATOS DE PERFORMANCE.</h2>
            <p className="text-[17px] font-light text-[#181818] leading-[1.6]">Gestores que operam no limite da eficiência.</p>
            <div className="w-[64px] h-[4px] bg-[#ffc000] mt-[32px]"></div>
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
               <div key={i} className="bg-[#ffffff] p-[40px] rounded-none border border-[#1E3A8A]/10 flex flex-col hover:border-[#ffc000] transition-all">
                  <div className="text-[12px] text-[#ffc000] mb-[24px]">{'★★★★★'}</div>
                  <p className="text-[#181818] text-[16px] font-light leading-[1.6] mb-[32px] italic">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-[16px] mt-auto">
                     <div className="w-[48px] h-[48px] bg-[#1E3A8A] text-[#ffffff] rounded-none flex items-center justify-center font-black text-[16px]">
                       {testimonial.initial}
                     </div>
                     <div>
                       <div className="font-black text-[14px] text-[#1E3A8A] uppercase tracking-[0.5px]">{testimonial.name}</div>
                       <div className="text-[12px] font-light text-[#181818]/60">{testimonial.role}</div>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* CTA final - Clinical Performance */}
      <section className="bg-[#1E3A8A] py-[120px] px-6 border-t border-[#ffc000]/20">
        <div className="max-w-[1440px] mx-auto text-center">
          <h2 className="text-[32px] md:text-[56px] font-black mb-[24px] text-[#ffffff] leading-[1.1] max-w-[900px] mx-auto uppercase tracking-[-1px]">
            ENCERRE A INEFICIÊNCIA.<br />DOMINE SUA OPERAÇÃO.
          </h2>
          <p className="text-[18px] font-light text-[#f8f8f8]/60 mb-[64px] max-w-[700px] mx-auto leading-[1.6]">
            Implemente a infraestrutura LODGRA hoje. 7 dias de garantia total de performance.
          </p>
          <div className="flex justify-center">
            <a href="#pricing" className="bg-[#ffc000] text-[#1E3A8A] hover:bg-[#e6ac00] rounded-none uppercase font-black text-[16px] tracking-[2px] px-[48px] h-[64px] flex items-center justify-center transition-all shadow-lg">
              ATIVAR AGORA
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-[64px] bg-[#f7f7f7] border-t border-[#e6e6e6]">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-[48px] mb-[64px]">
            <div className="max-w-[300px]">
               <div className="flex items-center gap-3 mb-[32px]">
                  <Logo size="sm" />
               </div>
               <p className="text-[#181818]/60 text-[14px] font-light leading-[1.6]">
                 A infraestrutura de inteligência financeira para gestores profissionais que não aceitam menos que a excelência.
               </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-[48px] text-[13px] font-black uppercase tracking-[1px]">
               <div className="flex flex-col gap-[16px]">
                  <span className="text-[#1E3A8A]/30 text-[11px]">Sistema</span>
                  <a href="#" className="text-[#1E3A8A] hover:text-[#ffc000] transition-colors">Dossier</a>
                  <a href="#" className="text-[#1E3A8A] hover:text-[#ffc000] transition-colors">Performance</a>
                  <a href="#" className="text-[#1E3A8A] hover:text-[#ffc000] transition-colors">Rede</a>
               </div>
               <div className="flex flex-col gap-[16px]">
                  <span className="text-[#1E3A8A]/30 text-[11px]">Empresa</span>
                  <a href="#" className="text-[#1E3A8A] hover:text-[#ffc000] transition-colors">Engenharia</a>
                  <a href="#" className="text-[#1E3A8A] hover:text-[#ffc000] transition-colors">Base</a>
                  <a href="#" className="text-[#1E3A8A] hover:text-[#ffc000] transition-colors">Log</a>
               </div>
               <div className="flex flex-col gap-[16px]">
                  <span className="text-[#1E3A8A]/30 text-[11px]">Legal</span>
                  <Link href="/terms" className="text-[#1E3A8A] hover:text-[#ffc000] transition-colors">Protocolo</Link>
                  <Link href="/privacy" className="text-[#1E3A8A] hover:text-[#ffc000] transition-colors">Privacidade</Link>
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
