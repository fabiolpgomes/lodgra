'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { KeyRound, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres')
      return
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('A senha deve conter pelo menos uma letra maiúscula')
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('A senha deve conter pelo menos um número')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) throw error

      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Senha alterada com sucesso!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao alterar senha'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Senha alterada com sucesso!
        </div>
      )}

      <div>
        <Label htmlFor="newPassword" className="mb-1">Nova Senha</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          required
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-gray-500">
          Mínimo 8 caracteres, 1 letra maiúscula, 1 número
        </p>
      </div>

      <div>
        <Label htmlFor="confirmPassword" className="mb-1">Confirmar Nova Senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a nova senha"
          required
          autoComplete="new-password"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        <KeyRound className="h-4 w-4 mr-2" />
        {loading ? 'A alterar...' : 'Alterar Senha'}
      </Button>
    </form>
  )
}
