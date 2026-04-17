'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Check, ArrowRight, RefreshCcw, BarChart3, Mail, Globe, Shield,
  Users, Calendar, Receipt, TrendingUp, Lock, ChevronDown, Home,
  Smartphone, Share, PlusSquare, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PLAN_DISPLAY } from '@/lib/billing/plans'
import { Logo } from '@/components/ui/Logo'

type Market = 'BR' | 'PT' | 'US'

// ─── Content ───────────────────────────────────────────────────────────────────
const CONTENT = {
  BR: {
    flag: '🇧🇷',
    label: 'Brasil',
    currency: 'brl',
    nav: 'Entrar',
    heroBadge: '7 dias de garantia ou seu dinheiro de volta',
    headline: 'Gerencie todos os seus imóveis no Airbnb e Booking em um só lugar — sem overbookings, sem planilhas, sem stress.',
    subheadline: 'O Lodgra centraliza propriedades, reservas, despesas e calendários de todas as plataformas. Saiba exatamente quanto cada imóvel rende — e recupere horas do seu dia.',
    cta: 'Começar agora',
    ctaSub: 'Não precisa de cartão de crédito. Cancele quando quiser.',
    emailPlaceholder: 'Seu e-mail',
    guarantee: '7 dias ou seu dinheiro de volta',
    painTitle: 'Se você gerencia imóveis no Airbnb ou Booking, conhece bem esses problemas...',
    pains: [
      { title: 'Overbooking e reservas duplicadas', desc: 'Manter calendários sincronizados manualmente em várias plataformas é um pesadelo. Um erro = hóspede sem quarto + reembolso + avaliação negativa.' },
      { title: 'Planilhas intermináveis de receitas e despesas', desc: 'Limpeza, manutenção, impostos, seguros... tudo espalhado entre Excel, apps e papéis. No fim do mês, não sabe quanto realmente lucrou.' },
      { title: 'Não saber qual imóvel dá lucro — e qual dá prejuízo', desc: 'Você tem 3, 5, 10 imóveis mas não consegue responder: "Qual me dá mais dinheiro?" Os números nunca batem.' },
      { title: 'Equipe sem controle de acessos', desc: 'Precisa dar acesso ao gerente de limpeza ou sócio, mas ou dá tudo — ou nada. Não existe meio-termo.' },
      { title: '10+ horas por semana em tarefas repetitivas', desc: 'Copiar reservas entre plataformas, atualizar calendários, enviar confirmações — tarefas que consomem seu tempo e não geram receita.' },
      { title: 'Acordar sem saber quem chega e quem sai hoje', desc: 'Check-ins esquecidos, chaves não entregues, limpeza não agendada — tudo porque não havia um lembrete claro do dia.' },
    ],
    solutionTitle: 'O Lodgra resolve tudo isso em uma única plataforma.',
    solutionDesc: 'Um sistema completo de gestão de imóveis por temporada que centraliza propriedades, reservas, despesas, calendários e equipe. Sincroniza automaticamente com Airbnb, Booking.com e outras plataformas.',
    sectionFeaturesTitle: 'Tudo que você precisa para escalar seu negócio',
    sectionFeaturesDesc: 'Uma plataforma completa para administradores de aluguel por temporada.',
    featureCards: [
      { icon: RefreshCcw, title: 'Sync automático de calendários',    desc: 'Importe e exporte via iCal. Reservas do Airbnb e Booking aparecem automaticamente — e vice-versa. Zero overbookings.' },
      { icon: BarChart3,  title: 'Dashboard com visão 360° do negócio', desc: 'Receita total, taxa de ocupação, próximos check-ins — tudo em uma tela. Gráficos de tendência para decisões rápidas.' },
      { icon: TrendingUp, title: 'Análise financeira por imóvel',     desc: 'Veja receita, despesas e lucro líquido de cada imóvel individualmente. Descubra quais são rentáveis e quais precisam de atenção.' },
      { icon: Receipt,    title: 'Controle de despesas por categoria', desc: 'Limpeza, manutenção, impostos, seguros. Cada despesa no imóvel correto. No fim do mês, saiba para onde foi o dinheiro.' },
      { icon: Lock,       title: 'Gestão de equipe com permissões',   desc: 'Crie contas para gerentes e visualizadores. Atribua imóveis específicos a cada pessoa. Cada um vê só o que é dele.' },
      { icon: Globe,      title: 'Suporte a 8 moedas',               desc: 'EUR, USD, GBP, BRL, CHF, JPY, CAD, AUD. Cada imóvel na sua moeda. Perfeito para portfólios internacionais.' },
      { icon: Mail,       title: 'E-mail diário de check-ins',        desc: 'Todas as manhãs, receba um e-mail com as chegadas e saídas do dia. Comece o dia preparado, sem surpresas.' },
      { icon: Calendar,   title: 'Relatórios com exportação',         desc: 'ADR, valor médio de reserva, comparação mensal. Exporte para Excel para o contador ou investidor.' },
    ],
    stepsTitle: 'Comece em 3 passos simples',
    steps: [
      { num: '1', title: 'Adicione seus imóveis',       desc: 'Registre cada imóvel com endereço, capacidade, moeda e tipo. Leva menos de 2 minutos por imóvel.' },
      { num: '2', title: 'Conecte as plataformas',      desc: 'Adicione os links iCal do Airbnb, Booking.com e outras plataformas. A sincronização começa automaticamente.' },
      { num: '3', title: 'Gerencie tudo em um só lugar', desc: 'Reservas, despesas, calendário e relatórios centralizados. Adicione sua equipe e defina quem vê o quê.' },
    ],
    stats: [
      { value: '0',   label: 'overbookings com sync automático' },
      { value: '10h+', label: 'economizadas por semana em média' },
      { value: '8',   label: 'moedas suportadas nativamente' },
      { value: '3',   label: 'níveis de permissão por imóvel' },
    ],
    segmentsTitle: 'Feito para quem gerencia imóveis a sério',
    segments: [
      { icon: Home,        title: 'Proprietário individual (1–3 imóveis)',   desc: 'Cansado de planilhas? O Lodgra substitui o Excel, o calendário do Google e os post-its. Saiba quanto ganha realmente, sem complicações.' },
      { icon: Users,       title: 'Gestor profissional (4–15 imóveis)',      desc: 'Gerenciar vários imóveis em plataformas diferentes é um caos sem sistema. O Lodgra sincroniza tudo e permite delegar com segurança.' },
      { icon: TrendingUp,  title: 'Empresa de Property Management (15+)',    desc: 'Controle de acessos por imóvel, relatórios por proprietário e visão consolidada do portfólio. Desenhado para escalar.' },
    ],
    compareTitle: 'Por que o Lodgra é diferente',
    compareHeaders: ['Funcionalidade', 'Lodgra', 'Planilhas', 'Outros softwares'],
    compareRows: [
      ['Sync automático com Airbnb e Booking', '✓', '✗ Manual',    '⚠ Só importa'],
      ['Multi-moeda nativo (8 moedas)',         '✓', '✗ Manual',    '⚠ Geralmente 1'],
      ['Permissões por imóvel',                 '✓', '✗',           '⚠ Tudo ou nada'],
      ['Lucro por imóvel automático',           '✓', '✗ Manual',    '⚠ Poucos oferecem'],
      ['E-mail diário de check-ins',            '✓', '✗',           '⚠ Raro'],
      ['Detecção de cancelamentos',             '✓', '✗',           '⚠ Poucos'],
      ['Funciona no celular',                   '✓', '✗ Difícil',   '⚠ Nem sempre'],
    ],
    faqTitle: 'Perguntas frequentes',
    faqs: [
      { q: 'Já uso o Airbnb e Booking, por que precisaria de mais um sistema?', a: 'O Airbnb e Booking são ótimos para receber reservas, mas não se falam entre si. O Lodgra é a camada que une tudo: sincroniza calendários, consolida receitas e despesas, e mostra o lucro real do seu negócio.' },
      { q: 'É difícil de configurar?', a: 'Não. Adicione o imóvel, cole o link iCal das plataformas, e pronto. A sincronização começa sozinha em minutos.' },
      { q: 'E se eu tiver imóveis em países diferentes com moedas diferentes?', a: 'Perfeito para isso. Cada imóvel tem a sua moeda. Os relatórios separam automaticamente EUR, USD, BRL e outras. Sem conversões forçadas.' },
      { q: 'Posso dar acesso ao meu sócio ou gerente de limpeza sem que veja tudo?', a: 'Sim. Crie um usuário com role de "Visualizador" ou "Gerente" e atribua apenas os imóveis relevantes. Cada pessoa vê só o que precisa.' },
      { q: 'Funciona no celular?', a: 'Sim. O Lodgra é totalmente responsivo — funciona em desktop, tablet e celular. Gerencie check-ins no imóvel ou reveja relatórios no sofá.' },
      { q: 'E se eu quiser mudar de sistema depois?', a: 'Seus dados são seus. Exporte relatórios para Excel a qualquer momento. Sem lock-in.' },
    ],
    priceUnit: 'R$29,90',
    pricePer: '/imóvel/mês',
    propertiesLabel: 'Quantos imóveis você gerencia?',
    totalLabel: 'Total',
    roiHint: 'Um imóvel rendendo R$3.000/mês cobre 100× o custo da plataforma.',
    features: [
      'Imóveis ilimitados',
      'Sincronização automática de calendários',
      'Notificações por e-mail para proprietários',
      'Dashboard e relatórios de lucro',
      'Calendário multi-imóvel',
      'Controle de despesas por categoria',
      'Gestão de equipe com permissões',
      'Suporte a 8 moedas',
      'Suporte por e-mail',
    ],
    sectionPricingTitle: 'Preço simples e justo',
    sectionPricingDesc: 'Pague apenas pelos imóveis que gerencia. Sem taxas escondidas.',
    finalTitle: 'Pare de perder tempo com planilhas e overbookings.',
    finalDesc: 'Centralize tudo, automatize o que puder e saiba exatamente quanto você ganha por imóvel.',
    pwaTitle: 'Instale o app no celular',
    pwaDesc: 'Acesse o Lodgra direto do seu celular — sem precisar da App Store.',
    pwaSteps: [
      { icon: 'globe', title: 'Abra no Safari', desc: 'Acesse lodgra.pt pelo navegador Safari do seu iPhone.' },
      { icon: 'share', title: 'Toque em Compartilhar', desc: 'Toque no ícone de compartilhar (quadrado com seta para cima) na barra inferior.' },
      { icon: 'plus', title: 'Adicionar à Tela Inicial', desc: 'Deslize e toque em "Adicionar à Tela de Início". Confirme o nome e pronto!' },
    ],
    pwaTip: 'O app abre em tela cheia, sem barra do navegador — como um app nativo.',
    pwaBannerTitle: 'Instale o Lodgra',
    pwaBannerDesc: 'Adicione à tela inicial para acesso rápido.',
    pwaBannerAction: 'Ver como instalar',
    footerLinks: 'Entrar',
    trustSync: 'Sync Airbnb & Booking',
    trustCurrencies: '8 moedas',
    trustOverbookings: 'Sem overbookings',
    trustCancel: 'Cancele quando quiser',
    footerPrivacy: 'Política de Privacidade',
    footerTerms: 'Termos de Serviço',
    footerRights: 'Todos os direitos reservados.',
  },
  PT: {
    flag: '🇵🇹',
    label: 'Portugal',
    currency: 'eur',
    nav: 'Entrar',
    heroBadge: '7 dias de garantia ou o dinheiro de volta',
    headline: 'Gira todos os seus alojamentos locais num único lugar — sem overbookings, sem folhas de cálculo, sem stress.',
    subheadline: 'O Lodgra centraliza propriedades, reservas, despesas e calendários do Airbnb, Booking.com e outras plataformas. Saiba exactamente quanto cada propriedade rende — e recupere horas do seu dia.',
    cta: 'Começar agora',
    ctaSub: 'Não precisa de cartão de crédito. Cancele quando quiser.',
    emailPlaceholder: 'O seu e-mail',
    guarantee: '7 dias ou o dinheiro de volta',
    painTitle: 'Se gere alojamentos locais, conhece bem estas dores...',
    pains: [
      { title: 'Overbooking e reservas duplicadas', desc: 'Manter calendários sincronizados manualmente em várias plataformas é um pesadelo. Um erro = hóspede sem quarto + reembolso + avaliação negativa.' },
      { title: 'Folhas de cálculo intermináveis de receitas e despesas', desc: 'Limpeza, manutenção, impostos, seguros... tudo espalhado entre Excel, apps e papéis. No final do mês, não sabe quanto realmente lucrou.' },
      { title: 'Não saber qual propriedade dá lucro — e qual dá prejuízo', desc: 'Tem 3, 5, 10 propriedades mas não consegue responder: "Qual me dá mais dinheiro?" Os números nunca batem.' },
      { title: 'Equipa sem controlo de acessos', desc: 'Precisa dar acesso ao gestor de limpeza ou parceiro de negócios, mas ou dá tudo — ou nada. Não existe meio-termo.' },
      { title: '10+ horas por semana em tarefas repetitivas', desc: 'Copiar reservas entre plataformas, actualizar calendários, enviar confirmações — tarefas que consomem o seu tempo e não geram receita.' },
      { title: 'Acordar sem saber quem chega e quem sai hoje', desc: 'Check-ins esquecidos, chaves não entregues, limpeza não agendada — tudo porque não havia um lembrete claro do dia.' },
    ],
    solutionTitle: 'O Lodgra resolve tudo isto numa única plataforma.',
    solutionDesc: 'Um sistema completo de gestão de alojamento local que centraliza propriedades, reservas, despesas, calendários e equipa. Sincroniza automaticamente com Airbnb, Booking.com e outras plataformas.',
    sectionFeaturesTitle: 'Tudo o que precisa para gerir o seu negócio',
    sectionFeaturesDesc: 'Uma plataforma completa para gestores de alojamento local.',
    featureCards: [
      { icon: RefreshCcw, title: 'Sync automático de calendários',     desc: 'Importe e exporte via iCal. Reservas do Airbnb e Booking aparecem automaticamente — e vice-versa. Zero overbookings.' },
      { icon: BarChart3,  title: 'Dashboard com visão 360° do negócio', desc: 'Receita total, taxa de ocupação, próximos check-ins — tudo num único ecrã. Gráficos de tendência para decisões rápidas.' },
      { icon: TrendingUp, title: 'Análise financeira por propriedade', desc: 'Veja receita, despesas e lucro líquido de cada propriedade individualmente. Descubra quais são rentáveis e quais precisam de atenção.' },
      { icon: Receipt,    title: 'Controlo de despesas por categoria', desc: 'Limpeza, manutenção, impostos, seguros. Cada despesa na propriedade correcta. No final do mês, saiba para onde foi o dinheiro.' },
      { icon: Lock,       title: 'Gestão de equipa com permissões',    desc: 'Crie contas para gestores e visualizadores. Atribua propriedades específicas a cada pessoa. Cada um vê só o que precisa.' },
      { icon: Globe,      title: 'Suporte a 8 moedas',                desc: 'EUR, USD, GBP, BRL, CHF, JPY, CAD, AUD. Cada propriedade na sua moeda. Perfeito para portfólios internacionais.' },
      { icon: Mail,       title: 'E-mail diário de check-ins',         desc: 'Todas as manhãs, receba um e-mail com as chegadas e partidas do dia. Comece o dia preparado, sem surpresas.' },
      { icon: Calendar,   title: 'Relatórios com exportação',          desc: 'ADR, valor médio de reserva, comparação mensal. Exporte para Excel para o contabilista ou investidor.' },
    ],
    stepsTitle: 'Comece em 3 passos simples',
    steps: [
      { num: '1', title: 'Adicione as suas propriedades',  desc: 'Registe cada imóvel com endereço, capacidade, moeda e tipo. Leva menos de 2 minutos por propriedade.' },
      { num: '2', title: 'Conecte as plataformas',         desc: 'Adicione os links iCal do Airbnb, Booking.com e outras plataformas. A sincronização começa automaticamente.' },
      { num: '3', title: 'Gira tudo num só lugar',         desc: 'Reservas, despesas, calendário e relatórios centralizados. Adicione a sua equipa e defina quem vê o quê.' },
    ],
    stats: [
      { value: '0',    label: 'overbookings com sync automático' },
      { value: '10h+', label: 'poupadas por semana em média' },
      { value: '8',    label: 'moedas suportadas nativamente' },
      { value: '3',    label: 'níveis de permissão por propriedade' },
    ],
    segmentsTitle: 'Feito para quem gere alojamentos locais a sério',
    segments: [
      { icon: Home,       title: 'Proprietário individual (1–3 propriedades)', desc: 'Cansado de folhas de cálculo? O Lodgra substitui o Excel, o calendário do Google e os post-its. Saiba quanto ganha realmente, sem complicações.' },
      { icon: Users,      title: 'Gestor profissional (4–15 propriedades)',    desc: 'Gerir várias propriedades em plataformas diferentes é um caos sem sistema. O Lodgra sincroniza tudo e permite delegar com segurança.' },
      { icon: TrendingUp, title: 'Empresa de Property Management (15+)',       desc: 'Controlo de acessos por propriedade, relatórios por proprietário e visão consolidada do portfólio. Desenhado para escalar.' },
    ],
    compareTitle: 'Porque o Lodgra é diferente',
    compareHeaders: ['Funcionalidade', 'Lodgra', 'Folhas de cálculo', 'Outros softwares'],
    compareRows: [
      ['Sync automático com Airbnb e Booking', '✓', '✗ Manual',    '⚠ Só importa'],
      ['Multi-moeda nativo (8 moedas)',         '✓', '✗ Manual',    '⚠ Geralmente 1'],
      ['Permissões por propriedade',            '✓', '✗',           '⚠ Tudo ou nada'],
      ['Lucro por propriedade automático',      '✓', '✗ Manual',    '⚠ Poucos oferecem'],
      ['E-mail diário de check-ins',            '✓', '✗',           '⚠ Raro'],
      ['Detecção de cancelamentos',             '✓', '✗',           '⚠ Poucos'],
      ['Funciona no telemóvel',                 '✓', '✗ Difícil',   '⚠ Nem sempre'],
    ],
    faqTitle: 'Perguntas frequentes',
    faqs: [
      { q: 'Já uso o Airbnb e Booking, para que preciso de mais um sistema?', a: 'O Airbnb e Booking são óptimos para receber reservas, mas não se falam entre si. O Lodgra é a camada que une tudo: sincroniza calendários, consolida receitas e despesas, e mostra o lucro real do seu negócio.' },
      { q: 'É difícil de configurar?', a: 'Não. Adicione a propriedade, cole o link iCal das plataformas, e está feito. A sincronização começa sozinha em minutos.' },
      { q: 'E se tiver propriedades em países diferentes com moedas diferentes?', a: 'Perfeito para isso. Cada propriedade tem a sua moeda. Os relatórios separam automaticamente EUR, USD, BRL e outras. Sem conversões forçadas.' },
      { q: 'Posso dar acesso ao meu parceiro ou gestor de limpeza sem que veja tudo?', a: 'Sim. Crie um utilizador com role de "Visualizador" ou "Gestor" e atribua apenas as propriedades relevantes. Cada pessoa vê só o que precisa.' },
      { q: 'Funciona no telemóvel?', a: 'Sim. O Lodgra é totalmente responsivo — funciona em desktop, tablet e telemóvel. Gira check-ins na propriedade ou reveja relatórios no sofá.' },
      { q: 'E se quiser mudar de sistema depois?', a: 'Os seus dados são seus. Exporte relatórios para Excel a qualquer momento. Sem lock-in.' },
    ],
    priceUnit: '€9,90',
    pricePer: '/imóvel/mês',
    propertiesLabel: 'Quantos imóveis gere?',
    totalLabel: 'Total',
    roiHint: 'Uma propriedade a render €2.000/mês cobre 200× o custo da plataforma.',
    features: [
      'Imóveis ilimitados',
      'Sincronização automática de calendários',
      'Notificações por e-mail para proprietários',
      'Dashboard e relatórios de rentabilidade',
      'Calendário multi-imóvel',
      'Controlo de despesas por categoria',
      'Gestão de equipa com permissões',
      'Suporte a 8 moedas',
      'Suporte por e-mail',
    ],
    sectionPricingTitle: 'Preço simples e transparente',
    sectionPricingDesc: 'Pague apenas pelos imóveis que gere. Sem custos escondidos.',
    finalTitle: 'Pare de perder tempo com folhas de cálculo e overbookings.',
    finalDesc: 'Centralize tudo, automatize o que puder e saiba exactamente quanto ganha por propriedade.',
    pwaTitle: 'Instale a app no telemóvel',
    pwaDesc: 'Aceda ao Lodgra directamente do seu telemóvel — sem precisar da App Store.',
    pwaSteps: [
      { icon: 'globe', title: 'Abra no Safari', desc: 'Aceda a lodgra.pt pelo navegador Safari do seu iPhone.' },
      { icon: 'share', title: 'Toque em Partilhar', desc: 'Toque no ícone de partilha (quadrado com seta para cima) na barra inferior.' },
      { icon: 'plus', title: 'Adicionar ao Ecrã Principal', desc: 'Deslize e toque em "Adicionar ao Ecrã Principal". Confirme o nome e está feito!' },
    ],
    pwaTip: 'A app abre em ecrã inteiro, sem barra do navegador — como uma app nativa.',
    pwaBannerTitle: 'Instale o Lodgra',
    pwaBannerDesc: 'Adicione ao ecrã principal para acesso rápido.',
    pwaBannerAction: 'Ver como instalar',
    footerLinks: 'Entrar',
    trustSync: 'Sync Airbnb & Booking',
    trustCurrencies: '8 moedas',
    trustOverbookings: 'Sem overbookings',
    trustCancel: 'Cancele quando quiser',
    footerPrivacy: 'Política de Privacidade',
    footerTerms: 'Termos de Serviço',
    footerRights: 'Todos os direitos reservados.',
  },
  US: {
    flag: '🇺🇸',
    label: 'USA',
    currency: 'usd',
    nav: 'Log in',
    heroBadge: '7-day money-back guarantee',
    headline: 'Manage all your short-term rentals in one place — no double bookings, no spreadsheets, no stress.',
    subheadline: 'Lodgra syncs Airbnb, Booking.com and VRBO automatically. See exactly how much each property earns — and get hours back in your day.',
    cta: 'Get started',
    ctaSub: 'No credit card required. Cancel anytime.',
    emailPlaceholder: 'Your email address',
    guarantee: '7-day money-back guarantee',
    painTitle: 'If you manage short-term rentals, you know these struggles...',
    pains: [
      { title: 'Double bookings and calendar chaos', desc: 'Manually syncing calendars across Airbnb, VRBO, and Booking.com is a nightmare. One mistake = angry guest, refund, and a bad review.' },
      { title: 'Endless spreadsheets for revenue and expenses', desc: 'Cleaning, maintenance, taxes, insurance... scattered across Excel, apps, and sticky notes. At month end, you still don\'t know your real profit.' },
      { title: 'No idea which property is profitable', desc: 'You have 3, 5, 10 properties but can\'t answer: "Which one makes me the most money?" The numbers never add up.' },
      { title: 'Team access is all-or-nothing', desc: 'Need to give your cleaning manager or co-host access? Either they see everything or nothing. There\'s no middle ground.' },
      { title: '10+ hours per week on repetitive tasks', desc: 'Copying reservations between platforms, updating calendars, sending confirmations — tasks that eat your time without generating revenue.' },
      { title: 'Waking up not knowing who checks in today', desc: 'Missed check-ins, undelivered keys, unscheduled cleaning — all because there was no clear daily reminder.' },
    ],
    solutionTitle: 'Lodgra solves all of this in one platform.',
    solutionDesc: 'A complete short-term rental management system that centralises properties, reservations, expenses, calendars, and your team. Syncs automatically with Airbnb, Booking.com, VRBO and more.',
    sectionFeaturesTitle: 'Everything you need to scale your rental business',
    sectionFeaturesDesc: 'A complete platform for professional short-term rental managers.',
    featureCards: [
      { icon: RefreshCcw, title: 'Automatic calendar sync',        desc: 'Import and export via iCal. Reservations from Airbnb and Booking appear automatically — and vice versa. Zero double bookings.' },
      { icon: BarChart3,  title: '360° business dashboard',        desc: 'Total revenue, occupancy rate, upcoming check-ins — all on one screen. Trend charts for fast decisions.' },
      { icon: TrendingUp, title: 'Financial analysis per property', desc: 'See revenue, expenses, and net profit for each property individually. Find your winners and your underperformers.' },
      { icon: Receipt,    title: 'Expense tracking by category',    desc: 'Cleaning, maintenance, taxes, insurance. Every expense in the right property. Know where your money goes.' },
      { icon: Lock,       title: 'Team management with permissions', desc: 'Create accounts for managers and viewers. Assign specific properties to each person. Everyone sees only what they need.' },
      { icon: Globe,      title: 'Support for 8 currencies',        desc: 'USD, EUR, GBP, BRL, CHF, JPY, CAD, AUD. Each property in its own currency. Perfect for international portfolios.' },
      { icon: Mail,       title: 'Daily check-in email digest',     desc: 'Every morning, receive an email with today\'s arrivals and departures. Start your day prepared, no surprises.' },
      { icon: Calendar,   title: 'Reports with export',             desc: 'ADR, average booking value, monthly comparison. Export to Excel for your accountant or investor.' },
    ],
    stepsTitle: 'Get started in 3 simple steps',
    steps: [
      { num: '1', title: 'Add your properties',       desc: 'Register each property with address, capacity, currency and type. Takes less than 2 minutes per property.' },
      { num: '2', title: 'Connect your platforms',    desc: 'Add iCal links from Airbnb, Booking.com, VRBO and other platforms. Sync starts automatically.' },
      { num: '3', title: 'Manage everything in one place', desc: 'Reservations, expenses, calendar and reports centralised. Add your team and define who sees what.' },
    ],
    stats: [
      { value: '0',   label: 'double bookings with auto-sync' },
      { value: '10h+', label: 'saved per week on average' },
      { value: '8',   label: 'currencies supported natively' },
      { value: '3',   label: 'permission levels per property' },
    ],
    segmentsTitle: 'Built for serious rental managers',
    segments: [
      { icon: Users,      title: 'Individual owner (1–3 properties)',   desc: 'Tired of spreadsheets? Lodgra replaces Excel, Google Calendar, and sticky notes. Know your real earnings, without the hassle.' },
      { icon: TrendingUp, title: 'Professional manager (4–15 properties)', desc: 'Managing multiple properties across platforms is chaos without a system. Lodgra syncs everything and lets you delegate safely.' },
      { icon: Globe,      title: 'Property Management Company (15+)',    desc: 'Per-property access control, owner reports, and consolidated portfolio view. Built to scale.' },
    ],
    compareTitle: 'Why Lodgra is different',
    compareHeaders: ['Feature', 'Lodgra', 'Spreadsheets', 'Other software'],
    compareRows: [
      ['Auto-sync with Airbnb & Booking', '✓', '✗ Manual', '⚠ Import only'],
      ['Multi-currency native (8 currencies)', '✓', '✗ Manual', '⚠ Usually 1'],
      ['Per-property permissions', '✓', '✗', '⚠ All or nothing'],
      ['Profit per property automatic', '✓', '✗ Manual', '⚠ Few offer this'],
      ['Daily check-in email', '✓', '✗', '⚠ Rare'],
      ['Cancellation detection', '✓', '✗', '⚠ Few'],
      ['Works on mobile', '✓', '✗ Difficult', '⚠ Not always'],
    ],
    faqTitle: 'Frequently asked questions',
    faqs: [
      { q: 'I already use Airbnb and Booking — why do I need another system?', a: 'Airbnb and Booking are great for receiving reservations, but they don\'t talk to each other. Lodgra is the layer that connects everything: syncs calendars, consolidates revenue and expenses, and shows your real business profit.' },
      { q: 'Is it hard to set up?', a: 'No. Add your property, paste the iCal link from each platform, and you\'re done. Sync starts automatically in minutes.' },
      { q: 'What if I have properties in different countries with different currencies?', a: 'Perfect for that. Each property has its own currency. Reports automatically separate USD, EUR, BRL and others. No forced conversions.' },
      { q: 'Can I give my co-host or cleaner access without sharing everything?', a: 'Yes. Create a user with a "Viewer" or "Manager" role and assign only the relevant properties. Everyone sees only what they need.' },
      { q: 'Does it work on mobile?', a: 'Yes. Lodgra is fully responsive — works on desktop, tablet, and mobile. Manage check-ins on site or review reports from your couch.' },
      { q: 'What if I want to switch systems later?', a: 'Your data is yours. Export reports to Excel at any time. No lock-in.' },
    ],
    priceUnit: '$29',
    pricePer: '/mo',
    propertiesLabel: 'How many properties do you manage?',
    totalLabel: 'Total',
    roiHint: 'One property earning $3,000/mo covers 100× the platform cost.',
    features: [
      'Unlimited properties',
      'Automatic calendar sync',
      'Email notifications for owners',
      'Dashboard and profit reports',
      'Multi-property calendar',
      'Expense tracking by category',
      'Team management with permissions',
      'Support for 8 currencies',
      'Email support',
    ],
    sectionPricingTitle: 'Simple, transparent pricing',
    sectionPricingDesc: 'Pay only for the properties you manage. No hidden fees.',
    finalTitle: 'Stop losing time to spreadsheets and double bookings.',
    finalDesc: 'Centralise everything, automate what you can, and know exactly how much you earn per property.',
    pwaTitle: 'Install the app on your phone',
    pwaDesc: 'Access Lodgra right from your phone — no App Store needed.',
    pwaSteps: [
      { icon: 'globe', title: 'Open in Safari', desc: 'Go to lodgra.pt in Safari on your iPhone.' },
      { icon: 'share', title: 'Tap Share', desc: 'Tap the share icon (square with arrow up) in the bottom bar.' },
      { icon: 'plus', title: 'Add to Home Screen', desc: 'Scroll down and tap "Add to Home Screen". Confirm the name and you\'re done!' },
    ],
    pwaTip: 'The app opens full-screen, no browser bar — just like a native app.',
    pwaBannerTitle: 'Install Lodgra',
    pwaBannerDesc: 'Add to home screen for quick access.',
    pwaBannerAction: 'See how to install',
    footerLinks: 'Log in',
    trustSync: 'Sync Airbnb & Booking',
    trustCurrencies: '8 currencies',
    trustOverbookings: 'No double bookings',
    trustCancel: 'Cancel anytime',
    footerPrivacy: 'Privacy Policy',
    footerTerms: 'Terms of Service',
    footerRights: 'All rights reserved.',
  },
}

// ─── Pricing localisation ──────────────────────────────────────────────────────
const PRICING_L10N: Record<Market, {
  symbol: string
  period: string
  popularBadge: string
  plans: { description: string; properties: string; features: string[] }[]
}> = {
  PT: {
    symbol: '€',
    period: '/mês',
    popularBadge: 'Mais popular',
    plans: [
      { description: 'Para gestores que estão a começar', properties: 'Até 3 propriedades', features: ['Calendário drag-drop', 'Reservas manuais', 'Sync iCal', 'Relatórios básicos'] },
      { description: 'Para gestores em crescimento', properties: 'Até 10 propriedades', features: ['Tudo do Starter', 'Relatórios por proprietário', 'Compliance Fiscal PT (IRS)', 'Exportar PDF/Excel'] },
      { description: 'Para operações profissionais', properties: 'Propriedades ilimitadas', features: ['Tudo do Professional', 'Suporte prioritário', '2FA (em breve)', 'API access (em breve)'] },
    ],
  },
  BR: {
    symbol: 'R$',
    period: '/mês',
    popularBadge: 'Mais popular',
    plans: [
      { description: 'Para quem está começando', properties: 'Até 3 imóveis', features: ['Calendário drag-drop', 'Reservas manuais', 'Sync iCal', 'Relatórios básicos'] },
      { description: 'Para gestores em crescimento', properties: 'Até 10 imóveis', features: ['Tudo do Starter', 'Relatórios por proprietário', 'Compliance Fiscal', 'Exportar PDF/Excel'] },
      { description: 'Para operações profissionais', properties: 'Imóveis ilimitados', features: ['Tudo do Professional', 'Suporte prioritário', '2FA (em breve)', 'API access (em breve)'] },
    ],
  },
  US: {
    symbol: '$',
    period: '/mo',
    popularBadge: 'Most popular',
    plans: [
      { description: 'For managers getting started', properties: 'Up to 3 properties', features: ['Drag-drop calendar', 'Manual reservations', 'iCal sync', 'Basic reports'] },
      { description: 'For growing managers', properties: 'Up to 10 properties', features: ['Everything in Starter', 'Owner reports', 'Fiscal compliance', 'Export PDF/Excel'] },
      { description: 'For professional operations', properties: 'Unlimited properties', features: ['Everything in Professional', 'Priority support', '2FA (coming soon)', 'API access (coming soon)'] },
    ],
  },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function CompareCellValue({ val }: { val: string }) {
  if (val.startsWith('✓')) return <span className="text-hs-success font-semibold">{val}</span>
  if (val.startsWith('✗')) return <span className="text-hs-error text-sm">{val}</span>
  return <span className="text-hs-warning text-sm">{val}</span>
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function LandingPage() {
  const [market, setMarket] = useState<Market>('PT')
  const [email, setEmail]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [openFaq, setOpenFaq]       = useState<number | null>(null)
  const [scrolled, setScrolled]     = useState(false)
  const [showPwaBanner, setShowPwaBanner] = useState(false)

  const c = CONTENT[market]

  // Sticky navbar shadow on scroll
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 10) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Show PWA install banner on Safari mobile (not in standalone mode)
  useEffect(() => {
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent)
    const isMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone)
    const dismissed = sessionStorage.getItem('pwa-banner-dismissed')
    if (isSafari && isMobile && !isStandalone && !dismissed) {
      setShowPwaBanner(true)
    }
  }, [])

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    window.location.href = '/register'
  }

  async function handlePlanCheckout(planId: string) {
    setLoadingPlan(planId)
    try {
      const payload = { email: email || undefined, plan: planId }
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Erro ao iniciar checkout')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert('Erro ao iniciar checkout: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className={`min-h-screen bg-hs-neutral-50 transition-all ${showPwaBanner ? 'pb-32 sm:pb-28' : ''}`}>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-50 bg-white/95 backdrop-blur transition-shadow ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="sm:hidden"><Logo variant="default" size="sm" /></div>
          <div className="hidden sm:block"><Logo variant="default" size="md" /></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-hs-neutral-100 rounded-lg p-0.5 sm:p-1 gap-0.5 sm:gap-1">
              {(['PT', 'BR', 'US'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMarket(m)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-sm font-medium transition-all ${
                    market === m ? 'bg-white text-hs-neutral-900 shadow-sm' : 'text-hs-neutral-500 hover:text-hs-neutral-700'
                  }`}
                >
                  <span>{CONTENT[m].flag}</span>
                  <span className="hidden sm:inline">{CONTENT[m].label}</span>
                </button>
              ))}
            </div>
            <Link href="/login" className="text-sm text-hs-neutral-500 hover:text-hs-neutral-900 transition-colors">
              {c.nav}
            </Link>
            <Button asChild size="sm" className="bg-hs-cta-bg hover:bg-hs-cta-bg-hover text-white border-0">
              <Link href="/register">{c.cta}</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── PWA Banner (Safari Mobile) ────────────────────────────────────────── */}
      {showPwaBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-hs-brand-500 border-t border-hs-brand-600 shadow-lg animate-in slide-in-from-bottom-2">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-1">
                  {c.pwaBannerTitle}
                </h3>
                <p className="text-xs sm:text-sm text-hs-brand-100">
                  {c.pwaBannerDesc}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    const section = document.getElementById('pwa-install')
                    if (section) {
                      section.scrollIntoView({ behavior: 'smooth' })
                    }
                    setShowPwaBanner(false)
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-hs-brand-600 text-xs sm:text-sm font-medium rounded-lg hover:bg-hs-brand-50 transition-colors whitespace-nowrap"
                >
                  {c.pwaBannerAction}
                </button>
                <button
                  onClick={() => {
                    setShowPwaBanner(false)
                    sessionStorage.setItem('pwa-banner-dismissed', 'true')
                  }}
                  className="p-1.5 text-white hover:bg-hs-brand-600 rounded-lg transition-colors"
                  aria-label="Close banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center">
        <div className="inline-flex items-center gap-2 bg-hs-brand-50 text-hs-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Shield className="h-4 w-4" />
          {c.heroBadge}
        </div>
        <h1 className="text-5xl sm:text-7xl font-extrabold text-hs-neutral-900 mb-6 leading-tight max-w-4xl mx-auto">
          {c.headline}
        </h1>
        <p className="text-xl text-hs-neutral-500 max-w-2xl mx-auto mb-10">
          {c.subheadline}
        </p>
        <form onSubmit={handleCheckout} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-3">
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={c.emailPlaceholder}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={loading} className="whitespace-nowrap bg-hs-cta-bg hover:bg-hs-cta-bg-hover text-white border-0">
            {loading ? '...' : <>{c.cta} <ArrowRight className="h-4 w-4 ml-1" /></>}
          </Button>
        </form>
        <p className="text-xs text-hs-neutral-500">{c.ctaSub}</p>

        {/* Trust row */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-hs-neutral-500">
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-hs-success" /> {c.trustSync}</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-hs-success" /> {c.trustCurrencies}</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-hs-success" /> {c.trustOverbookings}</span>
          <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-hs-success" /> {c.trustCancel}</span>
        </div>
      </section>

      {/* ── Pain ─────────────────────────────────────────────────────────────── */}
      <section className="bg-hs-accent-50 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-hs-neutral-900 text-center mb-12">
            {c.painTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {c.pains.map(pain => (
              <div key={pain.title} className="bg-white border border-hs-accent-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <span className="text-hs-accent-500 text-xl mt-0.5 shrink-0">⚠</span>
                  <div>
                    <h3 className="font-semibold text-hs-neutral-900 mb-2">{pain.title}</h3>
                    <p className="text-sm text-hs-neutral-500 leading-relaxed">{pain.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Solution intro ───────────────────────────────────────────────────── */}
      <section className="bg-hs-brand-50 py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-hs-neutral-900 mb-4">
            {c.solutionTitle}
          </h2>
          <p className="text-lg text-hs-neutral-500 leading-relaxed">{c.solutionDesc}</p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-hs-neutral-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-hs-neutral-900 mb-4">{c.sectionFeaturesTitle}</h2>
            <p className="text-hs-neutral-500 text-lg max-w-xl mx-auto">{c.sectionFeaturesDesc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {c.featureCards.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-hs-border-subtle hover:shadow-lg hover:border-hs-brand-200 transition-all duration-300">
                <div className="p-4 bg-gradient-to-br from-hs-brand-100 to-hs-brand-50 rounded-xl inline-flex mb-4">
                  <Icon className="h-6 w-6 text-hs-brand-600" />
                </div>
                <h3 className="font-semibold text-hs-neutral-900 mb-2 text-sm">{title}</h3>
                <p className="text-xs text-hs-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-hs-neutral-50/50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-hs-neutral-900 text-center mb-14">{c.stepsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-1 bg-gradient-to-r from-hs-brand-200 via-hs-brand-400 to-hs-brand-200 z-0 rounded-full" />
            {c.steps.map(step => (
              <div key={step.num} className="text-center relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-hs-brand-500 to-hs-brand-600 text-white rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-5 shadow-lg">
                  {step.num}
                </div>
                <h3 className="font-bold text-hs-neutral-900 text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-hs-neutral-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-hs-brand-700 via-hs-brand-600 to-hs-brand-800 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {c.stats.map(stat => (
              <div key={stat.label} className="backdrop-blur-sm">
                <div className="text-4xl font-extrabold text-white mb-2">{stat.value}</div>
                <div className="text-xs sm:text-sm text-hs-brand-100 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Segments ─────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-hs-neutral-900 text-center mb-12">{c.segmentsTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {c.segments.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="border border-hs-border-subtle rounded-2xl p-8 hover:border-hs-brand-400 hover:shadow-xl hover:shadow-hs-brand-500/10 transition-all duration-300 group">
                <div className="p-4 bg-gradient-to-br from-hs-brand-100 to-hs-brand-50 rounded-xl inline-flex mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-7 w-7 text-hs-brand-600" />
                </div>
                <h3 className="font-bold text-hs-neutral-900 text-lg mb-3">{title}</h3>
                <p className="text-hs-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compare ──────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-hs-neutral-100 to-white py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-hs-neutral-900 text-center mb-12">{c.compareTitle}</h2>
          <div className="overflow-x-auto rounded-2xl shadow-lg border border-hs-border-subtle">
            <table className="w-full bg-white text-sm">
              <thead>
                <tr className="border-b border-hs-border-subtle bg-gradient-to-r from-hs-brand-500 to-hs-brand-600">
                  {c.compareHeaders.map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-4 text-left font-semibold ${
                        i === 1 ? 'bg-gradient-to-r from-hs-brand-500 to-hs-brand-600 text-white' : i === 0 ? 'text-hs-neutral-700 bg-hs-brand-50' : 'text-white'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.compareRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-hs-border-subtle last:border-0 hover:bg-hs-brand-50/30 transition-colors">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-5 py-3.5 ${
                          ci === 0 ? 'text-hs-neutral-700 font-medium' :
                          ci === 1 ? 'bg-hs-brand-50/50 font-semibold text-hs-brand-600' : 'text-hs-neutral-500'
                        }`}
                      >
                        {ci === 0 ? cell : <CompareCellValue val={cell} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-hs-neutral-900 text-center mb-12">{c.faqTitle}</h2>
          <div className="space-y-3">
            {c.faqs.map((faq, i) => (
              <div key={i} className="border border-hs-border-subtle rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-hs-neutral-50 transition-colors"
                >
                  <span className="font-medium text-hs-neutral-900 pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-hs-neutral-500 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-hs-neutral-500 leading-relaxed border-t border-hs-border-subtle pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PWA Install ────────────────────────────────────────────────────── */}
      <section id="pwa-install" className="bg-hs-brand-50 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-hs-brand-100 rounded-2xl mb-4">
              <Smartphone className="h-7 w-7 text-hs-brand-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-hs-neutral-900 mb-3">{c.pwaTitle}</h2>
            <p className="text-hs-neutral-500 text-lg max-w-xl mx-auto">{c.pwaDesc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {c.pwaSteps.map((step, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-hs-border-subtle text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-hs-brand-50 rounded-xl mb-4">
                  {step.icon === 'globe' && <Globe className="h-6 w-6 text-hs-brand-600" />}
                  {step.icon === 'share' && <Share className="h-6 w-6 text-hs-brand-600" />}
                  {step.icon === 'plus' && <PlusSquare className="h-6 w-6 text-hs-brand-600" />}
                </div>
                <div className="text-sm font-bold text-hs-brand-600 mb-1">
                  {i + 1}.
                </div>
                <h3 className="font-semibold text-hs-neutral-900 mb-2">{step.title}</h3>
                <p className="text-sm text-hs-neutral-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-hs-neutral-500 bg-white/60 rounded-lg py-3 px-4 max-w-lg mx-auto">
            <Smartphone className="h-4 w-4 inline-block mr-1.5 -mt-0.5 text-hs-brand-500" />
            {c.pwaTip}
          </p>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-hs-neutral-100 py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-hs-neutral-900 mb-4">{c.sectionPricingTitle}</h2>
            <p className="text-hs-neutral-500 text-lg">{c.sectionPricingDesc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLAN_DISPLAY.map((plan, idx) => {
              const pl = PRICING_L10N[market]
              const loc = pl.plans[idx]
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl shadow-sm border-2 p-6 flex flex-col relative ${
                    plan.highlighted ? 'border-hs-brand-500' : 'border-hs-border-subtle'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-hs-brand-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                        {pl.popularBadge}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-hs-neutral-900">{plan.name}</h3>
                    <p className="text-sm text-hs-neutral-500 mt-0.5">{loc.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-hs-neutral-900">{pl.symbol}{plan.price}</span>
                    <span className="text-hs-neutral-500 text-sm">{pl.period}</span>
                  </div>
                  <p className="text-xs text-hs-neutral-500 mb-5">{loc.properties}</p>

                  <ul className="space-y-2 mb-6 flex-1">
                    {loc.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-hs-neutral-700">
                        <Check className="h-4 w-4 text-hs-brand-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handlePlanCheckout(plan.id)}
                    disabled={loadingPlan !== null}
                    variant={plan.highlighted ? 'default' : 'outline'}
                    className={plan.highlighted
                      ? 'w-full bg-hs-cta-bg hover:bg-hs-cta-bg-hover text-white border-0'
                      : 'w-full border-hs-brand-500 text-hs-brand-600 hover:bg-hs-brand-50'
                    }
                  >
                    {loadingPlan === plan.id ? '...' : (
                      <>{c.cta} <ArrowRight className="h-4 w-4 ml-1" /></>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-2 mt-8 text-sm text-hs-neutral-500">
            <Shield className="h-4 w-4 text-hs-success" />
            {c.guarantee}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-hs-brand-600 via-hs-brand-500 to-hs-brand-700 py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 bg-hs-brand-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-72 h-72 bg-hs-brand-700 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            {c.finalTitle}
          </h2>
          <p className="text-hs-brand-100 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">{c.finalDesc}</p>
          <form onSubmit={handleCheckout} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={c.emailPlaceholder}
              required
              className="flex-1 bg-white/20 border border-white/30 text-white placeholder:text-hs-brand-100 focus:bg-white focus:text-hs-neutral-900 focus:placeholder:text-hs-neutral-500 backdrop-blur-sm rounded-lg"
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-white text-hs-brand-600 hover:bg-hs-brand-50 whitespace-nowrap font-semibold shadow-lg"
            >
              {loading ? '...' : <>{c.cta} <ArrowRight className="h-4 w-4 ml-1" /></>}
            </Button>
          </form>
          <p className="text-hs-brand-200 text-xs mt-4">{c.ctaSub}</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-gradient-to-b from-hs-neutral-900 to-hs-neutral-950 py-12 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 mb-8">
            <Logo variant="white" size="md" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
              <Link href="/privacy" className="text-xs sm:text-sm text-hs-neutral-400 hover:text-hs-brand-300 transition-colors duration-200">
                {c.footerPrivacy}
              </Link>
              <Link href="/terms" className="text-xs sm:text-sm text-hs-neutral-400 hover:text-hs-brand-300 transition-colors duration-200">
                {c.footerTerms}
              </Link>
              <Link href="/login" className="text-xs sm:text-sm text-hs-neutral-400 hover:text-hs-brand-300 transition-colors duration-200">
                {c.footerLinks}
              </Link>
            </div>
          </div>
          <div className="border-t border-hs-neutral-800 pt-6">
            <p className="text-xs sm:text-sm text-hs-neutral-500 text-center">
              © {new Date().getFullYear()} Lodgra. {c.footerRights}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
