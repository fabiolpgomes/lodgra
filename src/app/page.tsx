export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { BrazilLanding } from '@/components/marketing/regions/BrazilLanding'
import { EuropeLanding } from '@/components/marketing/regions/EuropeLanding'

export const metadata: Metadata = {
  title: 'Lodgra - Gestão Inteligente de Hospedagem',
  description: 'Transforma tus propiedades en activos financieros de alto rendimiento. Gestiona calendarios, reservas, gastos y finanzas en una sola plataforma.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Lodgra - Hospedagem Inteligente',
    description: 'Automatiza a gestão das tuas propriedades e maximiza lucros com inteligência artificial.',
    url: 'https://lodgra.io',
    siteName: 'Lodgra',
    locale: 'pt_PT',
    type: 'website',
  },
}

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const locale = await getLocale()

  // Lógica de Segmentação de Marketing por Região
  // 1. Brasil: Modelo agressivo focado em ROI e comparação direta.
  if (locale === 'pt-BR') {
    return <BrazilLanding />
  }

  // 2. Europa (Espanha, etc): Modelo clean/premium universal.
  if (locale === 'es') {
    return <EuropeLanding locale={locale} />
  }

  // 3. USA / International: Placeholder ou modelo Europa por enquanto.
  if (locale === 'en-US') {
    // Por enquanto usamos o EuropeLanding para tráfego internacional/USA
    // Futuramente aqui entrará o USALanding.tsx
    return <EuropeLanding locale="en-US" />
  }

  // Default: Modelo Brasil ou Europa? 
  // O usuário disse que atua no Brasil agora, então mantemos Brasil como fallback se quiser,
  // ou Europa como fallback internacional. Vamos de internacional por segurança.
  return <EuropeLanding locale="en-US" />
}

