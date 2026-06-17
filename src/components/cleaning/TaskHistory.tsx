'use client';

import { useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';

interface HistoryEntry {
  id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
}

interface TaskHistoryProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskHistory({ taskId, isOpen, onClose }: TaskHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);
  const [revertReason, setRevertReason] = useState('');

  // Fetch history
  const fetchHistory = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cleaning/tasks/${taskId}/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle revert
  const handleRevert = async (historyId: string) => {
    if (!revertReason.trim()) {
      alert('Por favor, forneça um motivo para a reversão');
      return;
    }

    setReverting(historyId);
    try {
      const res = await fetch(`/api/cleaning/tasks/${taskId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId, reason: revertReason }),
      });

      if (!res.ok) throw new Error('Failed to revert');

      alert('✅ Tarefa revertida com sucesso!');
      setRevertReason('');
      await fetchHistory();
      window.location.reload();
    } catch (error) {
      console.error('Error reverting:', error);
      alert('Erro ao reverter tarefa');
    } finally {
      setReverting(null);
    }
  };

  // Trigger fetch on open
  if (isOpen && history.length === 0 && !loading) {
    fetchHistory();
  }

  if (!isOpen) return null;

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created':
        return '✨ Criada';
      case 'updated':
        return '✏️ Atualizada';
      case 'deleted':
        return '🗑️ Deletada';
      case 'reverted':
        return '↩️ Revertida';
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-50 border-green-200';
      case 'updated':
        return 'bg-blue-50 border-blue-200';
      case 'deleted':
        return 'bg-red-50 border-red-200';
      case 'reverted':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">📜 Histórico da Tarefa</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="p-8 text-center text-gray-500">Carregando histórico...</div>
        )}

        {/* Timeline */}
        {!loading && history.length > 0 && (
          <div className="p-6">
            {/* Revert Section */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-3">↩️ Reverter Tarefa</h3>
              <p className="text-sm text-amber-800 mb-3">
                Selecione um estado anterior para reverter:
              </p>
              <textarea
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Por que está revertendo? (obrigatório)"
                className="w-full px-3 py-2 border rounded text-sm mb-3"
                rows={2}
              />
            </div>

            {/* Timeline Items */}
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`border-l-4 border-gray-300 pl-4 pb-4 ${
                    index !== history.length - 1 ? 'border-b pb-4' : ''
                  }`}
                >
                  {/* Timeline Dot */}
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-3 h-3 rounded-full bg-blue-600" />

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          {getActionLabel(entry.action)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(entry.changed_at).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      {entry.field_name && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>{entry.field_name}:</strong>{' '}
                          {entry.old_value && (
                            <>
                              <span className="line-through text-red-600">
                                {entry.old_value}
                              </span>
                              {' → '}
                            </>
                          )}
                          <span className="text-green-600">{entry.new_value}</span>
                        </p>
                      )}

                      {entry.reason && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                          💬 {entry.reason}
                        </p>
                      )}

                      {/* Revert Button */}
                      {entry.action !== 'created' && entry.action !== 'reverted' && (
                        <button
                          onClick={() => handleRevert(entry.id)}
                          disabled={reverting === entry.id || !revertReason.trim()}
                          className="mt-2 text-xs px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {reverting === entry.id ? 'Revertendo...' : 'Reverter para aqui'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && history.length === 0 && (
          <div className="p-8 text-center text-gray-500">Sem histórico</div>
        )}
      </div>
    </div>
  );
}
