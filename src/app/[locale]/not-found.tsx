import { BrazilLanding } from '@/components/marketing/regions/BrazilLanding'
import { EuropeLanding } from '@/components/marketing/regions/EuropeLanding'

/**
 * Fallback for 404 errors in [locale] segment
 * Instead of showing default 404, render appropriate landing page
 */
export default function NotFound({
  params,
}: {
  params: { locale: string }
}) {
  const { locale } = params

  if (locale === 'pt-BR') {
    return <BrazilLanding />
  }

  if (locale === 'es' || locale === 'en-US') {
    return <EuropeLanding locale={locale as 'es' | 'en-US'} />
  }

  return <EuropeLanding locale="en-US" />
}
