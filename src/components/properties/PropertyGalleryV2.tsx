'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Trash2, GripVertical, Loader } from 'lucide-react';
import { PropertyImage } from '@/types/property-images';

interface PropertyGalleryV2Props {
  propertyId: string;
  images: PropertyImage[];
  isEditable?: boolean;
  onImageDeleted?: (imageId: string) => void;
  onImagesReordered?: (images: PropertyImage[]) => void;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function PropertyGalleryV2({
  propertyId,
  images: initialImages,
  isEditable = false,
  onImageDeleted,
  onImagesReordered,
}: PropertyGalleryV2Props) {
  const [images, setImages] = useState<PropertyImage[]>(initialImages);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [draggedImage, setDraggedImage] = useState<string | null>(null);

  // Sync local images state when props change (e.g., after parent reorder)
  useEffect(() => {
    setImages(initialImages);
    // Reset currentIndex if out of bounds
    if (currentIndex >= initialImages.length) {
      setCurrentIndex(Math.max(0, initialImages.length - 1));
    }
  }, [initialImages, currentIndex]);

  const currentImage = images[currentIndex];

  const getImageUrl = useCallback(
    (image: PropertyImage, variant: 'mobile' | 'desktop' = 'desktop') => {
      if (!SUPABASE_URL) return '';

      // 1. Try to use variants (processed images) - highest priority
      if (image.variants && image.variants.length > 0) {
        // Find variant matching the requested size
        const targetVariant = image.variants.find(
          v => v.variant_type === variant
        );

        if (targetVariant?.storage_path) {
          return `${SUPABASE_URL}/storage/v1/object/public/property-images/${targetVariant.storage_path}`;
        }
      }

      // 2. Fallback: Use storage path if available (recently uploaded but not yet processed)
      const path = image.storagePath || image.storage_path;
      if (path) {
        // Se já for uma variante interna, o storagePath será org/prop/fileId/variant.ext
        // Caso contrário, é o original org/prop/fileId.ext
        
        // Se contiver vips logic, tentamos resolver para a pasta correta
        if (path.includes('.')) {
          // Se for uma imagem original recém-enviada, o URL deve ser o original
          // No futuro, se a variante desktop demorar, este URL serve o original
          return `${SUPABASE_URL}/storage/v1/object/public/property-images/${path}`;
        }
        
        return `${SUPABASE_URL}/storage/v1/object/public/property-images/${path}`;
      }
      return '';
    },
    [SUPABASE_URL]
  );

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleDelete = async (imageId: string) => {
    if (!isEditable) return;

    setIsDeleting(imageId);

    try {
      const response = await fetch(
        `/api/properties/${propertyId}/images/${imageId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete');

      const newImages = images.filter(img => img.id !== imageId);
      setImages(newImages);

      if (currentIndex >= newImages.length) {
        setCurrentIndex(Math.max(0, newImages.length - 1));
      }

      onImageDeleted?.(imageId);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete image');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    if (!isEditable) {
      e.preventDefault();
      return;
    }
    setDraggedImage(imageId);
    e.dataTransfer.effectAllowed = 'move';
    // Prevent default click behavior during drag
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();

    if (!draggedImage || draggedImage === targetImageId || !isEditable) {
      setDraggedImage(null);
      return;
    }

    // Find indices
    const draggedIdx = images.findIndex(img => img.id === draggedImage);
    const targetIdx = images.findIndex(img => img.id === targetImageId);

    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedImage(null);
      return;
    }

    // Swap
    const newImages = [...images];
    [newImages[draggedIdx], newImages[targetIdx]] = [
      newImages[targetIdx],
      newImages[draggedIdx],
    ];

    // Update display_order
    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      display_order: idx,
    }));

    setImages(reorderedImages);
    setDraggedImage(null);

    // Call API
    try {
      const payload = {
        images: reorderedImages.map(img => ({
          id: img.id,
          display_order: img.display_order,
        })),
      };

      const response = await fetch(
        `/api/properties/${propertyId}/images/reorder`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Reorder failed');
      }

      const result = await response.json();

      // Use server response to ensure synchronization
      if (result.images && Array.isArray(result.images)) {
        const serverImages = result.images.map((img: PropertyImage) => ({
          ...img,
          variants: images.find(i => i.id === img.id)?.variants || [],
        }));
        setImages(serverImages);
        onImagesReordered?.(serverImages);
      } else {
        onImagesReordered?.(reorderedImages);
      }
    } catch (error) {
      console.error('Reorder error:', error);
      // Revert to previous state
      setImages(images);
    }
  };

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600">No images uploaded yet</p>
          {isEditable && (
            <p className="text-sm text-gray-500 mt-1">
              Scroll up to add your first image
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Gallery */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <picture>
          {/* WebP variants */}
          <source
            srcSet={getImageUrl(currentImage, 'desktop')}
            type="image/webp"
            media="(min-width: 1024px)"
          />
          <source
            srcSet={getImageUrl(currentImage, 'mobile')}
            type="image/webp"
            media="(max-width: 1023px)"
          />

          {/* JPEG fallbacks */}
          <source
            srcSet={getImageUrl(currentImage, 'desktop')}
            media="(min-width: 1024px)"
          />
          <source
            srcSet={getImageUrl(currentImage, 'mobile')}
            media="(max-width: 1023px)"
          />

          <img
            src={getImageUrl(currentImage, 'desktop')}
            alt={currentImage.alt_text || `Image ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />
        </picture>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-10"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-10"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Counter */}
        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Delete button (edit mode) */}
        {isEditable && (
          <button
            onClick={() => handleDelete(currentImage.id)}
            disabled={isDeleting === currentImage.id}
            className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white p-2 rounded-full z-10"
          >
            {isDeleting === currentImage.id ? (
              <Loader size={20} className="animate-spin" />
            ) : (
              <Trash2 size={20} />
            )}
          </button>
        )}
      </div>

      {/* Thumbnails (draggable in edit mode) */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">
          {isEditable ? 'Drag para reordenar' : 'Galeria'}
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {images.map((img, idx) => (
            <div
              key={img.id}
              draggable={isEditable}
              onDragStart={e => handleDragStart(e, img.id)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, img.id)}
              className={`
                relative aspect-square rounded-lg overflow-hidden
                transition-all duration-200 select-none
                ${idx === currentIndex
                  ? 'ring-2 ring-blue-500 ring-offset-2'
                  : ''
                }
                ${isEditable && draggedImage === img.id ? 'opacity-50' : ''}
                ${isEditable ? 'cursor-grab active:cursor-grabbing hover:shadow-lg' : 'cursor-pointer hover:opacity-80'}
              `}
            >
              {/* Click handler (separate from drag to avoid conflicts) */}
              <button
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className="absolute inset-0 w-full h-full z-10"
                aria-label={`View image ${idx + 1}`}
              />

              {/* Image */}
              <picture>
                <source
                  srcSet={getImageUrl(img, 'mobile')}
                  type="image/webp"
                />
                <img
                  src={getImageUrl(img, 'mobile')}
                  alt={img.alt_text || `Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              </picture>

              {/* Primary badge */}
              {img.is_primary && (
                <div className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded font-medium z-20 pointer-events-none">
                  Cover
                </div>
              )}

              {/* Drag handle (edit mode) */}
              {isEditable && (
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-20 pointer-events-none">
                  <GripVertical size={20} className="text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-500">
        {images.length} image{images.length !== 1 ? 's' : ''} in gallery
      </div>
    </div>
  );
}
