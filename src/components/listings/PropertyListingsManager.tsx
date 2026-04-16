'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Power, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Listing {
  id: string
  property_id: string
  platform_id: string | null
  external_listing_id: string | null
  ical_url: string | null
  is_active: boolean
  sync_enabled: boolean
  last_synced_at: string | null
  created_at: string
  platforms?: {
    id: string
    name: string
    display_name: string
  }
}

export function PropertyListingsManager({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [listings, setListings] = useState<Listing[]>([])
  const [platforms, setPlatforms] = useState<{ id: string; name: string; display_name: string; is_active: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingListing, setEditingListing] = useState<Listing | null>(null)

  async function loadData() {
    setLoading(true)

    // Carregar anúncios
    const { data: listingsData } = await supabase
      .from('property_listings')
      .select(`
        *,
        platforms(
          id,
          name,
          display_name
        )
      `)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    setListings(listingsData || [])

    // Carregar plataformas
    const { data: platformsData } = await supabase
      .from('platforms')
      .select('*')
      .eq('is_active', true)
      .order('display_name')

    setPlatforms(platformsData || [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [propertyId])

  async function toggleActive(listingId: string, currentState: boolean) {
    const { error } = await supabase
      .from('property_listings')
      .update({ is_active: !currentState })
      .eq('id', listingId)

    if (!error) {
      toast.success('Anúncio atualizado!')
      loadData()
      router.refresh()
    } else {
      toast.error(error.message || 'Erro ao processar')
    }
  }

  async function deleteListing(listingId: string) {
    if (!confirm('Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita.')) {
      return
    }

    const { error } = await supabase
      .from('property_listings')
      .delete()
      .eq('id', listingId)

    if (!error) {
      toast.success('Anúncio eliminado com sucesso!')
      loadData()
      router.refresh()
    } else {
      toast.error(error.message || 'Erro ao processar')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Contar anúncios ativos
  const activeListings = listings.filter(l => l.is_active).length
  const inactiveListings = listings.filter(l => !l.is_active).length

  // Mapa de emojis por plataforma
  const platformEmojis: { [key: string]: string } = {
    'booking': '🔵',
    'airbnb': '🔴',
    'expedia': '✈️',
    'vrbo': '🏠',
  }

  const getPlatformEmoji = (platformName?: string) => {
    if (!platformName) return '📋'
    const key = platformName.toLowerCase().split('.')[0]
    return platformEmojis[key] || '📋'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Anúncios {listings.length > 0 && <span className="text-gray-500 font-normal text-base">({listings.length} total)</span>}
          </h3>
          {listings.length > 0 && (
            <div className="flex gap-4 mt-2">
              <span className="text-sm text-gray-600">
                <span className="font-medium text-green-700">{activeListings} ativo{activeListings !== 1 ? 's' : ''}</span>
              </span>
              {inactiveListings > 0 && (
                <span className="text-sm text-gray-600">
                  <span className="font-medium text-gray-500">{inactiveListings} inativo{inactiveListings !== 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
          )}
          <p className="text-sm text-gray-600 mt-2">
            Gerencie os anúncios desta propriedade em diferentes plataformas
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Novo Anúncio
        </Button>
      </div>

      {/* Lista de Anúncios */}
      {listings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum anúncio cadastrado
          </h4>
          <p className="text-gray-600 mb-4">
            Crie o primeiro anúncio para conectar esta propriedade a plataformas externas
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Criar Primeiro Anúncio
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-400 transition-colors"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-gray-50 to-white p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getPlatformEmoji(listing.platforms?.display_name)}</span>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {listing.platforms?.display_name || 'Manual'}
                    </p>
                    {listing.external_listing_id && (
                      <p className="text-xs text-gray-500 font-mono">ID: {listing.external_listing_id}</p>
                    )}
                  </div>
                </div>
                <div>
                  {listing.is_active ? (
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      ✓ Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50">
                      ○ Inativo
                    </Badge>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {listing.ical_url && (
                  <div className="bg-blue-50 rounded p-3 border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium mb-1">iCal URL:</p>
                    <p className="text-xs text-blue-700 font-mono break-all">{listing.ical_url}</p>
                  </div>
                )}

                {listing.last_synced_at && (
                  <div className="text-xs text-gray-500">
                    Última sincronização: <span className="font-medium">{new Date(listing.last_synced_at).toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>

              {/* Card Footer - Actions */}
              <div className="bg-gray-50 border-t border-gray-200 p-3 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(listing.id, listing.is_active)}
                  className={listing.is_active
                    ? 'text-green-700 border-green-300 hover:bg-green-50'
                    : 'text-gray-600 border-gray-300 hover:bg-gray-100'
                  }
                  title={listing.is_active ? 'Desativar' : 'Ativar'}
                >
                  <Power className="h-4 w-4 mr-1" />
                  {listing.is_active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingListing(listing)}
                  className="text-blue-700 border-blue-300 hover:bg-blue-50"
                  title="Editar"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteListing(listing.id)}
                  className="text-red-700 border-red-300 hover:bg-red-50"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Deletar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criar/Editar */}
      {(showCreateModal || editingListing) && (
        <ListingModal
          propertyId={propertyId}
          platforms={platforms}
          listing={editingListing}
          onClose={() => {
            setShowCreateModal(false)
            setEditingListing(null)
          }}
          onSuccess={() => {
            loadData()
            setShowCreateModal(false)
            setEditingListing(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function ListingModal({
  propertyId,
  platforms,
  listing,
  onClose,
  onSuccess,
}: {
  propertyId: string
  platforms: { id: string; name: string; display_name: string; is_active: boolean }[]
  listing: Listing | null
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const platformId = formData.get('platform_id') as string

    const externalId = (formData.get('external_listing_id') as string || '').trim()

    try {
      // Obter organization_id do usuário (apenas para inserts)
      let organizationId = null
      if (!listing) {
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
        organizationId = profile.organization_id
      }

      const data = {
        property_id: propertyId,
        platform_id: platformId && platformId.trim() !== '' ? platformId : null,
        external_listing_id: externalId || null,
        ical_url: (formData.get('ical_url') as string || '').trim() || null,
        sync_enabled: formData.get('sync_enabled') === 'on',
        is_active: true,
        ...(organizationId && { organization_id: organizationId }),
      }

      if (listing) {
        // Editar
        const { error: updateError } = await supabase
          .from('property_listings')
          .update(data)
          .eq('id', listing.id)

        if (updateError) throw updateError
      } else {
        // Criar
        const { error: insertError } = await supabase
          .from('property_listings')
          .insert(data)

        if (insertError) throw insertError
      }

      toast.success('Anúncio adicionado com sucesso!')
      onSuccess()
    } catch (err: unknown) {
      console.error('Erro ao salvar anúncio:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao salvar anúncio'
      setError(msg)
      toast.error(msg || 'Erro ao processar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {listing ? 'Editar Anúncio' : 'Novo Anúncio'}
          </DialogTitle>
          <DialogDescription>
            {listing ? 'Atualize os dados do anúncio.' : 'Preencha os dados para criar um novo anúncio.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plataforma */}
          <div>
            <Label htmlFor="platform_id">
              Plataforma
            </Label>
            <select
              id="platform_id"
              name="platform_id"
              defaultValue={listing?.platform_id || ''}
              className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Manual / Outro</option>
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* ID Externo */}
          <div>
            <Label htmlFor="external_listing_id">
              ID do Anúncio na Plataforma
            </Label>
            <Input
              type="text"
              id="external_listing_id"
              name="external_listing_id"
              defaultValue={listing?.external_listing_id || ''}
              placeholder="Ex: 12345678"
            />
            <p className="text-xs text-gray-500 mt-1">
              O ID único do anúncio na plataforma externa (Airbnb, Booking, etc)
            </p>
          </div>

          {/* iCal URL */}
          <div>
            <Label htmlFor="ical_url">
              URL do iCal
            </Label>
            <Input
              type="url"
              id="ical_url"
              name="ical_url"
              defaultValue={listing?.ical_url || ''}
              placeholder="https://..."
            />
            <p className="text-xs text-gray-500 mt-1">
              URL para sincronização automática do calendário
            </p>
          </div>

          {/* Sync Enabled */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sync_enabled"
              name="sync_enabled"
              defaultChecked={listing?.sync_enabled ?? true}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <Label htmlFor="sync_enabled">
              Habilitar sincronização automática
            </Label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Sobre anúncios:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Cada propriedade pode ter múltiplos anúncios</li>
                  <li>Use para conectar com Airbnb, Booking.com, etc</li>
                  <li>O iCal permite sincronização automática de reservas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Salvando...' : listing ? 'Salvar Alterações' : 'Criar Anúncio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
