'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError('Token não fornecido. Link inválido ou expirado.')
        setValidating(false)
        return
      }

      try {
        const response = await fetch('/api/auth/validate-password-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        if (!response.ok) {
          const data = await response.json()
          setError(data.error || 'Token inválido ou expirado.')
          setValidating(false)
          return
        }

        setTokenValid(true)
        setValidating(false)
      } catch (err) {
        console.error('Erro ao validar token:', err)
        setError('Erro ao validar token. Tente novamente.')
        setValidating(false)
      }
    }
    validateToken()
  }, [token])

  async function handleSetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validations
    if (!password || !confirmPassword) {
      setError('Todos os campos são obrigatórios')
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

    if (!/[A-Z]/.test(password)) {
      setError('A senha deve conter pelo menos uma letra maiúscula')
      setLoading(false)
      return
    }

    if (!/[0-9]/.test(password)) {
      setError('A senha deve conter pelo menos um número')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Erro ao criar senha. Tente novamente.')
        setLoading(false)
        return
      }

      setSuccess(true)
      toast.success('Senha criada com sucesso!')

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      console.error('Erro ao criar senha:', err)
      setError('Erro ao criar senha. Tente novamente.')
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Validando link...</p>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">Link Inválido</h1>
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <p className="text-gray-600 text-center mb-4">
            Solicite um novo link de criação de senha ou entre em contato com o administrador.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Voltar ao Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock className="h-12 w-12 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Lodgra</h1>
          </div>
          <p className="text-gray-600">Crie sua senha</p>
        </div>

        {/* Card de Criação de Senha */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          {success ? (
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sucesso!</h2>
              <p className="text-gray-600 mb-6">
                Sua senha foi criada com sucesso. Você será redirecionado para o login em instantes.
              </p>
              <Button onClick={() => router.push('/login')} className="w-full">
                Ir para Login
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Criar Senha</h2>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSetPassword} className="space-y-6">
                {/* Nova Senha */}
                <div>
                  <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </Label>
                  <Input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Mínimo 8 caracteres, com letra maiúscula e número
                  </p>
                </div>

                {/* Confirmar Senha */}
                <div>
                  <Label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Confirmar Senha
                  </Label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full"
                  />
                </div>

                {/* Botão */}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Criando senha...' : 'Criar Senha'}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-600 mt-6">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Faça login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
