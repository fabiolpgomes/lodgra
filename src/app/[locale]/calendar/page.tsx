import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LazyCalendar } from '@/components/common/lazy/LazyCalendar'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { CalendarDays } from 'lucide-react'

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  return (
    <AuthLayout>
      <PremiumPageShell>
        <PremiumPageHeader
          title="Calendário"
          description="Visualize reservas, bloqueios e disponibilidade das propriedades"
          icon={CalendarDays}
        />
        <div className="border-b border-neutral-200/60" />
        <PremiumCard className="p-2 sm:p-4">
          <LazyCalendar />
        </PremiumCard>
      </PremiumPageShell>
    </AuthLayout>
  )
}
