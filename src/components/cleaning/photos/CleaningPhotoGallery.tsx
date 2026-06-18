'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';

interface Photo {
  id: string;
  task_id: string;
  storage_path: string;
  uploaded_at: string;
  uploader_id: string;
  url?: string;
}

interface Props {
  taskId: string;
  isManager?: boolean;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function CleaningPhotoGallery({ taskId, isManager = false }: Props) {
  const t = useTranslations('cleaning.photos.gallery');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch(`/api/cleaner/tasks/${taskId}/photos`);
        if (!response.ok) throw new Error('Failed to load photos');
        const data = await response.json();
        if (mounted) {
          setPhotos(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error loading photos:', err);
          setError(t('load_error'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    // Subscribe to Realtime updates for this task's photos with lifecycle management
    const channel = supabase
      .channel(`cleaning_photos:task_id=eq.${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cleaning_photos',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Reload photos on insert to get signed URL
            load();
          } else if (payload.eventType === 'DELETE') {
            setPhotos((prev) => prev.filter((p) => p.id !== (payload.old as Photo).id));
          } else if (payload.eventType === 'UPDATE') {
            load();
          }
        }
      )
      .on('system', { event: 'join' }, () => {
        if (mounted) {
          console.log('✅ Realtime connected');
          // Clear polling if active
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      })
      .on('system', { event: 'leave' }, () => {
        if (mounted) {
          console.log('⚠️ Realtime disconnected, starting polling fallback');
          // Start polling fallback
          pollInterval = setInterval(load, 5000);
        }
      })
      .subscribe(async (status) => {
        console.log('Realtime status:', status);
        if (status === 'SUBSCRIBED') {
          if (mounted && pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          if (mounted && !pollInterval) {
            console.log('Starting polling fallback due to:', status);
            pollInterval = setInterval(load, 5000);
          }
        }
      });

    return () => {
      mounted = false;
      channel.unsubscribe();
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [taskId, t]);

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
    return <div className="text-gray-600">{t('loading')}</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (photos.length === 0) {
    return <div className="text-gray-600">{t('no_photos')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            {photo.url && (
              <div className="relative w-full h-24 rounded-lg overflow-hidden">
                <Image
                  src={photo.url}
                  alt="Cleaning photo"
                  fill
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q=="
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
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
