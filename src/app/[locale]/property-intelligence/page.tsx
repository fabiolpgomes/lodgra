import { redirect } from 'next/navigation'

export default async function PropertyIntelligenceAliasPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/ia-native`)
}
