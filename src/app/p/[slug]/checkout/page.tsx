import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckoutForm } from '@/components/common/public/CheckoutForm'
import { getPriceForRange } from '@/lib/pricing/getPriceForRange'
import { differenceInDays, parseISO, isValid, isBefore, startOfDay } from 'date-fns'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Checkout — Reserva Directa',
  robots: { index: false },
}

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ checkin?: string; checkout?: string; guests?: string }>
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { checkin, checkout, guests: guestsParam } = await searchParams

  // Validate query params — redirect back if invalid
  if (!checkin || !checkout) {
    redirect(`/p/${slug}`)
  }

  const checkinDate = parseISO(checkin)
  const checkoutDate = parseISO(checkout)
  const today = startOfDay(new Date())

  if (
    !isValid(checkinDate) ||
    !isValid(checkoutDate) ||
    isBefore(checkinDate, today) ||
    differenceInDays(checkoutDate, checkinDate) < 1
  ) {
    redirect(`/p/${slug}`)
  }

  const guests = Math.max(1, parseInt(guestsParam ?? '1') || 1)

  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, city, base_price, is_public, slug')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!property) {
    redirect('/')
  }

  // Calculate correct price with pricing rules
  const priceData = await getPriceForRange(property.id, checkinDate, checkoutDate)
  const totalPrice = priceData.total
  const nights = differenceInDays(checkoutDate, checkinDate)

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <a href={`/p/${slug}`} className="font-semibold text-gray-900 text-lg">
            lodgra.pt
          </a>
          <span className="text-sm text-gray-500">Reserva Segura</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Finalizar Reserva</h1>

        <CheckoutForm
          slug={slug}
          propertyName={property.name}
          city={property.city ?? null}
          checkin={checkin}
          checkout={checkout}
          guests={guests}
          totalPrice={totalPrice}
        />
      </main>

      <footer className="mt-16 border-t border-gray-100 px-4 py-4 text-center text-xs text-gray-400">
        Pagamento processado com segurança por Stripe · lodgra.pt
      </footer>
    </div>
  )
}
