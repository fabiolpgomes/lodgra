import { redirect } from 'next/navigation'

export async function generateStaticParams() {
  return [{ locale: 'pt-BR' }, { locale: 'en-US' }, { locale: 'es' }];
}

export default function Page({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/landing-vp`)
}
