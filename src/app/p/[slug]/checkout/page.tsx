import { redirect } from 'next/navigation'
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import { Logo } from '@/components/common/ui/Logo'
import { CheckoutPageClient } from './CheckoutPageClient'
import type { CurrencyCode } from '@/lib/utils/currency'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Checkout — Reserva Directa',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ checkIn?: string; checkOut?: string; checkin?: string; checkout?: string }>
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const checkIn = resolvedSearchParams.checkIn ?? resolvedSearchParams.checkin
  const checkOut = resolvedSearchParams.checkOut ?? resolvedSearchParams.checkout

  let isLongStay = false
  if (checkIn && checkOut) {
    const checkInDate = parseISO(checkIn)
    const checkOutDate = parseISO(checkOut)
    if (isValid(checkInDate) && isValid(checkOutDate)) {
      isLongStay = differenceInCalendarDays(checkOutDate, checkInDate) >= 28
    }
  }

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

  if (!property.currency) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 shadow-sm">
          Não foi possível abrir o checkout porque a propriedade não tem moeda configurada.
        </div>
      </div>
    )
  }

  const { data: cancellationPolicyData } = await supabase
    .from('property_cancellation_policies')
    .select('id, policy_type, full_refund_days, partial_refund_days, partial_refund_percent')
    .eq('property_id', property.id)
    .eq('is_long_stay', isLongStay)
    .eq('is_active', true)
    .maybeSingle()

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
          propertyId={property.id}
          slug={slug}
          propertyName={property.name}
          city={property.city ?? null}
          currency={property.currency as CurrencyCode}
          maxGuests={property.max_guests ?? null}
          cancellationPolicy={cancellationPolicyData ?? null}
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
