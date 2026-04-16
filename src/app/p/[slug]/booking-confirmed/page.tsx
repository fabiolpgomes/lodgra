import { createAdminClient } from '@/lib/supabase/admin'
import { CheckCircle2, Calendar, Mail } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reserva Confirmada — homestay.pt',
  robots: { index: false },
}

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session_id?: string }>
}

export default async function BookingConfirmedPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { session_id } = await searchParams

  let reservation: {
    check_in: string
    check_out: string
    guest_name: string | null
    guest_email: string | null
    total_amount: string | null
    num_guests: number | null
  } | null = null

  if (session_id) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('reservations')
      .select(`
        check_in,
        check_out,
        guest_name,
        guest_email,
        total_amount,
        num_guests,
        property_listings!inner(
          properties!inner(slug)
        )
      `)
      .eq('stripe_checkout_session_id', session_id)
      .single()

    // Validate that the session belongs to this property slug
    const propertySlug = (data?.property_listings as unknown as { properties: { slug: string } })?.properties?.slug
    if (data && propertySlug !== slug) {
      // Security: don't expose other properties' reservations
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Página não encontrada</h1>
            <p className="text-gray-600 mt-2">A reserva solicitada não foi encontrada.</p>
          </div>
        </div>
      )
    }

    if (data) {
      // Data from query matches the reservation interface
      reservation = {
        check_in: (data as unknown as { check_in: string }).check_in,
        check_out: (data as unknown as { check_out: string }).check_out,
        guest_name: (data as unknown as { guest_name: string | null }).guest_name || null,
        guest_email: (data as unknown as { guest_email: string | null }).guest_email || null,
        total_amount: (data as unknown as { total_amount: string | null }).total_amount || null,
        num_guests: (data as unknown as { num_guests: number | null }).num_guests || null,
      }
    }
  }

  const fmtDate = (d: string) =>
    format(parseISO(d), "d 'de' MMMM yyyy", { locale: ptBR })

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <a href={`/p/${slug}`} className="font-semibold text-gray-900 text-lg">
            homestay.pt
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reserva confirmada!</h1>
        <p className="text-gray-500 mb-8">
          O seu pagamento foi processado com sucesso. Recebe um email de confirmação em breve.
        </p>

        {reservation && (
          <div className="rounded-xl border border-gray-200 p-5 text-left space-y-3 mb-8">
            {reservation.guest_name && (
              <p className="font-medium text-gray-900">{reservation.guest_name}</p>
            )}
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <Calendar className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
              <div>
                <p>Check-in: {fmtDate(reservation.check_in)}</p>
                <p>Check-out: {fmtDate(reservation.check_out)}</p>
              </div>
            </div>
            {reservation.guest_email && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                <span>Confirmação enviada para {reservation.guest_email}</span>
              </div>
            )}
            {reservation.total_amount && (
              <p className="text-sm font-semibold text-gray-900 pt-1 border-t border-gray-100">
                Total pago: {parseFloat(reservation.total_amount).toFixed(2)} €
              </p>
            )}
          </div>
        )}

        <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700 text-left mb-6">
          <p className="font-medium mb-1">Próximos passos</p>
          <p>O gestor da propriedade irá contactá-lo em breve com as instruções de check-in.</p>
        </div>

        <a
          href={`/p/${slug}`}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Ver a propriedade
        </a>
      </main>

      <footer className="mt-8 border-t border-gray-100 px-4 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} homestay.pt · Obrigado pela sua reserva!
      </footer>
    </div>
  )
}
