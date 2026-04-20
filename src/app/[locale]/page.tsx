import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BrazilLanding } from '@/components/marketing/regions/BrazilLanding'
import { EuropeLanding } from '@/components/marketing/regions/EuropeLanding'

/**
 * /[locale] — Renderiza a landing page regional se o usuário não estiver logado,
 * ou redireciona para o dashboard se estiver logado.
 */
export default async function LocalizedRootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // --- Fluxo para usuários NÃO LOGADOS (Landing Pages Regionais) ---
  if (!user) {
    if (locale === 'pt-BR') {
      return <BrazilLanding />
    }
    if (locale === 'pt' || locale === 'es' || locale === 'en-US') {
      return <EuropeLanding locale={locale as 'pt' | 'es' | 'en-US'} />
    }
    return <EuropeLanding locale="en-US" />
  }

  // --- Fluxo para usuários LOGADOS (Painel Interno) ---
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .maybeSingle()

  // BYPASS DE EMERGÊNCIA PARA TESTES
  const isDevAdmin = user.email === 'admin@dev.com'
  const effectiveRole = isDevAdmin ? 'admin' : (profile?.role || 'viewer')
  const effectiveOrgId = isDevAdmin ? (profile?.organization_id || '6ad77f39-0a6b-44d5-b7fa-5603e1b53d66') : profile?.organization_id

  if (effectiveRole === 'admin' || effectiveRole === 'gestor') {
    redirect(`/${locale}/dashboard`)
  } else {
    redirect(`/${locale}/calendar`)
  }
}
