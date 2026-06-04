'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { Button } from '@/design-system/atoms/Button';

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  is_required: boolean;
  order_index: number;
}

interface ChecklistResponse {
  item_id: string;
  checked: boolean;
  notes?: string;
}

interface ChecklistFillerProps {
  taskId: string;
  items: ChecklistItem[];
  onComplete?: () => void;
}

export function ChecklistFiller({
  taskId,
  items,
  onComplete
}: ChecklistFillerProps) {
  const [responses, setResponses] = useState<Map<string, ChecklistResponse>>(
    new Map()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Map<string, string>>(new Map());

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>
  );

  // Calculate progress
  const checkedCount = Array.from(responses.values()).filter(
    (r) => r.checked
  ).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Check if all required items are filled
  const allRequiredFilled = items
    .filter((item) => item.is_required)
    .every((item) => responses.get(item.id)?.checked);

  // Auto-save function
  const autoSave = useCallback(
    async (updatedResponses: Map<string, ChecklistResponse>) => {
      if (!taskId) return;

      setSaving(true);
      setError(null);

      try {
        const payload = Array.from(updatedResponses.values());

        const res = await fetch(`/api/cleaner/tasks/${taskId}/checklist`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses: payload })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error saving';
        setError(message);
        console.error('[ChecklistFiller] Auto-save error:', err);
      } finally {
        setSaving(false);
      }
    },
    [taskId]
  );

  // Debounced auto-save (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      autoSave(responses);
    }, 500);

    return () => clearTimeout(timer);
  }, [responses, autoSave]);

  const toggleItem = (itemId: string) => {
    const updated = new Map(responses);
    const current = updated.get(itemId) || { item_id: itemId, checked: false };
    updated.set(itemId, { ...current, checked: !current.checked });
    setResponses(updated);
  };

  const updateNotes = (itemId: string, note: string) => {
    const updated = new Map(notes);
    if (note) {
      updated.set(itemId, note);
    } else {
      updated.delete(itemId);
    }
    setNotes(updated);

    // Update response with notes
    const responseUpdated = new Map(responses);
    const current = responseUpdated.get(itemId) || { item_id: itemId, checked: false };
    current.notes = note || undefined;
    responseUpdated.set(itemId, current);
    setResponses(responseUpdated);
  };

  const handleComplete = async () => {
    if (!allRequiredFilled) {
      setError('Todos os itens obrigatórios precisam ser marcados');
      return;
    }

    // Final save before completion
    await autoSave(responses);
    onComplete?.();
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Progresso</h2>
          <span className="text-2xl font-bold text-blue-600">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {checkedCount} de {totalCount} itens marcados
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Checklist Items Grouped by Category */}
      <div className="space-y-4">
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const categoryChecked = categoryItems.filter(
            (item) => responses.get(item.id)?.checked
          ).length;

          return (
            <div key={category} className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                {category} ({categoryChecked}/{categoryItems.length})
              </h3>

              <div className="space-y-3">
                {categoryItems.map((item) => {
                  const isChecked = responses.get(item.id)?.checked || false;
                  const itemNotes = notes.get(item.id) || '';

                  return (
                    <div key={item.id} className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="flex-shrink-0 mt-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItem(item.id)}
                            disabled={saving}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <span
                            className={`text-sm font-medium ${
                              isChecked
                                ? 'text-gray-500 line-through'
                                : 'text-gray-900'
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.is_required && (
                            <span className="ml-2 inline-block px-2 py-1 text-xs font-semibold text-red-700 bg-red-50 rounded">
                              Obrigatório
                            </span>
                          )}
                        </div>
                        {isChecked && (
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                      </label>

                      {/* Notes Field */}
                      {isChecked && (
                        <textarea
                          placeholder="Adicionar notas (opcional)"
                          value={itemNotes}
                          onChange={(e) => updateNotes(item.id, e.target.value)}
                          disabled={saving}
                          className="ml-8 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Button */}
      <div className="flex gap-3">
        <Button
          onClick={handleComplete}
          disabled={!allRequiredFilled || saving}
          className="flex-1"
        >
          {saving ? 'Salvando...' : 'Concluir Limpeza'}
        </Button>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className="text-sm text-gray-600 text-center">
          Salvando automaticamente...
        </div>
      )}
    </div>
  );
}
