'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'

export function ChangePasswordSection() {
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
    setSuccess(false)

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

      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Senha alterada com sucesso!')

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Erro ao alterar senha:', err)
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
          <LockKeyhole className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Alterar Senha</h2>
          <p className="text-sm text-gray-600">Crie uma nova senha para proteger sua conta</p>
        </div>
      </div>

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            ✓ Senha alterada com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleChangePassword} className="space-y-4">
        <div>
          <Label htmlFor="newPassword" className="mb-2">
            Nova Senha
          </Label>
          <Input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            disabled={loading}
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-500 mt-2">
            Requisitos: Mínimo 8 caracteres, letra maiúscula e número
          </p>
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="mb-2">
            Confirmar Nova Senha
          </Label>
          <Input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirme sua nova senha"
            disabled={loading}
            className="bg-gray-50"
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
    </section>
  )
}
