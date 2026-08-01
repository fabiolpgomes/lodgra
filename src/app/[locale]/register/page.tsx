'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/i18n/routing'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'
import { Logo } from '@/components/common/ui/Logo'
import { useLocale } from '@/lib/i18n/routing'
import { useTranslations } from '@/lib/i18n/useTranslations'
import { toast } from 'sonner'

export default function RegisterPage() {
  const router = useRouter()
  const locale = useLocale()
  const tCommon = useTranslations('common')
  const translations = useTranslations('legal')
  const tLegal = (key: string) => translations(`consent.${key}`)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const fullName = formData.get('fullName') as string

    if (!acceptedTerms) {
      setError(tLegal('required'))
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres')
      setLoading(false)
      return
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('A senha deve conter pelo menos uma letra maiúscula e um número')
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) throw signUpError

      // Register terms and privacy consent server-side
      const consentTypes = [
        { consent_type: 'terms', consent_value: true },
        { consent_type: 'privacy_policy', consent_value: true },
      ]
      for (const consent of consentTypes) {
        fetch('/api/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(consent),
        }).catch(() => {})
      }

      // Verificar se precisa de confirmação de email
      if (data.user && !data.session) {
        toast.success('Conta criada! Verifique o seu email.')
        setSuccess(true)
      } else {
        toast.success('Conta criada! Verifique o seu email.')
        router.push('/')
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, var(--be-blue-pale) 0%, var(--be-blue-light) 100%)' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mb-4">
              <Logo size="lg" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifique o seu email
            </h2>
            <p className="text-gray-600 mb-6">
              Enviámos um link de confirmação para o seu email. Clique no link para ativar a sua conta.
            </p>
            <div className="bg-[color:var(--be-blue-pale)] border border-[color:var(--be-blue-light)] rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-700 mb-2">
                <strong>💡 Dica:</strong> Se não receber o email em alguns minutos:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Verifique a pasta <strong>Junk</strong> ou <strong>Spam</strong></li>
                <li>O email é da <strong>Supabase Auth</strong> (noreply@mail.app.supabase.io)</li>
                <li>Abra o email e clique em <strong>&quot;Confirm your email&quot;</strong></li>
              </ul>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Voltar ao Login</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-600">{tCommon('tagline')}</p>
        </div>

        {/* Card de Registo */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Criar Conta
          </h2>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nome */}
            <div>
              <Input
                type="text"
                id="fullName"
                name="fullName"
                required
                placeholder="Nome completo"
              />
            </div>

            {/* Email */}
            <div>
              <Input
                type="email"
                id="email"
                name="email"
                required
                placeholder="Email"
              />
            </div>

            {/* Senha */}
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                required
                minLength={8}
                className="pr-10"
                placeholder="Senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Confirmar Senha */}
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                required
                minLength={8}
                className="pr-10"
                placeholder="Confirmar senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Terms & Privacy acceptance */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[color:var(--be-blue)] focus:ring-brand-500"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-600 leading-tight">
                {tLegal('acceptTerms')}{' '}
                <Link href={locale ? `/${locale}/terms` : '/terms'} target="_blank" className="text-[color:var(--be-blue)] hover:underline">
                  {tLegal('termsLink')}
                </Link>{' '}
                {tLegal('and')}{' '}
                <Link href={locale ? `/${locale}/privacy` : '/privacy'} target="_blank" className="text-[color:var(--be-blue)] hover:underline">
                  {tLegal('privacyLink')}
                </Link>
              </label>
            </div>

            {/* Botão */}
            <Button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="w-full"
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>

          <SocialLoginButtons next="/onboarding" />

          {/* Link para Login */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Já tem uma conta?{' '}
              <Link href="/login" className="text-[color:var(--be-blue)] hover:text-[color:var(--be-blue-hover)] font-medium">
                Entrar
              </Link>
            </p>
          </div>
        </div>

        {/* Versão */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Lodgra v2.0 - Multi-usuário
        </p>
      </div>
    </div>
  )
}
