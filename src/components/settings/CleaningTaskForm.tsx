'use client';

import { useState } from 'react';
import { Button } from '@/design-system/atoms/Button';
import { Input } from '@/design-system/atoms/Input';
import { TemplateSelector } from './TemplateSelector';
import { AlertCircle } from 'lucide-react';

interface CleaningTaskFormProps {
  propertyId: string;
  onSuccess?: () => void;
}

export function CleaningTaskForm({
  propertyId,
  onSuccess
}: CleaningTaskFormProps) {
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!scheduledDate) {
      setError('Data de agendamento é obrigatória');
      return;
    }

    if (!templateId) {
      setError('Selecione um modelo de checklist');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/cleaning-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime || null,
          checklist_template_id: templateId,
          notes: notes || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao criar tarefa');
      }

      setSuccess(true);
      setScheduledDate('');
      setScheduledTime('');
      setTemplateId('');
      setNotes('');

      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar tarefa';
      setError(message);
      console.error('[CleaningTaskForm] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">Tarefa de limpeza criada com sucesso!</p>
        </div>
      )}

      {/* Scheduled Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data de Agendamento *
        </label>
        <Input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      {/* Scheduled Time (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hora (Opcional)
        </label>
        <Input
          type="time"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Template Selector */}
      <div>
        <TemplateSelector
          propertyId={propertyId}
          selectedTemplateId={templateId}
          onSelect={setTemplateId}
          label="Modelo de Checklist *"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas Adicionais (Opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ex: Cliente mencionou problema no ar condicionado"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          disabled={loading}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Criando...' : 'Criar Tarefa de Limpeza'}
        </Button>
      </div>
    </form>
  );
}
