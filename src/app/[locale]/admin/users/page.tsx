import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/requireRole'

export default async function AdminUsersPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params
  const auth = await requireRole(['admin'])
  if (!auth.authorized) redirect('/login')
  redirect(`/${locale}/settings#gestao-utilizadores`)
}
