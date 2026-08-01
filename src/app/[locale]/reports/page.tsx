import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    start_date?: string
    end_date?: string
    property_id?: string
    tab?: string
  }>
}

export default async function ReportsPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const paramValues = await searchParams

  const queryString = new URLSearchParams({
    ...(paramValues.start_date && { start_date: paramValues.start_date }),
    ...(paramValues.end_date && { end_date: paramValues.end_date }),
    ...(paramValues.property_id && { property_id: paramValues.property_id }),
    ...(paramValues.tab && { tab: paramValues.tab }),
  }).toString()

  redirect(`/${locale}/reports/financeiro${queryString ? '?' + queryString : ''}`)
}
