'use client';

import React, { useState, useCallback } from 'react';
import { Plus, X, ChevronDown, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { PricingRule } from '@/types/pricing';

interface RuleBuilderProps {
  propertyId: string;
  onCreateRule: (rule: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onClose: () => void;
}

type ConditionType = 'occupancy' | 'booking_pace' | 'season' | 'day_of_week' | 'days_until_checkin';
type ActionType = 'increase_percent' | 'decrease_percent' | 'set_price';

export function RuleBuilder({ propertyId, onCreateRule, onClose }: RuleBuilderProps) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(1);
  const [enabled, setEnabled] = useState(true);
  const [conditionType, setConditionType] = useState<ConditionType>('occupancy');
  const [operator, setOperator] = useState('>=');
  const [conditionValue, setConditionValue] = useState('50');
  const [actionType, setActionType] = useState<ActionType>('increase_percent');
  const [actionValue, setActionValue] = useState('10');
  const [loading, setLoading] = useState(false);

  const templates = [
    {
      name: 'High Occupancy Boost',
      description: 'Increase price when occupancy >80%',
      condition: 'occupancy >= 80',
      action: '+15%',
    },
    {
      name: 'Last-Minute Discount',
      description: 'Discount for bookings <7 days away',
      condition: 'days_until_checkin <= 7',
      action: '-20%',
    },
    {
      name: 'Peak Season Premium',
      description: 'Premium pricing during peak season',
      condition: 'season = peak',
      action: '+25%',
    },
    {
      name: 'Weekend Rate',
      description: 'Higher price on weekends',
      condition: 'day_of_week in [5,6]',
      action: '+30%',
    },
  ];

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        toast.error('Nome da regra obrigatório');
        return;
      }

      try {
        setLoading(true);
        await onCreateRule({
          property_id: propertyId,
          name: name.trim(),
          priority,
          enabled,
          condition: {
            type: conditionType,
            operator: operator as any,
            value: isNaN(Number(conditionValue)) ? conditionValue : Number(conditionValue),
          },
          action: {
            type: actionType,
            value: Number(actionValue),
          },
        });

        toast.success('Regra criada com sucesso');
        onClose();
      } catch (error) {
        toast.error('Erro ao criar regra');
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [propertyId, name, priority, enabled, conditionType, operator, conditionValue, actionType, actionValue, onCreateRule, onClose]
  );

  const applyTemplate = useCallback((template: (typeof templates)[0]) => {
    setName(template.name);
    toast.success(`Template "${template.name}" aplicado`);
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Criar Regra de Preço
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Templates */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Templates populares:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => (
                <button
                  key={template.name}
                  onClick={() => applyTemplate(template)}
                  className="p-3 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {template.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nome da Regra
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Preço de fim de semana"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Prioridade (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Regras com maior prioridade são avaliadas primeiro
              </p>
            </div>

            {/* Condition */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Condição
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={conditionType}
                  onChange={(e) => setConditionType(e.target.value as ConditionType)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="occupancy">Ocupação (%)</option>
                  <option value="booking_pace">Dias até cheio</option>
                  <option value="season">Estação</option>
                  <option value="day_of_week">Dia da semana</option>
                  <option value="days_until_checkin">Dias até check-in</option>
                </select>

                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value=">=">&gt;=</option>
                  <option value="<=">&lt;=</option>
                  <option value="=">=</option>
                </select>

                <input
                  type="text"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="Valor"
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Action */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Ação
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ActionType)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="increase_percent">Aumentar %</option>
                  <option value="decrease_percent">Diminuir %</option>
                  <option value="set_price">Preço Fixo €</option>
                </select>

                <input
                  type="number"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder="Valor"
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="enabled" className="text-sm text-slate-700 dark:text-slate-300">
                Ativar regra imediatamente
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
              >
                {loading ? 'Criando...' : 'Criar Regra'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
