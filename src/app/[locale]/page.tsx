import { BrazilLanding } from '@/components/marketing/regions/BrazilLanding'
import { EuropeLanding } from '@/components/marketing/regions/EuropeLanding'

/**
 * /[locale] — Landing page (unauthenticated users)
 * This is a PUBLIC route, so it always renders the landing page
 * User auth/redirects are handled by middleware
 */
export default async function LocalizedRootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (locale === 'pt-BR') {
    return <BrazilLanding />
  }

  if (locale === 'es' || locale === 'en-US') {
    return <EuropeLanding locale={locale as 'es' | 'en-US'} />
  }

  return <EuropeLanding locale="en-US" />
}
