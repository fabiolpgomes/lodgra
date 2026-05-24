import { redirect } from 'next/navigation'

export async function generateStaticParams() {
  return [{ locale: 'pt-BR' }, { locale: 'en-US' }, { locale: 'es' }];
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/landing-vp`)
}
