'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface CompetitorPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompetitorPreferencesModal({ isOpen, onClose }: CompetitorPreferencesModalProps) {
  const [threshold, setThreshold] = useState(10);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [alertMethod, setAlertMethod] = useState<'in-app' | 'email' | 'both'>('in-app');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pausedMonitoring, setPausedMonitoring] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would save preferences to the API
      // For now, we'll just show a success message
      toast.success('Preferências atualizadas');
      onClose();
    } catch (error) {
      toast.error('Falha ao guardar as preferências');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preferences-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h2
              id="preferences-title"
              className="text-xl font-bold text-slate-900 dark:text-white"
            >
              Preferências de alertas
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Fechar modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Alert Threshold */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Limiar de variação de preço: {threshold}%
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Alerta apenas quando o preço variar {threshold}% ou mais
              </p>
            </div>

            {/* Monitoring Frequency */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Frequência de monitorização
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
              >
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>

            {/* Alert Method */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Método de alerta
              </label>
              <div className="space-y-2">
                {['in-app', 'email', 'both'].map((method) => (
                  <label key={method} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="alertMethod"
                      value={method}
                      checked={alertMethod === method}
                      onChange={(e) => setAlertMethod(e.target.value as 'in-app' | 'email' | 'both')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">
                      {method === 'in-app' ? 'Só na app' : method === 'email' ? 'Só por email' : 'Ambos'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sound Notifications */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Som das notificações
              </label>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Pause Monitoring */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-700">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Pausar toda a monitorização
              </label>
              <button
                onClick={() => setPausedMonitoring(!pausedMonitoring)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pausedMonitoring ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pausedMonitoring ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {pausedMonitoring && (
              <p className="text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 rounded">
                A monitorização está pausada. A recolha de preços não será executada até voltar a ativá-la.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                {loading ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
