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
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ]
  const visibleLanguages = languages.filter((lang) => lang.code === 'pt-BR')

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#181818] font-[family-name:var(--font-hanken-grotesk)] selection:bg-be-blue/20">
      {/* Navbar - top-nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#ffffff] border-b border-be-blue/10">
        <div className="max-w-[1440px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Logo size="md" />
            </div>

            <div className="hidden lg:flex items-center gap-8 text-[13px] font-black tracking-[1px] text-lodgra-blue uppercase">
              <a href="#features" className="hover:text-be-blue transition-colors">Funcionalidades</a>
              <a href="#comparison" className="hover:text-be-blue transition-colors">Diferenciais</a>
              <a href="#pricing" className="hover:text-be-blue transition-colors">Planos</a>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 text-[13px] font-black tracking-[1px] text-lodgra-blue uppercase hover:text-be-blue transition-colors py-2"
              >
                {currentLang.flag} <span className="hidden sm:inline">{currentLang.label}</span>
                <LucideChevronDown className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangOpen && (
                <div className="absolute top-full right-0 mt-4 bg-[#ffffff] border border-[#e6e6e6] min-w-[170px] shadow-sm rounded-none z-50">
                  {visibleLanguages.map((lang) => (
                    <Link
                      key={lang.code}
                      href={`/${lang.code}`}
                      className={`flex items-center gap-3 px-4 py-3 text-[13px] transition-colors uppercase tracking-[1px] ${
                        lang.code === 'pt-BR'
                        ? 'bg-lodgra-blue text-[#ffffff] font-black'
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

            <Link href="/pt-BR/login" className="text-[13px] font-black tracking-[1.5px] uppercase text-lodgra-blue hover:text-be-blue transition-colors">
              Entrar
            </Link>
            <a href="#pricing" className="bg-be-blue text-lodgra-blue rounded-none uppercase font-black text-[14px] tracking-[1px] px-8 h-[48px] flex items-center justify-center hover:bg-[#e6ac00] transition-colors">
              Ver Planos
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section - Clinical Performance */}
      <section className="relative bg-lodgra-blue pt-36 pb-20 px-6 border-b border-[#ffffff]/10">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h1 className="text-[40px] md:text-[64px] font-black mb-6 leading-[1.05] text-[#ffffff] uppercase tracking-[-1px]">
              PRECISÃO EM GESTÃO.<br />RESULTADOS EM ESCALA.
            </h1>
            <p className="text-[17px] font-light text-[#f8f8f8]/70 mb-12 leading-[1.6] max-w-[600px]">
              O PMS definitivo para gestão profissional de aluguel por temporada focada em infraestrutura de dados. Escale sua operação com um motor de reserva direta de alta performance e controle cirúrgico.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a href="#pricing" className="w-full sm:w-auto bg-be-blue hover:bg-[#e6ac00] text-lodgra-blue rounded-none uppercase font-black text-[14px] tracking-[1.5px] px-10 h-[56px] flex items-center justify-center transition-all">
                Iniciar Operação
              </a>
              <a href="#features" className="w-full sm:w-auto bg-transparent border border-[#ffffff]/20 text-[#ffffff] hover:bg-[#ffffff] hover:text-lodgra-blue rounded-none uppercase font-black text-[14px] tracking-[1.5px] px-10 h-[56px] flex items-center justify-center transition-all">
                Dossier Técnico
              </a>
            </div>
            
            <p className="mt-6 text-[12px] font-normal tracking-[0.5px] text-[#9a9a9a]">
              Sem trial gratuito · Pague o plano · 7 dias de garantia de reembolso
            </p>
          </div>
          
          <div className="bg-[#1a2e6b] p-8 border border-[#ffffff]/10 rounded-none w-full hidden lg:block shadow-2xl">
             <div className="bg-lodgra-blue p-8 rounded-none border border-[#ffffff]/10">
                <div className="flex justify-between items-center mb-6 border-b border-[#ffffff]/10 pb-4">
                  <h3 className="text-[14px] font-black text-[#ffffff] uppercase tracking-[2px]">Métrica de Performance</h3>
                  <div className="text-[12px] font-black tracking-[1px] text-lodgra-green uppercase bg-lodgra-green/10 px-3 py-1">CRESCIMENTO +18.4%</div>
                </div>
                <div className="h-[160px] flex items-end gap-3">
                  {[40, 60, 45, 80, 65, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 bg-be-blue hover:bg-[#e6ac00] transition-all rounded-none" style={{ height: `${h}%` }}></div>
                  ))}
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 mt-4">
               <div className="bg-lodgra-blue p-6 rounded-none border border-[#ffffff]/10">
                  <div className="text-[11px] text-[#ffffff]/50 uppercase font-black tracking-[1.5px] mb-2">Receita Direta</div>
                  <div className="text-[28px] font-black text-[#ffffff] tracking-tight">R$ 32.450</div>
               </div>
               <div className="bg-lodgra-blue p-6 rounded-none border border-[#ffffff]/10">
                  <div className="text-[11px] text-[#ffffff]/50 uppercase font-black tracking-[1.5px] mb-2">Ocupação</div>
                  <div className="text-[28px] font-black text-[#ffffff] tracking-tight">78.2%</div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features - Light canvas */}
      <section id="features" className="py-20 px-6 bg-[#ffffff]">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-[32px] md:text-[48px] font-black mb-6 text-lodgra-blue leading-[1.1] uppercase tracking-[-0.5px]">
                INFRAESTRUTURA<br />DE ALTA PERFORMANCE.
              </h2>
              <p className="text-[17px] font-light text-[#181818] mb-8 leading-[1.6]">
                Elimine a dependência de intermediários. O Lodgra integra um motor de reserva direta de grau industrial que processa dados financeiros e operacionais com precisão cirúrgica.
              </p>
              <div className="w-[64px] h-[4px] bg-be-blue mb-8"></div>
              
              <ul className="space-y-4">
                {[
                  "Motor de Reserva Direta com latência zero",
                  "Sincronização Atômica via iCal real-time",
                  "Dashboard P&L com granularidade total",
                  "Cálculo de repasse via algoritmo proprietário",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-[15px] font-black text-lodgra-blue uppercase tracking-[0.5px]">
                    <div className="mt-1.5 w-[10px] h-[10px] bg-be-blue rounded-none flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              
              <a href="#comparison" className="inline-flex items-center gap-2 mt-12 text-[13px] font-black uppercase tracking-[1.5px] text-lodgra-blue hover:text-be-blue transition-colors border-b-2 border-lodgra-accent pb-1">
                ESPECIFICAÇÕES TÉCNICAS <LucideChevronRight className="w-4 h-4" />
              </a>
            </div>
            
            <div className="bg-[#fafafa] p-6 border border-[#e6e6e6] rounded-none">
               <div className="bg-[#ffffff] p-6 border border-[#e6e6e6] rounded-none mb-4">
                  <div className="flex justify-between items-center mb-6 border-b border-[#e6e6e6] pb-4">
                    <h3 className="text-[16px] font-bold text-[#262626] uppercase tracking-[1.5px]">Profit & Loss</h3>
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[11px] font-black tracking-[1.5px] text-lodgra-blue/50 mb-1 uppercase">Receita Bruta</div>
                      <div className="text-[24px] font-black text-lodgra-blue">R$ 24.500</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-black tracking-[1.5px] text-lodgra-green mb-1 uppercase">Eficiência Líquida</div>
                      <div className="text-[24px] font-black text-lodgra-green">R$ 14.230</div>
                    </div>
                  </div>
               </div>
               <div className="bg-[#ffffff] p-6 border border-[#e6e6e6] rounded-none h-[180px] flex items-center justify-center">
                  <LucideBarChart3 className="w-16 h-16 text-[#e6e6e6]" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Difference Grid - Surface Soft */}
      <section id="comparison" className="py-20 px-6 bg-[#f7f7f7]">
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-16">
            <h2 className="text-[32px] md:text-[48px] font-black mb-4 text-lodgra-blue leading-[1.1] uppercase tracking-[-0.5px]">DIFERENCIAIS TÉCNICOS.</h2>
            <p className="text-[17px] font-light text-[#181818] leading-[1.6]">Ferramentas de engenharia para gestores que operam com rigor profissional.</p>
            <div className="w-[64px] h-[4px] bg-be-blue mt-8"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <LucideZap className="w-8 h-8 text-[#1c69d4] mb-6 stroke-[1.5]" />,
                title: 'Checkout PIX Integrado',
                desc: 'O hóspede paga via PIX, o sistema reconhece o pagamento e confirma a reserva na hora. 100% automatizado.'
              },
              {
                icon: <LucideBarChart3 className="w-8 h-8 text-[#1c69d4] mb-6 stroke-[1.5]" />,
                title: 'P&L e Gestão Financeira',
                desc: 'Visualize receitas, despesas e lucro real em um dashboard claro. Emita relatórios detalhados com um clique.'
              },
              {
                icon: <LucideGlobe className="w-8 h-8 text-[#1c69d4] mb-6 stroke-[1.5]" />,
                title: 'Booking Direto',
                desc: 'Tenha seu próprio site de reservas otimizado para conversão, sem comissões abusivas das OTAs.'
              },
              {
                icon: <svg className="w-8 h-8 text-[#1c69d4] mb-6 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                title: 'Sincronização iCal',
                desc: 'Mantenha o calendário atualizado em tempo real com Airbnb, Booking, VRBO e outros canais.'
              },
              {
                icon: <svg className="w-8 h-8 text-[#1c69d4] mb-6 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                title: 'Suporte Multi-moeda',
                desc: 'Aceite pagamentos em BRL, USD, EUR e converta automaticamente para facilitar a sua contabilidade.'
              },
              {
                icon: <svg className="w-8 h-8 text-[#1c69d4] mb-6 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>,
                title: 'Split de Pagamentos',
                desc: 'Dinheiro da reserva separado: parte do proprietário, gestor e taxa de limpeza. Zero bitributação.'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-[#ffffff] p-8 rounded-none border border-be-blue/10 hover:border-lodgra-accent transition-all group">
                 {React.cloneElement(feature.icon as React.ReactElement<React.SVGProps<SVGSVGElement>, 'svg'>, { className: 'w-10 h-10 text-lodgra-blue mb-6 stroke-[2] group-hover:text-be-blue transition-colors' })}
                 <h3 className="text-[18px] font-black mb-4 text-lodgra-blue leading-[1.4] uppercase tracking-[0.5px]">{feature.title}</h3>
                 <p className="text-[14px] font-light text-[#181818]/80 leading-[1.6]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing - Light Canvas */}
      <section id="pricing" className="py-20 px-6 bg-[#ffffff]">
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-16">
            <h2 className="text-[32px] md:text-[48px] font-black mb-4 text-lodgra-blue leading-[1.1] uppercase tracking-[-0.5px]">PLANOS DE INVESTIMENTO.</h2>
            <p className="text-[17px] font-light text-[#181818] leading-[1.6]">Infraestrutura escalável com precificação transparente.</p>
            <div className="w-[64px] h-[4px] bg-be-blue mt-8"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Essencial', price: '59', sub: 'mês · 1 unidade',
                description: 'Saia da planilha. Controle uma unidade com lucro claro.',
                properties: '1 unidade incluída (+R$49 por unidade extra)',
                features: ['Motor de Reserva Direta', 'Sync iCal', 'Calendário unificado', 'Gestão básica de reservas'],
                featured: false
              },
              {
                name: 'Expansão', price: '149', sub: 'mês · 3 unidades',
                description: 'Coordene sem caos. Até 3 unidades e automações de limpeza.',
                properties: '3 unidades incluídas (+R$49 por unidade extra)',
                features: ['Tudo do Essencial', 'Portal de Limpadores (WhatsApp)', 'Relatórios por Proprietário', 'Equipe até 5 pessoas'],
                featured: true
              },
              {
                name: 'Premium', price: '397', sub: 'mês · 10 unidades',
                description: 'Automatize operação e receita. Inteligência para grandes portfólios.',
                properties: '10 unidades incluídas (+R$49 por unidade extra)',
                features: ['Tudo do Expansão', 'API Completa', 'Forecast & BI Avançado', 'Gerente Dedicado', 'Até 10 propriedades'],
                featured: false
              }
            ].map((tier) => (
              <div key={tier.name} className={`bg-[#ffffff] p-10 rounded-none border transition-all ${tier.featured ? 'border-be-blue shadow-xl' : 'border-be-blue/10'}`}>
                {tier.featured && (
                  <div className="mb-6 text-[11px] font-black uppercase tracking-[2px] text-be-blue bg-lodgra-blue inline-block px-3 py-1">
                    MAIS POPULAR
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-[28px] font-black text-lodgra-blue leading-[1.1] mb-2 uppercase">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-[40px] font-black text-lodgra-blue tracking-tighter">R$ {tier.price}</span>
                    <span className="text-[14px] font-light text-[#181818]/60">/{tier.sub}</span>
                  </div>
                  <p className="text-[12px] font-bold text-lodgra-blue bg-lodgra-blue/5 inline-block px-2 py-0.5 mt-2 uppercase tracking-[1px]">{tier.properties}</p>
                  <p className="text-[15px] font-light text-[#181818]/80 mt-6 leading-[1.6] min-h-[44px]">{tier.description}</p>
                </div>
                
                <div className="w-full h-[1px] bg-[#e6e6e6] mb-8"></div>

                <div className="space-y-4 flex-1 mb-12">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-start gap-4 text-[14px] font-light text-[#3c3c3c]">
                      <div className="mt-1 w-[6px] h-[6px] bg-[#262626] rounded-none flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                {tier.name === 'Premium' ? (
                  <button
                    onClick={() => handleCheckout('premium')}
                    disabled={checkoutLoading !== null}
                    className={`w-full rounded-none uppercase font-black text-[14px] tracking-[1.5px] px-8 h-[56px] flex items-center justify-center transition-all ${
                      tier.featured
                        ? 'bg-lodgra-blue hover:bg-[#152a66] text-be-blue'
                        : 'bg-transparent border-2 border-be-blue text-lodgra-blue hover:bg-lodgra-blue hover:text-[#ffffff]'
                    } disabled:opacity-70`}
                  >
                    {checkoutLoading === 'premium'
                      ? 'PROCESSANDO...'
                      : `ATIVAR ${tier.name.toUpperCase()}`}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(tier.name === 'Essencial' ? 'essencial' : 'expansao')}
                    disabled={checkoutLoading !== null}
                    className={`w-full rounded-none uppercase font-black text-[14px] tracking-[1.5px] px-8 h-[56px] flex items-center justify-center transition-all ${
                      tier.featured
                        ? 'bg-lodgra-blue hover:bg-[#152a66] text-be-blue'
                        : 'bg-transparent border-2 border-be-blue text-lodgra-blue hover:bg-lodgra-blue hover:text-[#ffffff]'
                    } disabled:opacity-70`}
                  >
                    {checkoutLoading === (tier.name === 'Essencial' ? 'essencial' : 'expansao')
                      ? 'PROCESSANDO...'
                      : `ATIVAR ${tier.name.toUpperCase()}`}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-6 text-[12px] font-normal tracking-[0.5px] text-[#6b6b6b] border-t border-[#e6e6e6] pt-6">
            <span>Garantia de 7 dias</span>
            <span className="hidden sm:block text-[#cccccc]">|</span>
            <span>Sem contrato de fidelidade</span>
            <span className="hidden sm:block text-[#cccccc]">|</span>
            <span>Cancele quando quiser</span>
          </div>
        </div>
      </section>

      {/* Testimonials - Surface Card */}
      <section className="py-20 px-6 bg-[#fafafa]">
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-16">
            <h2 className="text-[32px] md:text-[48px] font-black mb-4 text-lodgra-blue leading-[1.1] uppercase tracking-[-0.5px]">RELATOS DE PERFORMANCE.</h2>
            <p className="text-[17px] font-light text-[#181818] leading-[1.6]">Gestores que operam no limite da eficiência.</p>
            <div className="w-[64px] h-[4px] bg-be-blue mt-8"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
               <div key={i} className="bg-[#ffffff] p-10 rounded-none border border-be-blue/10 flex flex-col hover:border-lodgra-accent transition-all">
                  <div className="text-[12px] text-be-blue mb-6">{'★★★★★'}</div>
                  <p className="text-[#181818] text-[16px] font-light leading-[1.6] mb-8 italic">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-4 mt-auto">
                     <div className="w-[48px] h-[48px] bg-lodgra-blue text-[#ffffff] rounded-none flex items-center justify-center font-black text-[16px]">
                       {testimonial.initial}
                     </div>
                     <div>
                       <div className="font-black text-[14px] text-lodgra-blue uppercase tracking-[0.5px]">{testimonial.name}</div>
                       <div className="text-[12px] font-light text-[#181818]/60">{testimonial.role}</div>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* CTA final - Clinical Performance */}
      <section className="bg-lodgra-blue py-30 px-6 border-t border-lodgra-accent/20">
        <div className="max-w-[1440px] mx-auto text-center">
          <h2 className="text-[32px] md:text-[56px] font-black mb-6 text-[#ffffff] leading-[1.1] max-w-[900px] mx-auto uppercase tracking-[-1px]">
            ENCERRE A INEFICIÊNCIA.<br />DOMINE SUA OPERAÇÃO.
          </h2>
          <p className="text-[18px] font-light text-[#f8f8f8]/60 mb-16 max-w-[700px] mx-auto leading-[1.6]">
            Implemente a infraestrutura LODGRA hoje. 7 dias de garantia total de performance.
          </p>
          <div className="flex justify-center">
            <a href="#pricing" className="bg-be-blue text-lodgra-blue hover:bg-[#e6ac00] rounded-none uppercase font-black text-[16px] tracking-[2px] px-12 h-[64px] flex items-center justify-center transition-all shadow-lg">
              ATIVAR AGORA
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-[#f7f7f7] border-t border-[#e6e6e6]">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
            <div className="max-w-[300px]">
               <div className="flex items-center gap-3 mb-8">
                  <Logo size="sm" />
               </div>
               <p className="text-[#181818]/60 text-[14px] font-light leading-[1.6]">
                 A infraestrutura de inteligência financeira para gestores profissionais que não aceitam menos que a excelência.
               </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-12 text-[13px] font-black uppercase tracking-[1px]">
               <div className="flex flex-col gap-4">
                  <span className="text-lodgra-blue/30 text-[11px]">Sistema</span>
                  <a href="#" className="text-lodgra-blue hover:text-be-blue transition-colors">Dossier</a>
                  <a href="#" className="text-lodgra-blue hover:text-be-blue transition-colors">Performance</a>
                  <a href="#" className="text-lodgra-blue hover:text-be-blue transition-colors">Rede</a>
               </div>
               <div className="flex flex-col gap-4">
                  <span className="text-lodgra-blue/30 text-[11px]">Empresa</span>
                  <a href="#" className="text-lodgra-blue hover:text-be-blue transition-colors">Engenharia</a>
                  <a href="#" className="text-lodgra-blue hover:text-be-blue transition-colors">Base</a>
                  <a href="#" className="text-lodgra-blue hover:text-be-blue transition-colors">Log</a>
               </div>
               <div className="flex flex-col gap-4">
                  <span className="text-lodgra-blue/30 text-[11px]">Legal</span>
                  <Link href="/terms" className="text-lodgra-blue hover:text-be-blue transition-colors">Protocolo</Link>
                  <Link href="/privacy" className="text-lodgra-blue hover:text-be-blue transition-colors">Privacidade</Link>
               </div>
            </div>
          </div>
          <div className="pt-8 border-t border-[#e6e6e6] flex flex-col md:flex-row justify-between items-center gap-6 text-[#6b6b6b] text-[12px] font-normal tracking-[0.5px]">
            <p>© 2026 LODGRA. All rights reserved.</p>
            <div className="flex gap-6">
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
