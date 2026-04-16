'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Copy, Check } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Property {
  id: string
  name: string
}

export default function NewUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<Property[]>([])

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('viewer')
  const [guestType, setGuestType] = useState<'staff' | 'owner'>('staff')
  const [accessAllProperties, setAccessAllProperties] = useState(false)
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])

  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [createdEmail, setCreatedEmail] = useState('')
  const [createdPassword, setCreatedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadProperties() {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setProperties(data.properties || [])
      }
    }
    loadProperties()
  }, [])

  function toggleProperty(propertyId: string) {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        email,
        full_name: fullName,
        // NÃO enviar password — deixar que o servidor gere a senha provisória
        role,
        access_all_properties: accessAllProperties && role !== 'guest',
        property_ids: accessAllProperties && role !== 'guest' ? [] : selectedProperties,
      }

      if (role === 'guest') {
        payload.guest_type = guestType
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar utilizador')
      }

      // Servidor envia a senha provisória na resposta
      setCreatedEmail(email)
      setCreatedPassword(data.provisionalPassword || 'Senha enviada por email')
      setShowPasswordDialog(true)
      toast.success('Utilizador criado com sucesso! Senha provisória enviada por email.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      toast.error(message)
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(createdPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erro ao copiar para clipboard')
    }
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
            <UserPlus className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Novo Utilizador</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <Label htmlFor="email" className="mb-1">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="utilizador@exemplo.com"
            />
          </div>

          <div>
            <Label htmlFor="fullName" className="mb-1">Nome Completo</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Nome do utilizador"
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

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <p className="font-medium mb-1">Senha Provisória:</p>
            <p className="text-xs">Uma senha provisória será gerada automaticamente e enviada por email ao utilizador. Na primeira vez que fizer login, será obrigado a alterá-la.</p>
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
              {loading ? 'Criando...' : 'Criar Utilizador'}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/users">
                Cancelar
              </Link>
            </Button>
          </div>
        </form>

        {/* Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Utilizador Criado com Sucesso</DialogTitle>
              <DialogDescription>
                Guarde a senha temporária abaixo. O utilizador pode alterá-la após fazer login.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Email</Label>
                <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-900">
                  {createdEmail}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Senha Temporária</Label>
                <div className="mt-1 flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-900 overflow-auto">
                    {createdPassword}
                  </code>
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  setShowPasswordDialog(false)
                  router.push('/admin/users')
                }}
                className="w-full"
              >
                Ir para a Lista de Utilizadores
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthLayout>
  )
}
