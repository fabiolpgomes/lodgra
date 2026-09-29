import { requireRole } from '@/lib/auth/requireRole'
import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { Wallet } from 'lucide-react'
import { OnlinePayments } from '@/components/billing/OnlinePayments'

export const dynamic = 'force-dynamic'

export default async function OnlinePaymentsPage() {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) redirect('/login')

  return (
    <AuthLayout>
      <PremiumPageShell maxWidth="max-w-5xl">
        <PremiumPageHeader
          title="Pagamentos online"
          description="Receba o pagamento das reservas diretas na sua conta, com segurança, pelo Stripe"
          icon={Wallet}
        />
        <PremiumCard>
          <OnlinePayments />
        </PremiumCard>
      </PremiumPageShell>
    </AuthLayout>
  )
}
