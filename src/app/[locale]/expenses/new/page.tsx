'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/lib/i18n/routing'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function NewExpensePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<{ id: string; name: string; currency: string }[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function loadProperties() {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, currency')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Erro ao carregar propriedades:', error)
        return
      }

      setProperties(data || [])
    }

    loadProperties()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const property = properties.find(p => p.id === propertyId)

    try {
      // Obter organization_id do usuário
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
        .single()

      if (!profile?.organization_id) {
        setError('Organização não encontrada')
        setLoading(false)
        return
      }

      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          property_id: propertyId,
          description: formData.get('description') as string,
          amount: parseFloat(formData.get('amount') as string),
          currency: property?.currency || 'EUR',
          category,
          expense_date: formData.get('expense_date') as string,
          notes: formData.get('notes') as string || null,
          organization_id: profile.organization_id,
        })

      if (insertError) throw insertError

      toast.success('Despesa criada com sucesso!')
      router.push('/expenses')
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro ao criar despesa:', err)
      const message = err instanceof Error ? err.message : 'Erro ao criar despesa'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Despesas
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Nova Despesa</h2>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Propriedade */}
            <div>
              <Label htmlFor="property_id" className="mb-1">
                Propriedade *
              </Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger id="property_id" className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data e Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense_date" className="mb-1">
                  Data *
                </Label>
                <Input
                  type="date"
                  id="expense_date"
                  name="expense_date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="category" className="mb-1">
                  Categoria *
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">Limpeza</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="utilities">Utilidades (água, luz, gás)</SelectItem>
                    <SelectItem value="taxes">Impostos</SelectItem>
                    <SelectItem value="insurance">Seguros</SelectItem>
                    <SelectItem value="supplies">Suprimentos</SelectItem>
                    <SelectItem value="repairs">Reparos</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="management">Gestão</SelectItem>
                    <SelectItem value="mortgage">Hipoteca</SelectItem>
                    <SelectItem value="other">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="description" className="mb-1">
                Descrição *
              </Label>
              <Input
                type="text"
                id="description"
                name="description"
                required
                placeholder="Ex: Limpeza após check-out"
              />
            </div>

            {/* Valor */}
            <div>
              <Label htmlFor="amount" className="mb-1">
                Valor *
              </Label>
              <Input
                type="number"
                id="amount"
                name="amount"
                required
                step="0.01"
                min="0"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                A moeda será a mesma da propriedade selecionada
              </p>
            </div>

            {/* Notas */}
            <div>
              <Label htmlFor="notes" className="mb-1">
                Notas (opcional)
              </Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Informações adicionais..."
              />
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Button asChild variant="outline">
                <Link href="/expenses">
                  Cancelar
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Salvando...' : 'Salvar Despesa'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </AuthLayout>
  )
}
