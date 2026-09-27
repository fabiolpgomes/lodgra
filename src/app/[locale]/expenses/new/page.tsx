'use client'

import { useState, useEffect } from 'react'
import { useRouter, useLocale } from '@/lib/i18n/routing'
import Link from 'next/link'
import { ArrowLeft, Save, FileText, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Textarea } from '@/components/common/ui/textarea'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/utils/expense-categories'
import { toast } from 'sonner'
import { FileUpload } from '@/components/common/ui/FileUpload'

export default function NewExpensePage() {
  const router = useRouter()
  const locale = useLocale()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<{ id: string; name: string; currency: string }[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [category, setCategory] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

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
      if (!property?.currency) {
        setError('Moeda da propriedade não encontrada')
        setLoading(false)
        return
      }

      const { data: created, error: insertError } = await supabase
        .from('expenses')
        .insert({
          property_id: propertyId,
          description: formData.get('description') as string,
          amount: parseFloat(formData.get('amount') as string),
          currency: property.currency,
          category,
          expense_date: formData.get('expense_date') as string,
          notes: formData.get('notes') as string || null,
          organization_id: profile.organization_id,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // Anexa os comprovantes selecionados (mesma API da tela de detalhe)
      const failed: string[] = []
      for (const file of pendingFiles) {
        const body = new FormData()
        body.append('file', file)
        const res = await fetch(`/api/expenses/${created.id}/documents`, { method: 'POST', body })
        if (!res.ok) failed.push(file.name)
      }

      if (failed.length > 0) {
        toast.warning(`Despesa criada, mas não foi possível anexar: ${failed.join(', ')}. Tente de novo na tela da despesa.`)
      } else {
        toast.success('Despesa criada com sucesso!')
      }
      router.push(`/${locale}/expenses/${created.id}`)
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
          href={`/${locale}/expenses`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Despesas
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Nova Despesa</h2>
            <p className="mt-1 text-sm text-gray-600">
              Registre uma nova despesa associada a uma propriedade.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline">
              <Link href={`/${locale}/expenses`}>
                Ver Lista
              </Link>
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
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
                  Data * <span className="text-xs text-gray-600">(dd/mm/aaaa)</span>
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
                    {CATEGORY_ORDER.map(value => (
                      <SelectItem key={value} value={value}>{CATEGORY_LABELS[value]}</SelectItem>
                    ))}
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
              <p className="text-xs text-gray-600 mt-1">
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

            {/* Comprovantes */}
            <div>
              <Label className="mb-1">Comprovantes (opcional)</Label>
              <FileUpload
                currentCount={pendingFiles.length}
                disabled={loading}
                onUpload={async (files) => setPendingFiles((prev) => [...prev, ...files])}
              />
              {pendingFiles.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {pendingFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remover ${file.name}`}
                        onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Button asChild variant="outline">
                <Link href={`/${locale}/expenses`}>
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
