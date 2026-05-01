'use client'

import { useState, useEffect } from 'react'
import { useRouter, useLocale } from '@/lib/i18n/routing'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'
import { toast } from 'sonner'
import { Logo } from '@/components/common/ui/Logo'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const router = useRouter()
  const locale = useLocale()
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
      // Redirecionar para dashboard
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer login'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-600">Controle total dos seus imóveis em um só lugar. Brasil e Portugal</p>
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

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('labels.email')}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="pl-10"
                  placeholder={t('placeholders.enterEmail')}
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('labels.password')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  required
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Esqueci minha senha */}
            <div className="text-right">
              <Link href="/auth/reset-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
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
              <Link href={locale ? `/${locale}/register` : '/register'} className="text-blue-600 hover:text-blue-700 font-medium">
                {tCommon('ok')}
              </Link>
            </p>
          </div>
        </div>

        {/* Versão */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Lodgra v2.0 - Multi-usuário
        </p>
      </div>
    </div>
  )
}
