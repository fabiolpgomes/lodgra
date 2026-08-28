import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, ChevronLeft, FileText, Sparkles } from 'lucide-react'

import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { Step2CompanyProfile } from '@/components/features/onboarding/Step2CompanyProfile'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function CompanyProfilePage(props: { params: Promise<{ locale: string; orgId: string }> }) {
  const { locale, orgId } = await props.params
  const auth = await requireRole(['admin'])
  if (!auth.authorized) {
    if (auth.response?.status === 401) {
      redirect(`/${locale}/login`)
    }
    redirect(`/${locale}/account`)
  }
  if (auth.organizationId !== orgId) redirect(`/${locale}/settings`)

  const adminClient = createAdminClient()
  const { data: organization } = await adminClient
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .maybeSingle()

  if (!organization) {
    redirect(`/${locale}/settings`)
  }

  return (
    <AuthLayout>
      <PremiumPageShell maxWidth="max-w-5xl">
        <PremiumPageHeader
          title="Dados da empresa"
          description="Atualize nome, logotipo, cores e contactos que alimentam o PDF e a apresentação da marca."
          icon={Building2}
          badge="Configuração"
        />

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${locale}/settings`}
            className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-white px-4 py-2 text-sm font-semibold text-brand-blue transition-colors hover:border-brand-gold hover:text-brand-gold"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar às definições
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-text-medium">
            <Sparkles className="h-4 w-4 text-brand-blue" />
            Esta é a tela para editar os dados usados no sistema
          </div>
        </div>

        <section className="mb-8">
          <PremiumCard>
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-brand-blue" />
              <div>
                <h2 className="text-lg font-semibold text-brand-text-dark">O que esta tela alimenta</h2>
                <p className="mt-2 text-sm text-brand-text-medium">
                  O nome da empresa aparece no shell e nos relatórios. Logo, cores e contactos são usados no PDF,
                  no rodapé e nas páginas públicas.
                </p>
              </div>
            </div>
          </PremiumCard>
        </section>

        <section>
          <PremiumCard>
            <Step2CompanyProfile organizationId={organization.id} initialOrgName={organization.name} />
          </PremiumCard>
        </section>
      </PremiumPageShell>
    </AuthLayout>
  )
}
