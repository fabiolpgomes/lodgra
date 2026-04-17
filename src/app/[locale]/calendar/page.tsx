import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LazyCalendar } from '@/components/common/lazy/LazyCalendar'
import { AuthLayout } from '@/components/common/layout/AuthLayout'

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
      <div className="pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <LazyCalendar />
        </div>
      </div>
    </AuthLayout>
  )
}
