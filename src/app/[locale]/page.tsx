import { BrazilLanding } from '@/components/marketing/regions/BrazilLanding'
import { EuropeLanding } from '@/components/marketing/regions/EuropeLanding'

export async function generateStaticParams() {
  return [{ locale: 'pt-BR' }, { locale: 'en-US' }, { locale: 'es' }];
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  if (locale === 'pt-BR') {
    return <BrazilLanding />
  }

  return <EuropeLanding locale={locale === 'es' ? 'es' : 'en-US'} />
}
