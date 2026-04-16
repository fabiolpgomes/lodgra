'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Building2, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

export default function ResetPasswordConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  // Process recovery code on mount
  useEffect(() => {
    async function processRecoveryCode() {
      if (!code) {
        setSessionReady(true)
        return
      }

      try {
        const supabase = createClient()
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError(`Código inválido: ${exchangeError.message}`)
          setSessionReady(true)
          return
        }

        // Verify that session was actually created
        const { data: { user }, error: getUserError } = await supabase.auth.getUser()
        if (getUserError || !user) {
          setError('Sessão expirada. Por favor, solicite um novo link de reset.')
          setSessionReady(true)
          return
        }

        setSessionReady(true)
      } catch (err) {
        console.error('Error processing recovery code:', err)
        setError('Erro ao processar código de recovery. Por favor, tente novamente.')
        setSessionReady(true)
      }
    }

    processRecoveryCode()
  }, [code])

  // Validação em tempo real
  const passwordStrength = {
    hasLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    match: password === confirmPassword && password.length > 0,
  }

  const isValid =
    passwordStrength.hasLength &&
    passwordStrength.hasUppercase &&
    passwordStrength.hasNumber &&
    passwordStrength.match

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValid) {
      setError('Password não cumpre os requisitos')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Verify session still exists before updating
      const { data: { user }, error: sessionError } = await supabase.auth.getUser()
      if (sessionError || !user) {
        throw new Error('Sessão expirada. Por favor, solicite um novo link de reset.')
      }

      // Atualizar password usando a sessão existente (do link de reset)
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) throw updateError

      toast.success('Password alterada com sucesso!')

      // Redirecionar para login
      router.push('/login?success=password_reset')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao resetar password'
      console.error('Password reset error:', err)
      setError(message)
      toast.error(message)
      setLoading(false)
    }
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Building2 className="h-12 w-12 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Home Stay</h1>
            </div>
            <p className="text-gray-600">Processando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-12 w-12 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Home Stay</h1>
          </div>
          <p className="text-gray-600">Nova Password</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Reset sua Password
          </h2>

          <p className="text-sm text-gray-600 text-center mb-6">
            Escolha uma password segura e forte.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleConfirm} className="space-y-6">
            {/* Nova Password */}
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Nova Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      passwordStrength.hasLength ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      passwordStrength.hasLength ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    Mínimo 8 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      passwordStrength.hasUppercase ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      passwordStrength.hasUppercase ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    Incluir 1 letra maiúscula (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      passwordStrength.hasNumber ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      passwordStrength.hasNumber ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    Incluir 1 número (0-9)
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmar Password */}
            <div>
              <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {confirmPassword && !passwordStrength.match && (
                <p className="mt-1 text-xs text-red-600">Passwords não correspondem</p>
              )}
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processando...' : 'Alterar Password'}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Esta password será utilizada para fazer login. Guarde num local seguro.
              </p>
            </div>
          </div>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Voltar ao Login
            </Link>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Home Stay v1.1 - Seguro
        </p>
      </div>
    </div>
  )
}
