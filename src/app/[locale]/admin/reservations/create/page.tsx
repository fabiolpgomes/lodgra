import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DirectBookingForm } from '../../components/DirectBookingForm'

export const metadata = {
  title: 'Criar Reserva Manual',
  description: 'Crie uma reserva manual diretamente no sistema',
}

export default async function DirectBookingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/admin')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Criar Reserva Manual</h1>
          <p className="text-gray-600 mt-2">
            Preencha o formulário abaixo para criar uma reserva diretamente. O sistema vai validar
            disponibilidade, preço e conflitos antes de confirmar.
          </p>
        </div>

        <DirectBookingForm
          onSuccess={(reservationId) => {
            console.log('Reservation created:', reservationId)
          }}
        />
      </div>
    </div>
  )
}
