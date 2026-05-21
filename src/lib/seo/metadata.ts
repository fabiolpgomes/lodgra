/**
 * SEO Metadata - Centralized meta tags and descriptions
 * Task 1.1: Meta Descriptions Implementation (Week 1)
 * Date: May 21, 2026
 */

export const seoMetadata = {
  // Homepage
  home: {
    title: 'Gestão de Imóveis - Lodgra | Maximize Lucros',
    description: 'Plataforma inteligente para gestão de imóveis aluguel. Ferramentas de pricing, compliance fiscal e automação. Aumente seus lucros em 30 dias. Experimente grátis.',
    keywords: 'gestão imóvel, aluguel, lucro, Airbnb, Booking',
  },

  // Features/Product pages
  features: {
    title: 'Funcionalidades - Lodgra | Gestão Inteligente',
    description: 'Descubra as ferramentas Lodgra: pricing inteligente, compliance fiscal, integração Airbnb/Booking, analytics em tempo real. Maximize seus lucros.',
    keywords: 'gestão, ferramentas, pricing, compliance fiscal',
  },

  // Pricing page
  pricing: {
    title: 'Planos - Lodgra | Comece Grátis Agora',
    description: '3 planos flexíveis para proprietários de todos os tamanhos: Starter, Pro, Enterprise. Experimente grátis por 14 dias. Sem compromisso.',
    keywords: 'preço, planos, pricing, gratuito',
  },

  // Documentation/Docs
  docs: {
    title: 'Documentação - Lodgra | Guias & Tutoriais',
    description: 'Aprenda a maximizar seus lucros com Lodgra. Guias passo-a-passo, FAQ, integração com Airbnb/Booking, compliance fiscal. Suporte 24/7.',
    keywords: 'guia, tutorial, documentação, ajuda',
  },

  // Blog index
  blog: {
    title: 'Blog - Lodgra | Dicas de Gestão Imobiliária',
    description: 'Artigos sobre como maximizar lucros em aluguel temporada, deduções fiscais, estratégias de pricing, e experiências de proprietários.',
    keywords: 'blog, dicas, artigos, vacation rental',
  },

  // Support/FAQ
  support: {
    title: 'Suporte - Lodgra | Perguntas Frequentes',
    description: 'Encontre respostas para perguntas comuns sobre Lodgra. Guias de setup, troubleshooting, integração com plataformas e compliance fiscal.',
    keywords: 'ajuda, suporte, faq, perguntas',
  },

  // Authentication pages
  login: {
    title: 'Login - Lodgra | Acesse sua Conta',
    description: 'Entre em sua conta Lodgra para gerenciar suas propriedades, acompanhar lucros e otimizar sua estratégia de preços.',
    keywords: 'login, acesso, conta',
  },

  register: {
    title: 'Registrar - Lodgra | Comece Grátis',
    description: 'Crie sua conta Lodgra gratuitamente e comece a maximizar seus lucros com gestão inteligente de propriedades.',
    keywords: 'registro, criar conta, grátis',
  },

  // Privacy/Legal
  privacy: {
    title: 'Política de Privacidade - Lodgra',
    description: 'Conheça nossa política de privacidade e como protegemos seus dados.',
    keywords: 'privacidade, dados, proteção',
  },

  terms: {
    title: 'Termos de Serviço - Lodgra',
    description: 'Leia nossos termos de serviço e condições de uso da plataforma Lodgra.',
    keywords: 'termos, condições, serviço',
  },

  // Additional pages
  booking: {
    title: 'Booking - Lodgra | Gerenciar Reservas',
    description: 'Gerencie todas as suas reservas em um único lugar. Sincronize Airbnb, Booking e outras plataformas automaticamente.',
    keywords: 'booking, reservas, integração',
  },

  dashboard: {
    title: 'Dashboard - Lodgra | Seu Painel de Controle',
    description: 'Visualize todas as métricas do seu negócio: ocupação, receita, despesas e muito mais em tempo real.',
    keywords: 'dashboard, painel, controle',
  },

  properties: {
    title: 'Propriedades - Lodgra | Gerencie Seus Imóveis',
    description: 'Gerencie todas as suas propriedades, calendários e integrações em um único lugar.',
    keywords: 'propriedades, imóveis, gerenciamento',
  },

  financial: {
    title: 'Financeiro - Lodgra | Controle Suas Finanças',
    description: 'Acompanhe receitas, despesas, lucros e relatórios financeiros detalhados de suas propriedades.',
    keywords: 'financeiro, receita, despesa, lucro',
  },

  cleaning: {
    title: 'Limpeza - Lodgra | Gerencie Limpezas',
    description: 'Organize e gerencie as limpezas entre as suas reservas e mantenha seus hóspedes satisfeitos.',
    keywords: 'limpeza, manutenção, hóspedes',
  },

  calendar: {
    title: 'Calendário - Lodgra | Sincronize Suas Reservas',
    description: 'Veja o calendário consolidado de todas as suas propriedades e plataformas em um único lugar.',
    keywords: 'calendário, reservas, sincronização',
  },

  reports: {
    title: 'Relatórios - Lodgra | Análise de Desempenho',
    description: 'Gere relatórios detalhados sobre ocupação, receita, despesas e desempenho das suas propriedades.',
    keywords: 'relatórios, análise, desempenho',
  },
};

/**
 * Blog post metadata template
 * Usage: generateBlogMetadata(title, description)
 */
export function generateBlogMetadata(title: string, description: string) {
  return {
    title: `${title} - Blog Lodgra`,
    description: `${description} Saiba como aproveitar as melhores práticas de gestão imobiliária com Lodgra.`,
  };
}

/**
 * Integration pages metadata
 * Usage: generateIntegrationMetadata('Airbnb')
 */
export function generateIntegrationMetadata(platform: string) {
  return {
    title: `Integração ${platform} - Lodgra | Automático`,
    description: `Integre sua conta ${platform} com Lodgra. Gerenciar preços, ocupação, e reservas automaticamente. Aumente seus lucros em ${platform} sem esforço.`,
  };
}

/**
 * Open Graph meta tags for social sharing
 */
export const ogDefaults = {
  type: 'website' as const,
  siteName: 'Lodgra',
  locale: 'pt_PT',
  localeAlternate: ['pt_BR', 'es_ES', 'en_US'],
  image: {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Lodgra - Gestão Inteligente de Imóveis',
  },
};

/**
 * Twitter card meta tags
 */
export const twitterDefaults = {
  card: 'summary_large_image' as const,
  site: '@lodgra',
  creator: '@lodgra',
};
