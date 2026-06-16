'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Array<{ id: string; name: string }>;
  cleaners: Array<{ id: string; full_name: string; phone: string }>;
  onTaskCreated?: () => void;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  properties,
  cleaners,
  onTaskCreated,
}: CreateTaskModalProps) {
  const t = useTranslations('cleaning');
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    property_id: '',
    scheduled_date: '',
    assigned_to: '',
    notes: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedLink(null);

    try {
      const response = await fetch('/api/cleaning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar tarefa');
      }

      const data: { accessLink: string } = await response.json();
      setGeneratedLink(data.accessLink);
      setFormData({ property_id: '', scheduled_date: '', assigned_to: '', notes: '' });
      onTaskCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (): void => {
    if (!generatedLink) return;
    const fullLink = `${window.location.origin}${generatedLink}`;
    navigator.clipboard.writeText(fullLink);
    alert('Link copiado ao clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">Criar Tarefa de Limpeza</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* Generated Link View */}
        {generatedLink && (
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-green-900 mb-2">✅ Tarefa Criada!</p>
              <p className="text-xs text-green-800 mb-4">
                Link gerado para o cleaner. Copie e envie via WhatsApp:
              </p>
              <div className="bg-white p-3 rounded border border-green-300 mb-4 font-mono text-xs break-all">
                {`${window.location.origin}${generatedLink}`}
              </div>
              <button
                onClick={copyToClipboard}
                className="w-full px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                Copiar Link
              </button>
            </div>
            <button
              onClick={() => {
                setGeneratedLink(null);
                onClose();
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded font-semibold hover:bg-gray-200"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Form View */}
        {!generatedLink && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Property */}
            <div>
              <label className="block text-sm font-semibold mb-1">Propriedade *</label>
              <select
                name="property_id"
                value={formData.property_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione propriedade</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cleaner */}
            <div>
              <label className="block text-sm font-semibold mb-1">Cleaner *</label>
              <select
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccione cleaner</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold mb-1">Data de Agendamento *</label>
              <input
                type="date"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold mb-1">Notas (opcional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                placeholder="Instruções especiais..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 rounded font-semibold hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar Tarefa'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
