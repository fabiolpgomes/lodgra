'use client'

import { useState } from 'react'
import { useLocale, useSearchParams } from '@/lib/i18n/routing'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'
import { toast } from 'sonner'
import { Logo } from '@/components/common/ui/Logo'
import { useTranslations } from '@/lib/i18n/useTranslations'

const LOCALE_PREFIX_RE = /^\/(pt-BR|en-US|es)(\/|$)/

function getSafeRedirect(redirectTo: string | null, locale: string): string {
  if (
    redirectTo?.startsWith('/') &&
    !redirectTo.includes('landing-vp') &&
    !redirectTo.startsWith('/login') &&
    !redirectTo.startsWith(`/${locale}/login`) &&
    redirectTo !== '/' &&
    redirectTo !== `/${locale}`
  ) {
    return LOCALE_PREFIX_RE.test(redirectTo) ? redirectTo : `/${locale}${redirectTo}`
  }

  return `/${locale}/dashboard`
}

export default function LoginPage() {
  const locale = useLocale()
  const searchParams = useSearchParams()
  const t = useTranslations('forms')
  const tCommon = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Login efetuado com sucesso!')
      const redirectTo = searchParams.get('redirectTo') || searchParams.get('next')
      const safeRedirect = getSafeRedirect(redirectTo, locale || 'pt-BR')

      window.location.assign(safeRedirect)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-600">{tCommon('tagline')}</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {tCommon('login')}
          </h2>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <Input
                type="email"
                id="email"
                name="email"
                required
                className="py-3 h-14"
                placeholder={t('placeholders.enterEmail')}
              />
            </div>

            {/* Senha */}
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                required
                className="pr-12 py-3 h-14"
                placeholder={t('placeholders.enterPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors z-10"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Esqueci minha senha */}
            <div className="text-right">
              <Link href="/auth/reset-password" className="text-sm text-brand-600 hover:text-blue-700 font-medium">
                Esqueci minha senha
              </Link>
            </div>

            {/* Botão */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? tCommon('loading') : tCommon('login')}
            </Button>
          </form>

          <SocialLoginButtons next={locale ? `/${locale}/dashboard` : '/dashboard'} />

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Não tem uma conta?{' '}
              <Link href={locale ? `/${locale}/register` : '/register'} className="text-brand-600 hover:text-blue-700 font-medium">
                {tCommon('ok')}
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
