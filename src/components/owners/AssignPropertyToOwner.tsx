'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function AssignPropertyToOwner({ ownerId }: { ownerId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [showSelect, setShowSelect] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableProperties, setAvailableProperties] = useState<{ id: string; name: string; city: string | null; owner_id: string | null }[]>([])

  useEffect(() => {
    if (!showSelect) return

    async function loadProperties() {
      // Buscar propriedades sem owner ou de outro owner
      const { data } = await supabase
        .from('properties')
        .select('id, name, city, owner_id')
        .eq('is_active', true)
        .order('name')

      // Mostrar apenas propriedades sem proprietário
      setAvailableProperties(
        (data || []).filter((p) => !p.owner_id)
      )
    }

    loadProperties()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSelect])

  async function handleAssign(propertyId: string) {
    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('properties')
        .update({ owner_id: ownerId })
        .eq('id', propertyId)

      if (updateError) throw updateError

      toast.success('Propriedade associada com sucesso!')
      setShowSelect(false)
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro ao associar propriedade:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao associar propriedade'
      setError(msg)
      toast.error(msg || 'Erro ao processar')
    } finally {
      setLoading(false)
    }
  }

  if (showSelect) {
    return (
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Associar propriedade</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSelect(false)}
            className="h-6 w-6"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <p className="text-xs text-red-600 mb-2">{error}</p>
        )}

        {availableProperties.length === 0 ? (
          <p className="text-xs text-gray-500">Todas as propriedades já têm proprietário atribuído.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {availableProperties.map((prop) => (
              <Button
                key={prop.id}
                variant="ghost"
                onClick={() => handleAssign(prop.id)}
                disabled={loading}
                className="w-full justify-start text-sm h-auto p-2"
              >
                <span className="font-medium text-gray-900">{prop.name}</span>
                {prop.city && (
                  <span className="text-xs text-gray-500 ml-1">({prop.city})</span>
                )}
              </Button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      onClick={() => setShowSelect(true)}
      className="mt-3 w-full flex items-center justify-center gap-2 border-dashed"
    >
      <Plus className="h-4 w-4" />
      Associar Propriedade
    </Button>
  )
}
