import { redirect } from 'next/navigation'
import { Clock } from 'lucide-react'
import { CronJobsManager } from '@/components/features/admin/CronJobsManager'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <AuthLayout>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Automação e Cron Jobs</h2>
          </div>
          <p className="text-gray-600">
            Gerencie tarefas agendadas e automação do sistema
          </p>
        </div>

        {/* Cron Jobs Manager */}
        <CronJobsManager />
      </main>
    </AuthLayout>
  )
}
