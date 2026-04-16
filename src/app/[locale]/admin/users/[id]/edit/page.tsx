'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from '@/lib/i18n/routing'
import Link from 'next/link'
import { ArrowLeft, UserCog } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

interface Property {
  id: string
  name: string
}

interface UserData {
  id: string
  email: string
  full_name: string | null
  role: string
  access_all_properties: boolean
  guest_type?: string | null
  assigned_properties: Property[]
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [userData, setUserData] = useState<UserData | null>(null)

  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('viewer')
  const [guestType, setGuestType] = useState<'staff' | 'owner'>('staff')
  const [accessAllProperties, setAccessAllProperties] = useState(false)
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const data = await res.json()
          setProperties(data.properties || [])

          const user = data.users?.find((u: UserData) => u.id === id)
          if (user) {
            setUserData(user)
            setFullName(user.full_name || '')
            setRole(user.role)
            if (user.guest_type) {
              setGuestType(user.guest_type as 'staff' | 'owner')
            }
            setAccessAllProperties(user.access_all_properties || false)
            setSelectedProperties(user.assigned_properties?.map((p: Property) => p.id) || [])
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [id])

  function toggleProperty(propertyId: string) {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(pid => pid !== propertyId)
        : [...prev, propertyId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (newPassword) {
        if (newPassword.length < 8) { setError('A senha deve ter no mínimo 8 caracteres'); setLoading(false); return }
        if (!/[A-Z]/.test(newPassword)) { setError('A senha deve conter pelo menos uma letra maiúscula'); setLoading(false); return }
        if (!/[0-9]/.test(newPassword)) { setError('A senha deve conter pelo menos um número'); setLoading(false); return }
        if (newPassword !== confirmPassword) { setError('As senhas não coincidem'); setLoading(false); return }
      }

      const payload: Record<string, unknown> = {
        full_name: fullName,
        role,
        access_all_properties: accessAllProperties && role !== 'guest',
        property_ids: accessAllProperties && role !== 'guest' ? [] : selectedProperties,
        ...(newPassword ? { password: newPassword } : {}),
      }

      if (role === 'guest') {
        payload.guest_type = guestType
      }

      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar utilizador')
      }

      toast.success('Utilizador atualizado com sucesso!')
      router.push('/admin/users')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      toast.error(message)
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <AuthLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-48" />
            <div className="space-y-2 border border-gray-200 rounded-lg p-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  if (!userData) {
    return (
      <AuthLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-600">Utilizador não encontrado</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Utilizadores
          </Link>
          <div className="flex items-center gap-3">
            <UserCog className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Editar Utilizador</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <Label htmlFor="email" className="mb-1">Email</Label>
            <Input
              id="email"
              type="email"
              value={userData.email}
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">O email não pode ser alterado</p>
          </div>

          <div>
            <Label htmlFor="fullName" className="mb-1">Nome Completo</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="role" className="mb-1">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
                <SelectItem value="guest">Convidado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === 'guest' && (
            <div>
              <Label htmlFor="guestType" className="mb-1">Tipo de Convidado</Label>
              <Select value={guestType} onValueChange={(value) => setGuestType(value as 'staff' | 'owner')}>
                <SelectTrigger id="guestType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Portaria / Limpeza / Serviços</SelectItem>
                  <SelectItem value="owner">Proprietário do Imóvel</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {guestType === 'staff'
                  ? 'Acesso restrito ao calendário e check-in/check-out'
                  : 'Acesso aos relatórios e reservas das suas propriedades'}
              </p>
            </div>
          )}

          {/* Nova Senha (opcional) */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <p className="text-sm font-medium text-gray-700">Redefinir Senha <span className="text-xs text-gray-400 font-normal">(opcional — deixe em branco para não alterar)</span></p>
            <div>
              <Label htmlFor="newPassword" className="mb-1">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-500">Mínimo 8 caracteres, 1 letra maiúscula, 1 número</p>
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="mb-1">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
            </div>
          </div>

          {role !== 'guest' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="accessAllProperties"
                checked={accessAllProperties}
                onChange={(e) => setAccessAllProperties(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="accessAllProperties" className="text-sm font-medium text-gray-700">
                Acesso a todas as propriedades
              </label>
            </div>
          )}

          {!accessAllProperties && (
            <div>
              <Label className="mb-2">Propriedades</Label>
              {properties.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma propriedade disponível</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {properties.map((property) => (
                    <label key={property.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProperties.includes(property.id)}
                        onChange={() => toggleProperty(property.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{property.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/users">
                Cancelar
              </Link>
            </Button>
          </div>
        </form>
      </div>
    </AuthLayout>
  )
}
