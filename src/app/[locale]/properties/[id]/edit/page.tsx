'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/lib/i18n/routing'
import Link from 'next/link'
import { ArrowLeft, Save, Globe, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import { toast } from 'sonner'
import { Skeleton } from '@/components/common/ui/skeleton'
import { slugify } from '@/lib/utils/slugify'
import { revalidatePropertyPage } from './actions'
import { ImageUploadDragDrop } from '@/components/features/properties/ImageUploadDragDrop'
import { PropertyGalleryV2 } from '@/components/features/properties/PropertyGalleryV2'
import { PropertyImage } from '@/components/features/properties/types/property-images'

export default function EditPropertyPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [property, setProperty] = useState<Record<string, string | number | null> | null>(null)
  const [propertyId, setPropertyId] = useState<string>('')
  const [owners, setOwners] = useState<{ id: string; full_name: string | null }[]>([])
  const [ownerId, setOwnerId] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [slug, setSlug] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [description, setDescription] = useState('')
  const [amenities, setAmenities] = useState('')
  const [photos, setPhotos] = useState('')
  const [basePrice, setBasePrice] = useState<string>('')
  const [minNights, setMinNights] = useState<string>('1')
  const [isActive, setIsActive] = useState(true)
  const [galleryImages, setGalleryImages] = useState<PropertyImage[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function reloadGallery(id: string): Promise<void> {
    try {
      // Query 1: Load all images
      const { data: imagesResult, error: imagesError } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', id)
        .order('display_order')

      if (imagesError) {
        console.error('Error loading images:', imagesError)
        return
      }

      if (!imagesResult || imagesResult.length === 0) {
        setGalleryImages([])
        return
      }

      // Query 2: Load ALL variants in single query (not N queries)
      const imageIds = imagesResult.map((img) => img.id)
      const { data: allVariants, error: variantsError } = await supabase
        .from('image_variants')
        .select('*')
        .in('property_image_id', imageIds)
        .order('variant_type')

      if (variantsError) {
        console.error('Error loading variants:', variantsError)
        return
      }

      // Match variants to images (O(n) in-memory operation)
      const imagesWithVariants = imagesResult.map((image) => ({
        ...image,
        variants: allVariants?.filter((v) => v.property_image_id === image.id) || [],
      }))

      setGalleryImages(imagesWithVariants)
    } catch (error) {
      console.error('Error reloading gallery:', error)
    }
  }

  useEffect(() => {
    async function loadProperty() {
      const { id } = await params
      setPropertyId(id)

      const [propResult, ownersResult, imagesResult] = await Promise.all([
        supabase.from('properties').select('*').eq('id', id).single(),
        supabase.from('owners').select('id, full_name').eq('is_active', true).order('full_name'),
        supabase.from('property_images').select('*').eq('property_id', id).order('display_order'),
      ])

      if (propResult.error || !propResult.data) {
        setError('Propriedade não encontrada')
        return
      }

      setProperty(propResult.data)
      setOwnerId(propResult.data.owner_id || '')
      setPropertyType(propResult.data.property_type || '')
      setSlug(propResult.data.slug || '')
      setIsPublic(propResult.data.is_public || false)
      setIsActive(propResult.data.is_active ?? true)
      setDescription(propResult.data.description || '')
      setAmenities((propResult.data.amenities as string[] | null)?.join(', ') || '')
      setPhotos((propResult.data.photos as string[] | null)?.join('\n') || '')
      setBasePrice((propResult.data.base_price as number | null)?.toString() || '')
      setMinNights((propResult.data.min_nights as number | null)?.toString() || '1')
      setOwners(ownersResult.data || [])

      // Load variants for images (optimized: 1 query for all variants, not N queries)
      if (imagesResult.data && imagesResult.data.length > 0) {
        const imageIds = imagesResult.data.map((img) => img.id)
        const { data: allVariants } = await supabase
          .from('image_variants')
          .select('*')
          .in('property_image_id', imageIds)
          .order('variant_type')

        const imagesWithVariants = imagesResult.data.map((image) => ({
          ...image,
          variants: allVariants?.filter((v) => v.property_image_id === image.id) || [],
        }))
        setGalleryImages(imagesWithVariants)
      } else {
        setGalleryImages([])
      }
      setLoadingData(false)
    }

    loadProperty()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const propertyName = formData.get('name') as string
      const finalSlug = slug.trim() || slugify(propertyName)

      // Parse photos (one URL per line) and amenities (comma separated)
      const photosArray = photos.split('\n').map(s => s.trim()).filter(Boolean)
      const amenitiesArray = amenities.split(',').map(s => s.trim()).filter(Boolean)

      const { error: updateError } = await supabase
        .from('properties')
        .update({
          name: propertyName,
          owner_id: ownerId || null,
          address: formData.get('address') as string,
          city: formData.get('city') as string,
          country: formData.get('country') as string,
          postal_code: formData.get('postal_code') as string,
          property_type: propertyType,
          bedrooms: parseInt(formData.get('bedrooms') as string) || 0,
          bathrooms: parseInt(formData.get('bathrooms') as string) || 0,
          max_guests: parseInt(formData.get('max_guests') as string) || 0,
          management_percentage: parseFloat(formData.get('management_percentage') as string) || 0,
          base_price: basePrice ? parseFloat(basePrice) : null,
          min_nights: minNights ? Math.max(1, parseInt(minNights)) : 1,
          slug: finalSlug,
          is_public: isPublic,
          is_active: isActive,
          description: description.trim() || null,
          photos: photosArray,
          amenities: amenitiesArray,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId)

      if (updateError) throw updateError

      toast.success('Propriedade atualizada com sucesso!')
      await revalidatePropertyPage(finalSlug)
      router.push(`/properties/${propertyId}`)
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro ao atualizar propriedade:', err)
      const message = err instanceof Error ? err.message : 'Erro ao atualizar propriedade'
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
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
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

  if (error && !property) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/properties" className="text-blue-600 hover:underline">
              Voltar para Propriedades
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={propertyId ? `/properties/${propertyId}` : '/properties'}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Detalhes
        </Link>

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Editar Propriedade</h2>
          <p className="text-gray-600 mt-1">Atualize as informações da propriedade</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
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
                  defaultValue={(property?.name as string) || ''}
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

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Localização</h3>
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
                  defaultValue={(property?.address as string) || ''}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="mb-1">
                    Cidade *
                  </Label>
                  <Input
                    type="text"
                    id="city"
                    name="city"
                    required
                    defaultValue={(property?.city as string) || ''}
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
                    defaultValue={property?.postal_code as string || ''}
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
                  defaultValue={(property?.country as string) || ''}
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Capacidade</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bedrooms" className="mb-1">
                  Quartos
                </Label>
                <Input
                  type="number"
                  id="bedrooms"
                  name="bedrooms"
                  min="0"
                  defaultValue={(property?.bedrooms as number) || 0}
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
                  defaultValue={(property?.bathrooms as number) || 0}
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
                  defaultValue={(property?.max_guests as number) || 0}
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preços e Estadia</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="base_price" className="mb-1">
                  Preço Base (por Noite) *
                </Label>
                <Input
                  type="number"
                  id="base_price"
                  min="0"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="Ex: 100.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Preço padrão por noite quando nenhuma regra de preço se aplica
                </p>
              </div>
              <div>
                <Label htmlFor="min_nights" className="mb-1">
                  Estadia Mínima (noites) *
                </Label>
                <Input
                  type="number"
                  id="min_nights"
                  min="1"
                  step="1"
                  value={minNights}
                  onChange={(e) => setMinNights(e.target.value)}
                  placeholder="Ex: 3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo de noites requeridas quando nenhuma regra de preço se aplica. As regras de preço podem sobrepor este valor.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gestão</h3>
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
                  defaultValue={(property?.management_percentage as number) || 0}
                  placeholder="Ex: 10.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentual aplicado aos valores de receita para gestão
                </p>
              </div>
            </div>
          </div>

          {/* Página Pública */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-400" />
              Página Pública
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Configure a página pública desta propriedade para aceitar reservas directas.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Propriedade Ativa (visível nas listas e disponível para reservas)
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900"
                />
                <Label htmlFor="is_public" className="cursor-pointer">
                  Tornar propriedade pública (visível em /p/[slug])
                </Label>
              </div>
              <div>
                <Label htmlFor="slug" className="mb-1">
                  URL Slug
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 shrink-0">/p/</span>
                  <Input
                    type="text"
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder={property?.name ? slugify(property.name as string) : 'gerado-automaticamente'}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Deixar em branco para gerar automaticamente a partir do nome.</p>
              </div>
              <div>
                <Label htmlFor="description" className="mb-1">
                  Descrição pública
                </Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Descreva a propriedade para potenciais hóspedes..."
                />
              </div>
              <div>
                <Label htmlFor="amenities" className="mb-1">
                  Comodidades
                </Label>
                <Input
                  type="text"
                  id="amenities"
                  value={amenities}
                  onChange={(e) => setAmenities(e.target.value)}
                  placeholder="Wi-Fi, Piscina, Estacionamento, Ar condicionado"
                />
                <p className="text-xs text-gray-500 mt-1">Separadas por vírgula.</p>
              </div>
              <div>
                <Label htmlFor="photos" className="mb-1">
                  URLs das Fotos
                </Label>
                <textarea
                  id="photos"
                  value={photos}
                  onChange={(e) => setPhotos(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="https://exemplo.com/foto1.jpg&#10;https://exemplo.com/foto2.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">Uma URL por linha.</p>
              </div>

              {/* New Gallery Section */}
              {propertyId && (
                <div className="space-y-4 border-t pt-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Upload de Fotos</h4>
                    {uploadError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{uploadError}</AlertDescription>
                      </Alert>
                    )}
                    <ImageUploadDragDrop
                      propertyId={propertyId}
                      onUploadComplete={async () => {
                        setUploadError(null);
                        // Reload gallery from database to ensure image displays correctly
                        await reloadGallery(propertyId);
                        toast.success('Imagem enviada com sucesso!');
                      }}
                      onError={(error) => {
                        setUploadError(error);
                        toast.error(error);
                      }}
                    />
                  </div>

                  {galleryImages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Galeria</h4>
                      <PropertyGalleryV2
                        propertyId={propertyId}
                        images={galleryImages}
                        isEditable={true}
                        onImageDeleted={(imageId) => {
                          setGalleryImages(prev =>
                            prev.filter(img => img.id !== imageId)
                          );
                          toast.success('Imagem removida');
                        }}
                        onImagesReordered={(images) => {
                          setGalleryImages(images);
                          toast.success('Galeria reordenada');
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {propertyId && (
                <div className="pt-2">
                  <Link
                    href={`/properties/${propertyId}/pricing`}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Tag size={14} />
                    Gerir regras de preço por época →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {loading ? <>Salvando...</> : <><Save className="h-5 w-5" />Salvar Alterações</>}
            </Button>
            <Button asChild variant="outline">
              <Link href={propertyId ? `/properties/${propertyId}` : '/properties'}>
                Cancelar
              </Link>
            </Button>
          </div>
        </form>
      </div>
    </AuthLayout>
  )
}
