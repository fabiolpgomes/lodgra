'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/lib/i18n/routing'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createProperty } from './actions'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import type { UserProfile } from '@/lib/auth/getUserAccess'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import { toast } from 'sonner'

export default function NewPropertyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [owners, setOwners] = useState<{ id: string; full_name: string | null }[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    async function loadData() {
      // Get user's organization and profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, role, avatar_url, access_all_properties, organization_id')
          .eq('id', user.id)
          .single()

        if (userProfile) {
          setProfile({
            id: userProfile.id,
            email: user.email || '',
            full_name: userProfile.full_name,
            role: userProfile.role as 'admin' | 'gestor' | 'viewer',
            avatar_url: userProfile.avatar_url,
            access_all_properties: userProfile.access_all_properties,
          })
        }
      }

      // Load owners
      const { data } = await supabase
        .from('owners')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name')
      setOwners(data || [])
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await createProperty({
        name: formData.get('name') as string,
        owner_id: ownerId || null,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        country: formData.get('country') as string,
        postal_code: formData.get('postal_code') as string,
        property_type: propertyType,
        bedrooms: parseInt(formData.get('bedrooms') as string) || 0,
        bathrooms: parseInt(formData.get('bathrooms') as string) || 0,
        max_guests: parseInt(formData.get('max_guests') as string) || 0,
        currency: currency || 'EUR',
        management_percentage: parseFloat(formData.get('management_percentage') as string) || 0,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      toast.success('Propriedade criada com sucesso!')
      router.push('/properties')
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro ao criar propriedade:', err)
      const message = err instanceof Error ? err.message : 'Erro ao criar propriedade'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout profile={profile || undefined}>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Propriedades
        </Link>

        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Nova Propriedade</h2>
          <p className="text-gray-600 mt-1">
            Adicione as informações da sua propriedade
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {/* Informações Básicas */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informações Básicas
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="mb-1">
                  Nome da Propriedade *
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="Ex: Apartamento T2 Centro"
                />
              </div>

              <div>
                <Label htmlFor="owner_id" className="mb-1">
                  Proprietário
                </Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sem proprietário" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="property_type" className="mb-1">
                  Tipo de Propriedade *
                </Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartamento</SelectItem>
                    <SelectItem value="house">Casa</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="studio">Estúdio</SelectItem>
                    <SelectItem value="room">Quarto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Localização */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Localização
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address" className="mb-1">
                  Endereço *
                </Label>
                <Input
                  type="text"
                  id="address"
                  name="address"
                  required
                  placeholder="Rua, número, andar"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="mb-1">
                    Cidade *
                  </Label>
                  <Input
                    type="text"
                    id="city"
                    name="city"
                    required
                    placeholder="Ex: Lisboa"
                  />
                </div>

                <div>
                  <Label htmlFor="postal_code" className="mb-1">
                    Código Postal
                  </Label>
                  <Input
                    type="text"
                    id="postal_code"
                    name="postal_code"
                    placeholder="1000-001"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country" className="mb-1">
                  País *
                </Label>
                <Input
                  type="text"
                  id="country"
                  name="country"
                  required
                  placeholder="Ex: Portugal"
                />
              </div>

              <div>
                <Label htmlFor="currency" className="mb-1">
                  Moeda *
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a moeda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                    <SelectItem value="BRL">R$ Real Brasileiro (BRL)</SelectItem>
                    <SelectItem value="USD">$ Dólar Americano (USD)</SelectItem>
                    <SelectItem value="GBP">£ Libra Esterlina (GBP)</SelectItem>
                    <SelectItem value="CHF">CHF Franco Suíço (CHF)</SelectItem>
                    <SelectItem value="JPY">¥ Iene Japonês (JPY)</SelectItem>
                    <SelectItem value="CAD">C$ Dólar Canadense (CAD)</SelectItem>
                    <SelectItem value="AUD">A$ Dólar Australiano (AUD)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Moeda usada para preços e receitas desta propriedade
                </p>
              </div>
            </div>
          </div>

          {/* Capacidade */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Capacidade
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bedrooms" className="mb-1">
                  Quartos
                </Label>
                <Input
                  type="number"
                  id="bedrooms"
                  name="bedrooms"
                  min="0"
                  defaultValue="1"
                />
              </div>

              <div>
                <Label htmlFor="bathrooms" className="mb-1">
                  Casas de Banho
                </Label>
                <Input
                  type="number"
                  id="bathrooms"
                  name="bathrooms"
                  min="0"
                  defaultValue="1"
                />
              </div>

              <div>
                <Label htmlFor="max_guests" className="mb-1">
                  Máx. Hóspedes
                </Label>
                <Input
                  type="number"
                  id="max_guests"
                  name="max_guests"
                  min="1"
                  defaultValue="2"
                />
              </div>
            </div>
          </div>

          {/* Gestão */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Gestão
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="management_percentage" className="mb-1">
                  Percentual Gestão do Imóvel (%)
                </Label>
                <Input
                  type="number"
                  id="management_percentage"
                  name="management_percentage"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue="0"
                  placeholder="Ex: 10.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentual aplicado aos valores de receita para gestão
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Salvar Propriedade
                </>
              )}
            </Button>
            <Button asChild variant="outline">
              <Link href="/properties">
                Cancelar
              </Link>
            </Button>
          </div>
        </form>
      </main>
    </AuthLayout>
  )
}
