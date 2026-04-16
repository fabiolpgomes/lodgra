'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { PropertyImage } from '@/types/property-images';

interface ImageUploadDragDropProps {
  propertyId: string;
  onUploadComplete: (image: PropertyImage) => void;
  onError: (error: string) => void;
}

interface UploadState {
  isDragging: boolean;
  isUploading: boolean;
  progress: number;
  fileName?: string;
  error?: string;
  success?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function ImageUploadDragDrop({
  propertyId,
  onUploadComplete,
  onError,
}: ImageUploadDragDropProps) {
  const [state, setState] = useState<UploadState>({
    isDragging: false,
    isUploading: false,
    progress: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid format. Only JPEG, PNG, and WebP are allowed.',
      };
    }

    if (file.size > MAX_SIZE) {
      return {
        valid: false,
        error: 'File too large. Maximum 10MB.',
      };
    }

    return { valid: true };
  };

  const handleUpload = useCallback(
    async (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        setState(prev => ({
          ...prev,
          error: validation.error,
          isDragging: false,
        }));
        onError(validation.error || 'Invalid file');
        return;
      }

      setState(prev => ({
        ...prev,
        isUploading: true,
        progress: 0,
        fileName: file.name,
        error: undefined,
        success: false,
      }));

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('altText', `Photo of property ${propertyId}`);

        const response = await fetch(
          `/api/properties/${propertyId}/images`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || 'Failed to upload image'
          );
        }

        const data = await response.json();

        setState(prev => ({
          ...prev,
          isUploading: false,
          progress: 100,
          success: true,
        }));

        onUploadComplete(data.image);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            success: false,
            fileName: undefined,
          }));
        }, 3000);

      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'Upload failed';

        setState(prev => ({
          ...prev,
          isUploading: false,
          error: errorMessage,
        }));

        onError(errorMessage);
      }
    },
    [propertyId, onUploadComplete, onError]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: true }));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: false }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: false }));

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadMultipleFiles(Array.from(files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      uploadMultipleFiles(Array.from(files));
    }
  };

  const uploadMultipleFiles = async (files: File[]) => {
    for (const file of files) {
      await handleUpload(file);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative rounded-lg border-2 border-dashed p-8 text-center
        cursor-pointer transition-colors duration-200
        ${state.isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }
        ${state.isUploading ? 'pointer-events-none' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        multiple
        className="hidden"
        disabled={state.isUploading}
      />

      {!state.isUploading && !state.success && !state.error && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                Arraste múltiplas fotos aqui
              </p>
              <p className="text-sm text-gray-500">
                ou clique no botão abaixo (JPEG, PNG, WebP • Máx 10MB)
              </p>
              <p className="text-xs text-blue-600 font-medium mt-1">
                ✓ Suporta múltiplas fotos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="mx-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            📁 Selecionar Fotos
          </button>
        </div>
      )}

      {state.isUploading && state.fileName && (
        <div className="space-y-3">
          <Loader className="mx-auto h-8 w-8 animate-spin text-blue-500" />
          <div>
            <p className="font-medium text-gray-900">{state.fileName}</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {state.success && state.fileName && (
        <div className="space-y-2">
          <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
          <p className="font-medium text-gray-900">Upload complete!</p>
          <p className="text-sm text-green-600">{state.fileName}</p>
        </div>
      )}

      {state.error && (
        <div className="space-y-2">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="font-medium text-gray-900">Upload failed</p>
          <p className="text-sm text-red-600">{state.error}</p>
          <button
            onClick={e => {
              e.stopPropagation();
              setState(prev => ({
                ...prev,
                error: undefined,
              }));
            }}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
