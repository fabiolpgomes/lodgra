import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/requireRole'

export default async function EditUserPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const { locale } = await props.params
  const auth = await requireRole(['admin'])
  if (!auth.authorized) redirect('/login')
  redirect(`/${locale}/settings#gestao-utilizadores`)
}
