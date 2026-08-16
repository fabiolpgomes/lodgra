import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { Logo } from '@/components/common/ui/Logo'
import { CheckoutPageClient } from './CheckoutPageClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Checkout — Reserva Directa',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function CheckoutPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = createAdminClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, city, currency, is_public, slug, max_guests, cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!property) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-brand-gold/15 bg-brand-white px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <a href={`/p/${slug}`} aria-label="Lodgra">
            <Logo size="sm" />
          </a>
          <span className="rounded-full border border-brand-gold/25 bg-brand-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-[1.2px] text-brand-blue">Reserva Segura</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold text-brand-text-dark mb-6">Finalizar Reserva</h1>
        <CheckoutPageClient
          slug={slug}
          propertyName={property.name}
          city={property.city ?? null}
          currency={property.currency ?? 'EUR'}
          maxGuests={property.max_guests ?? null}
          feeConfig={{
            cleaningFee: property.cleaning_fee ?? null,
            cleaningFeeType: property.cleaning_fee_type ?? null,
            petFee: property.pet_fee ?? null,
            petFeeType: property.pet_fee_type ?? null,
          }}
        />
      </main>

      <footer className="mt-16 border-t border-brand-gold/15 bg-brand-white px-4 py-4 text-center text-xs text-brand-text-medium">
        Pagamento processado com segurança por Stripe · lodgra.io
      </footer>
    </div>
  )
}
