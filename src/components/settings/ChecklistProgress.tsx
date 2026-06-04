'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react';

interface ChecklistResponse {
  item_id: string;
  checked: boolean;
  notes?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  is_required: boolean;
}

interface ChecklistProgressProps {
  taskId: string;
  items: ChecklistItem[];
  pollInterval?: number; // milliseconds, default 2000 (2 seconds)
}

export function ChecklistProgress({
  taskId,
  items,
  pollInterval = 2000
}: ChecklistProgressProps) {
  const [responses, setResponses] = useState<Map<string, ChecklistResponse>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch checklist progress
  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/cleaner/tasks/${taskId}/checklist`);

      if (!res.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await res.json();
      const responsesMap = new Map<string, ChecklistResponse>();

      if (data.responses && Array.isArray(data.responses)) {
        data.responses.forEach((response: ChecklistResponse) => {
          responsesMap.set(response.item_id, response);
        });
      }

      setResponses(responsesMap);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('[ChecklistProgress] Fetch error:', err);
      setError('Erro ao carregar progresso');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchProgress();

    const interval = setInterval(fetchProgress, pollInterval);

    return () => clearInterval(interval);
  }, [taskId, pollInterval, fetchProgress]);

  // Calculate progress
  const checkedCount = Array.from(responses.values()).filter(
    (r) => r.checked
  ).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Group by category for display
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

  if (loading && !lastUpdated) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Carregando progresso...</span>
      </div>
    );
  }

  if (error && !lastUpdated) {
    return (
      <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Progresso em Tempo Real</h3>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>

        <div className="flex items-center gap-6">
          <div>
            <div className="text-4xl font-bold text-blue-600">{progressPercent}%</div>
            <p className="text-sm text-gray-600 mt-1">
              {checkedCount} de {totalCount} itens
            </p>
          </div>

          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-4">
            Atualizado há {Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s
          </p>
        )}
      </div>

      {/* Items by Category */}
      <div className="space-y-4">
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const categoryChecked = categoryItems.filter(
            (item) => responses.get(item.id)?.checked
          ).length;

          return (
            <div key={category} className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-3">
                {category} ({categoryChecked}/{categoryItems.length})
              </h4>

              <div className="space-y-2">
                {categoryItems.map((item) => {
                  const response = responses.get(item.id);
                  const isChecked = response?.checked || false;

                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                    >
                      {isChecked ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            isChecked
                              ? 'text-gray-500 line-through'
                              : 'text-gray-900'
                          }`}
                        >
                          {item.label}
                        </p>
                        {item.is_required && !isChecked && (
                          <span className="text-xs font-semibold text-red-600 mt-1">
                            ⚠ Obrigatório
                          </span>
                        )}
                        {response?.notes && (
                          <p className="text-xs text-gray-600 mt-1 italic">
                            Notas: {response.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-Update Info */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        Atualizando automaticamente a cada {Math.round(pollInterval / 1000)}s
      </div>
    </div>
  );
}
