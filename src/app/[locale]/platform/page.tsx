import { notFound, redirect } from 'next/navigation'
import { Clock } from 'lucide-react'
import { CronJobsManager } from '@/components/features/platform/CronJobsManager'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { resolvePlatformAdmin } from '@/lib/auth/platform-admin'

export const dynamic = 'force-dynamic'

export default async function PlatformPage() {
  const access = await resolvePlatformAdmin()

  if (access.status === 'unauthenticated') redirect('/login')
  // Quem não é operador não deve nem saber que a página existe.
  if (access.status === 'forbidden') notFound()
  if (access.status === 'error') throw new Error('Não foi possível verificar o acesso à plataforma')

  return (
    <AuthLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Plataforma · Automação e Cron Jobs</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Tarefas globais da plataforma Lodgra. Cada execução fica registada na auditoria.
          </p>
        </div>

        <CronJobsManager />
      </main>
    </AuthLayout>
  )
}
