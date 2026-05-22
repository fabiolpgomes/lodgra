'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/common/ui/button';
import { Trash2 } from 'lucide-react';

interface Photo {
  id: string;
  task_id: string;
  file_path: string;
  uploaded_at: string;
  uploader_id: string;
  url?: string;
}

interface Props {
  taskId: string;
  isManager?: boolean;
}

export default function CleaningPhotoGallery({ taskId, isManager = false }: Props) {
  const t = useTranslations('cleaning.photos.gallery');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
    // Refresh photos every 5 seconds for real-time updates
    const interval = setInterval(loadPhotos, 5000);
    return () => clearInterval(interval);
  }, [taskId]);

  const loadPhotos = async () => {
    try {
      const response = await fetch(`/api/cleaner/tasks/${taskId}/photos`);
      if (!response.ok) throw new Error('Failed to load photos');
      const data = await response.json();
      setPhotos(data);
      setError(null);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError(t('load_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm(t('delete_confirm'))) return;

    setDeleting(photoId);
    try {
      const response = await fetch(`/api/cleaner/tasks/${taskId}/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete photo');

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError(t('delete_error'));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="text-gray-500">{t('loading')}</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (photos.length === 0) {
    return <div className="text-gray-500">{t('no_photos')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            {photo.url && (
              <img
                src={photo.url}
                alt="Cleaning photo"
                className="w-full h-24 object-cover rounded-lg"
              />
            )}

            {isManager && (
              <button
                onClick={() => handleDelete(photo.id)}
                disabled={deleting === photo.id}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
              {new Date(photo.uploaded_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
