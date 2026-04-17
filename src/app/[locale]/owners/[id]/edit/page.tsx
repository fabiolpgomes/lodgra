'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/lib/i18n/routing'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Textarea } from '@/components/common/ui/textarea'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import { toast } from 'sonner'
import { Skeleton } from '@/components/common/ui/skeleton'

export default function EditOwnerPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [owner, setOwner] = useState<Record<string, string | number | null> | null>(null)
  const [ownerId, setOwnerId] = useState<string>('')
  const [country, setCountry] = useState('Portugal')
  const [users, setUsers] = useState<{ id: string; full_name: string | null; email: string }[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [preferredCurrency, setPreferredCurrency] = useState('EUR')

  useEffect(() => {
    async function loadData() {
      try {
        const { id } = await params
        setOwnerId(id)

        const [ownerResult, usersResult] = await Promise.all([
          supabase.from('owners').select('*').eq('id', id).single(),
          supabase.from('user_profiles').select('id, full_name, email').order('full_name'),
        ])

        if (ownerResult.error || !ownerResult.data) {
          setError('Proprietário não encontrado')
          setLoadingData(false)
          return
        }

        setOwner(ownerResult.data)
        setCountry(ownerResult.data.country || 'Portugal')
        setSelectedUserId(ownerResult.data.user_id || '')
        setPreferredCurrency(ownerResult.data.preferred_currency || 'EUR')
        setUsers(usersResult.data || [])
        setLoadingData(false)
      } catch (err: unknown) {
        console.error('Erro ao carregar proprietário:', err)
        setError('Erro ao carregar proprietário')
        setLoadingData(false)
      }
    }

    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string || '').trim()
    const phone = (formData.get('phone') as string || '').trim()

    // Validar: pelo menos email ou telefone deve estar preenchido
    if (!email && !phone) {
      setError('Deve preencher pelo menos o email ou o telefone')
      setLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase
        .from('owners')
        .update({
          user_id: selectedUserId || null,
          full_name: formData.get('full_name') as string,
          email: email || null,
          phone: phone || null,
          tax_id: formData.get('tax_id') as string || null,
          address: formData.get('address') as string || null,
          city: formData.get('city') as string || null,
          country: formData.get('country') as string,
          postal_code: formData.get('postal_code') as string || null,
          bank_name_pt: formData.get('bank_name_pt') as string || null,
          swift_code: formData.get('swift_code') as string || null,
          iban: formData.get('iban') as string || null,
          mbway_phone: formData.get('mbway_phone') as string || null,
          bank_name_br: formData.get('bank_name_br') as string || null,
          agency_number: formData.get('agency_number') as string || null,
          account_number: formData.get('account_number') as string || null,
          pix_key: formData.get('pix_key') as string || null,
          preferred_currency: preferredCurrency || 'EUR',
          notes: formData.get('notes') as string || null,
        })
        .eq('id', ownerId)

      if (updateError) throw updateError

      toast.success('Proprietário atualizado com sucesso!')
      router.push(`/owners/${ownerId}`)
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro ao atualizar proprietário:', err)
      const message = err instanceof Error ? err.message : 'Erro ao atualizar proprietário'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <AuthLayout>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-4 w-32 mb-6" />
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-64 mb-8" />
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-24 mb-4" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </main>
      </AuthLayout>
    )
  }

  if (error && !owner) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/owners" className="text-blue-600 hover:underline">
              Voltar para Proprietários
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  const showPT = country === 'Portugal'
  const showBR = country === 'Brasil'

  return (
    <AuthLayout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/owners/${ownerId}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Detalhes
        </Link>

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Editar Proprietário</h2>
          <p className="text-gray-600 mt-1">Atualize as informações do proprietário</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {/* Dados Pessoais */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Pessoais</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="mb-1">
                  Nome Completo *
                </Label>
                <Input
                  type="text"
                  id="full_name"
                  name="full_name"
                  required
                  defaultValue={(owner?.full_name as string) || ''}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="mb-1">
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    defaultValue={owner?.email as string || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="mb-1">
                    Telefone
                  </Label>
                  <Input
                    type="text"
                    id="phone"
                    name="phone"
                    defaultValue={owner?.phone as string || ''}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tax_id" className="mb-1">
                  NIF / CPF / CNPJ
                </Label>
                <Input
                  type="text"
                  id="tax_id"
                  name="tax_id"
                  defaultValue={owner?.tax_id as string || ''}
                />
              </div>

              <div>
                <Label htmlFor="user_id" className="mb-1">
                  Vincular a Utilizador do Sistema (opcional)
                </Label>
                <select
                  id="user_id"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-0"
                >
                  <option value="">Nenhum (pessoa externa)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address" className="mb-1">
                  Morada
                </Label>
                <Input
                  type="text"
                  id="address"
                  name="address"
                  defaultValue={owner?.address as string || ''}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="mb-1">
                    Cidade
                  </Label>
                  <Input
                    type="text"
                    id="city"
                    name="city"
                    defaultValue={owner?.city as string || ''}
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
                    defaultValue={owner?.postal_code as string || ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country" className="mb-1">
                    País
                  </Label>
                  <Input
                    type="text"
                    id="country"
                    name="country"
                    list="country-list"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Selecione ou digite o país"
                  />
                  <datalist id="country-list">
                    <option value="Portugal" />
                    <option value="Brasil" />
                    <option value="Espanha" />
                    <option value="França" />
                    <option value="Alemanha" />
                    <option value="Itália" />
                    <option value="Reino Unido" />
                    <option value="Estados Unidos" />
                    <option value="Canadá" />
                    <option value="Suíça" />
                    <option value="Holanda" />
                    <option value="Bélgica" />
                    <option value="Irlanda" />
                    <option value="Luxemburgo" />
                    <option value="Angola" />
                    <option value="Moçambique" />
                    <option value="Cabo Verde" />
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="preferred_currency" className="mb-1">
                    Moeda Preferencial
                  </Label>
                  <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
                    <SelectTrigger id="preferred_currency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="BRL">BRL - Real Brasileiro</SelectItem>
                      <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                      <SelectItem value="GBP">GBP - Libra Esterlina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Dados Bancários Portugal */}
          {showPT && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Bancários — Portugal</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bank_name_pt" className="mb-1">
                    Banco
                  </Label>
                  <Input
                    type="text"
                    id="bank_name_pt"
                    name="bank_name_pt"
                    defaultValue={owner?.bank_name_pt as string || ''}
                  />
                </div>
                <div>
                  <Label htmlFor="iban" className="mb-1">
                    IBAN
                  </Label>
                  <Input
                    type="text"
                    id="iban"
                    name="iban"
                    defaultValue={owner?.iban as string || ''}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="swift_code" className="mb-1">
                      SWIFT / BIC
                    </Label>
                    <Input
                      type="text"
                      id="swift_code"
                      name="swift_code"
                      defaultValue={owner?.swift_code as string || ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mbway_phone" className="mb-1">
                      MBway (Telefone)
                    </Label>
                    <Input
                      type="text"
                      id="mbway_phone"
                      name="mbway_phone"
                      defaultValue={owner?.mbway_phone as string || ''}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dados Bancários Brasil */}
          {showBR && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Bancários — Brasil</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bank_name_br" className="mb-1">
                    Banco
                  </Label>
                  <Input
                    type="text"
                    id="bank_name_br"
                    name="bank_name_br"
                    defaultValue={owner?.bank_name_br as string || ''}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="agency_number" className="mb-1">
                      Agência
                    </Label>
                    <Input
                      type="text"
                      id="agency_number"
                      name="agency_number"
                      defaultValue={owner?.agency_number as string || ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="account_number" className="mb-1">
                      Número da Conta
                    </Label>
                    <Input
                      type="text"
                      id="account_number"
                      name="account_number"
                      defaultValue={owner?.account_number as string || ''}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pix_key" className="mb-1">
                    Chave Pix
                  </Label>
                  <Input
                    type="text"
                    id="pix_key"
                    name="pix_key"
                    defaultValue={owner?.pix_key as string || ''}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Observações</h3>
            <div>
              <Label htmlFor="notes" className="mb-1">
                Notas (opcional)
              </Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={owner?.notes as string || ''}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {loading ? <>Salvando...</> : <><Save className="h-5 w-5" />Salvar Alterações</>}
            </Button>
            <Button asChild variant="outline">
              <Link href={`/owners/${ownerId}`}>
                Cancelar
              </Link>
            </Button>
          </div>
        </form>
      </main>
    </AuthLayout>
  )
}
