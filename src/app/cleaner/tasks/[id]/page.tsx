'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChecklistFiller } from '@/components/settings/ChecklistFiller';
import { Button } from '@/design-system/atoms/Button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface Task {
  id: string;
  property: { name: string };
  scheduled_date: string;
  status: 'pending' | 'in_progress' | 'done' | 'issue';
  checklist?: {
    items: Array<{
      id: string;
      label: string;
      category: string;
      is_required: boolean;
      order_index: number;
    }>;
  };
  notes?: string;
  photo_count?: number;
  photos?: string[];
}

export default function CleanerTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/cleaner/tasks/${taskId}`);
        if (!res.ok) throw new Error('Failed to fetch task');
        const data = await res.json();
        setTask(data);
        setNotes(data.notes || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  const handleTaskComplete = async () => {
    setSubmitting(true);
    try {
      // Upload photos if any
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((photo) => formData.append('photos', photo));

        const photoRes = await fetch(`/api/cleaner/tasks/${taskId}/photos`, {
          method: 'POST',
          body: formData,
        });

        if (!photoRes.ok) throw new Error('Failed to upload photos');
      }

      // Mark as complete
      const res = await fetch(`/api/cleaner/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) throw new Error('Failed to complete task');

      // Redirect to dashboard
      router.push('/pt-BR/cleaner/dashboard');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao completar tarefa');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Carregando tarefa...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded p-6 max-w-md">
          <p className="text-red-800 font-semibold mb-4">{error || 'Tarefa não encontrada'}</p>
          <Link href="/pt-BR/cleaner/dashboard" className="text-blue-600 hover:underline">
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/pt-BR/cleaner/dashboard"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{task.property.name}</h1>
              <p className="text-sm text-gray-600">
                {new Date(task.scheduled_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded text-sm font-semibold ${
                task.status === 'done'
                  ? 'bg-green-100 text-green-800'
                  : task.status === 'in_progress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {task.status === 'done' ? '✅ Concluída' : task.status === 'in_progress' ? '⏳ Em Progresso' : '⏹ Pendente'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Checklist */}
        {task.checklist && task.status !== 'done' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">✓ Checklist de Limpeza</h2>
            <ChecklistFiller taskId={task.id} items={task.checklist.items} onComplete={() => {}} />
          </div>
        )}

        {/* Notes */}
        {task.status !== 'done' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-900 mb-3">
              📝 Notas / Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva qualquer problema ou observação..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Photo Upload */}
        {task.status !== 'done' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-bold text-gray-900 mb-3">
              📸 Fotos de Comprovação ({task.photo_count || 0} + {photos.length} novas)
            </label>

            {/* Preview */}
            {(task.photos && task.photos.length > 0) && (
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-2">Fotos já enviadas:</p>
                <div className="grid grid-cols-3 gap-2">
                  {task.photos.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Photo ${idx}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* New Photos Preview */}
            {photos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-2">Novas fotos:</p>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((file, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`New ${idx}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Input */}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <p className="text-xs text-gray-600 mt-2">Máx 10 fotos por tarefa</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">💡 Instruções</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Marque cada item conforme concluir</li>
            <li>✓ Itens com ⚠ "Obrigatório" não podem ser saltados</li>
            <li>✓ Adicione fotos de antes/depois se necessário</li>
            <li>✓ Adicione notas se encontrar problemas</li>
            <li>✓ Clique "Concluir Limpeza" quando terminar</li>
          </ul>
        </div>

        {/* Action Buttons */}
        {task.status !== 'done' && (
          <div className="flex gap-3">
            <Link
              href="/pt-BR/cleaner/dashboard"
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 text-center"
            >
              Voltar
            </Link>
            <button
              onClick={handleTaskComplete}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? '🔄 Enviando...' : '✅ Concluir Limpeza'}
            </button>
          </div>
        )}

        {/* View Mode for Done Tasks */}
        {task.status === 'done' && (
          <div className="flex gap-3">
            <Link
              href="/pt-BR/cleaner/dashboard"
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 text-center"
            >
              Voltar ao Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
