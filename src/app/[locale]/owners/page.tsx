import Link from 'next/link'
import { Users, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { OwnersFilter } from '@/components/features/owners/OwnersFilter'
import { getUserRole } from '@/lib/auth/getUserRole'
import { Button } from '@/components/common/ui/button'
import { parsePage, getRange, PAGE_SIZE } from '@/lib/utils/pagination'
import { PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'

export default async function OwnersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { locale } = await params
  const queryParams = await searchParams
  const page = parsePage(queryParams)
  const { from, to } = getRange(page)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userRole = await getUserRole(supabase)
  const canEdit = userRole === 'admin' || userRole === 'gestor'
  const canDelete = userRole === 'admin'

  // Proprietários paginados + contagem de propriedades em paralelo
  const [{ data: owners, count: totalCount }, { data: propertyCounts }] = await Promise.all([
    supabase.from('owners').select('*', { count: 'exact' }).order('full_name').range(from, to),
    supabase.from('properties').select('owner_id').not('owner_id', 'is', null),
  ])

  const countMap: Record<string, number> = {}
  propertyCounts?.forEach((p) => {
    countMap[p.owner_id] = (countMap[p.owner_id] || 0) + 1
  })

  return (
    <AuthLayout>
      <PremiumPageShell>
        <PremiumPageHeader
          title="Proprietários"
          description="Gerencie os proprietários dos imóveis"
          icon={Users}
          badge={`${totalCount ?? 0} registros`}
          actions={canEdit && (
            <Button asChild variant="action">
              <Link href={`/${locale}/owners/new`} className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Novo Proprietário
              </Link>
            </Button>
          )}
        />

        <div className="border-b border-neutral-200/60" />

        {/* Filter + Search + List */}
        <OwnersFilter
          locale={locale}
          owners={owners || []}
          countMap={countMap}
          canEdit={canEdit}
          canDelete={canDelete}
          pagination={{ page, total: totalCount ?? 0, pageSize: PAGE_SIZE }}
        />
      </PremiumPageShell>
    </AuthLayout>
  )
}
