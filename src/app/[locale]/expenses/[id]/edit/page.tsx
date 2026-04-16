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
import { Skeleton } from '@/components/ui/skeleton'

export default function EditExpensePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expense, setExpense] = useState<Record<string, string | number | null> | null>(null)
  const [expenseId, setExpenseId] = useState<string>('')
  const [properties, setProperties] = useState<{ id: string; name: string; currency: string }[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    async function loadData() {
      const { id } = await params
      setExpenseId(id)

      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single()

      if (expenseError || !expenseData) {
        setError('Despesa não encontrada')
        setLoadingData(false)
        return
      }

      setExpense(expenseData)
      setSelectedPropertyId(expenseData.property_id || '')
      setSelectedCategory(expenseData.category || '')

      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, name, currency')
        .eq('is_active', true)
        .order('name')

      setProperties(propertiesData || [])
      setLoadingData(false)
    }

    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const property = properties.find(p => p.id === selectedPropertyId)

    try {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          property_id: selectedPropertyId,
          description: formData.get('description') as string,
          amount: parseFloat(formData.get('amount') as string),
          currency: property?.currency || 'EUR',
          category: selectedCategory,
          expense_date: formData.get('expense_date') as string,
          notes: formData.get('notes') as string || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expenseId)

      if (updateError) throw updateError

      toast.success('Despesa atualizada com sucesso!')
      router.push(`/expenses/${expenseId}`)
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro ao atualizar despesa:', err)
      const message = err instanceof Error ? err.message : 'Erro ao atualizar despesa'
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
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <Skeleton className="h-7 w-36 mb-2" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="flex justify-end gap-4 pt-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-36" />
            </div>
          </div>
        </main>
      </AuthLayout>
    )
  }

  if (error && !expense) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/expenses" className="text-blue-600 hover:underline">
              Voltar para Despesas
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={expenseId ? `/expenses/${expenseId}` : '/expenses'}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Detalhes
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Despesa</h2>

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
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense_date" className="mb-1">
                  Data *
                </Label>
                <Input
                  type="date"
                  id="expense_date"
                  name="expense_date"
                  required
                  defaultValue={expense?.expense_date ?? undefined}
                />
              </div>

              <div>
                <Label htmlFor="category" className="mb-1">
                  Categoria *
                </Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
                defaultValue={expense?.description ?? undefined}
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
                defaultValue={expense?.amount ?? undefined}
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
                defaultValue={(expense?.notes as string) || ''}
                placeholder="Informações adicionais..."
              />
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Button asChild variant="outline">
                <Link href={expenseId ? `/expenses/${expenseId}` : '/expenses'}>
                  Cancelar
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </AuthLayout>
  )
}
