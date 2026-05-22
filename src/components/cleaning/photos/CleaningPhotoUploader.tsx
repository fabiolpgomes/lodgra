'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/common/ui/button';
import { ImagePlus, X } from 'lucide-react';

interface Photo {
  id?: string;
  file: File;
  preview: string;
  caption?: string;
  uploading?: boolean;
  progress?: number;
}

interface UploadedPhoto {
  id: string;
  task_id: string;
  file_path: string;
  url?: string;
  uploader_id: string;
  uploaded_at: string;
}

interface Props {
  taskId: string;
  onUploadComplete?: (photo: UploadedPhoto) => void;
}

const MAX_PHOTOS = 10;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const QUALITY = 0.8;

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => resolve(blob!),
          'image/jpeg',
          QUALITY
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export default function CleaningPhotoUploader({ taskId, onUploadComplete }: Props) {
  const t = useTranslations('cleaning.photos.uploader');
  const [photos, setPhotos] = useState<Photo[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (photos.length + files.length > MAX_PHOTOS) {
      alert(t('max_photos_error'));
      return;
    }

    for (const file of files) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert(t('invalid_format'));
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert(t('file_too_large'));
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhoto: Photo = {
          file,
          preview: event.target?.result as string,
          uploading: false,
        };
        setPhotos((prev) => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (index: number) => {
    const photo = photos[index];
    setPhotos((prev) => {
      const updated = [...prev];
      updated[index].uploading = true;
      return updated;
    });

    try {
      const compressed = await compressImage(photo.file);
      const formData = new FormData();
      formData.append('file', compressed, photo.file.name);
      if (photo.caption) formData.append('caption', photo.caption);

      const response = await fetch(`/api/cleaner/tasks/${taskId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        onUploadComplete?.(data);
        setPhotos((prev) => prev.filter((_, i) => i !== index));
      } else {
        alert(t('upload_error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(t('upload_error'));
    } finally {
      setPhotos((prev) => {
        const updated = [...prev];
        updated[index].uploading = false;
        return updated;
      });
    }
  };

  const handleRemove = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100">
          <ImagePlus size={20} className="text-blue-600" />
          <span className="text-sm font-medium">{t('add_photos')}</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={handleFileSelect}
            disabled={photos.length >= MAX_PHOTOS}
            className="hidden"
          />
        </label>
        <span className="text-sm text-gray-600">
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, i) => (
            <div key={i} className="relative group">
              <img
                src={photo.preview}
                alt={`preview-${i}`}
                className="w-full h-24 object-cover rounded-lg"
              />

              <button
                onClick={() => handleRemove(i)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100"
              >
                <X size={16} />
              </button>

              {!photo.uploading && (
                <Button
                  onClick={() => handleUpload(i)}
                  size="sm"
                  className="absolute bottom-1 left-1 right-1"
                >
                  {t('upload')}
                </Button>
              )}

              {photo.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <span className="text-white text-sm">{t('uploading')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
