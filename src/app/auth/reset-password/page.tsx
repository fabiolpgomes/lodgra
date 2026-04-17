'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { toast } from 'sonner'
import { Logo } from '@/components/common/ui/Logo'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email.trim()) {
      setError('Introduza um email válido')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)

      if (resetError) throw resetError

      setSent(true)
      toast.success('Link de reset enviado!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar link'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Logo size="lg" />
            </div>
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Link enviado!
            </h2>

            <p className="text-gray-600 mb-6">
              Enviámos um link de reset para <strong>{email}</strong>
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left space-y-2">
              <p className="text-sm font-medium text-gray-900">💡 Próximas etapas:</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Verifique o seu email</li>
                <li>Clique no link de reset</li>
                <li>Escolha uma nova password</li>
                <li>Faça login com a nova password</li>
              </ol>
            </div>

            <p className="text-xs text-gray-500 mb-6">
              ⏰ O link expira em 24 horas
            </p>

            <Link
              href="/login"
              className="inline-block w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar ao Login
            </Link>
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
          <div className="flex items-center justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-600">Reset de Password</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Esqueceu sua password?
          </h2>

          <p className="text-sm text-gray-600 text-center mb-6">
            Introduza o seu email e enviaremos um link para resetar.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar Link de Reset'}
            </button>
          </form>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Login
            </Link>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Lodgra v1.1 - Seguro
        </p>
      </div>
    </div>
  )
}
