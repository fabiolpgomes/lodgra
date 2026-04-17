'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { toast } from 'sonner'

export default function ChangePasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate
    if (!newPassword || !confirmPassword) {
      setError('Todos os campos são obrigatórios')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As novas senhas não coincidem')
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres')
      setLoading(false)
      return
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('A senha deve conter pelo menos uma letra maiúscula')
      setLoading(false)
      return
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('A senha deve conter pelo menos um número')
      setLoading(false)
      return
    }

    try {
      // Update password via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      // Clear password_reset_required flag
      const user = await supabase.auth.getUser()
      if (user.data.user?.id) {
        await supabase
          .from('user_profiles')
          .update({ password_reset_required: false })
          .eq('id', user.data.user.id)
      }

      setSuccess(true)
      toast.success('Senha alterada com sucesso!')

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch (err) {
      console.error('Erro ao alterar senha:', err)
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Senha Alterada com Sucesso!</h2>
          <p className="text-gray-600 mb-4">Você será redirecionado para o dashboard em breve...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Alterar Senha</h1>
          <p className="text-gray-600 mt-2">Crie uma nova senha para acessar sua conta</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label htmlFor="newPassword" className="mb-1">
              Nova Senha
            </Label>
            <Input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              A senha deve conter letra maiúscula e número
            </p>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="mb-1">
              Confirmar Nova Senha
            </Label>
            <Input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua nova senha"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Após alterar sua senha, você será redirecionado para o dashboard.
        </p>
      </div>
    </div>
  )
}
