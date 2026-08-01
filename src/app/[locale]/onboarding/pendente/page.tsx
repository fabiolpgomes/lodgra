'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/common/ui/Logo'
import { Button } from '@/components/common/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'

export default function OnboardingPendentePage() {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'pt-BR'

  const [plan, setPlan] = useState<string>('essencial')
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      if (user.email) setEmail(user.email)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('subscription_plan')
          .eq('id', profile.organization_id)
          .single()

        if (org?.subscription_plan) setPlan(org.subscription_plan)
      }
    })
  }, [])

  async function handleRetryCheckout() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email, source: 'onboarding', locale, currency: 'brl' }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Erro ao iniciar checkout')
        setLoading(false)
      }
    } catch {
      setError('Erro de ligação. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>

        <div className="flex justify-center mb-4">
          <div className="p-3 bg-amber-100 rounded-full">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Pagamento pendente
        </h1>
        <p className="text-gray-600 text-sm mb-2">
          A sua conta está criada mas precisa de uma subscrição activa para aceder ao painel.
        </p>
        <p className="text-gray-500 text-xs mb-6">
          Os seus dados (organização e imóvel) foram guardados e estão prontos para usar.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-left">
            {error}
          </div>
        )}

        <Button
          className="w-full mb-3"
          onClick={handleRetryCheckout}
          disabled={loading}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />A preparar pagamento...</>
            : 'Completar pagamento →'
          }
        </Button>

        <p className="text-xs text-gray-500">
          Tem dúvidas?{' '}
          <a href="mailto:suporte@lodgra.com" className="underline hover:text-gray-600">
            Contactar suporte
          </a>
        </p>
      </div>
    </div>
  )
}
