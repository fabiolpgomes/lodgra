/**
 * Story 36.11: Dynamic Pricing Rules Editor
 * Interface for creating and managing pricing rules
 */

import React, { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { PricingRule, PriceGuardrails } from '@/types/pricing';

interface PricingRulesEditorProps {
  propertyId: string;
  rules: PricingRule[];
  guardrails: PriceGuardrails;
  onAddRule: (rule: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onToggleRule: (ruleId: string, enabled: boolean) => Promise<void>;
}

export function PricingRulesEditor({
  propertyId,
  rules,
  guardrails,
  onAddRule,
  onDeleteRule,
  onToggleRule,
}: PricingRulesEditorProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Regras de Preço</h3>
          <p className="text-sm text-gray-600 mt-1">
            Preço mínimo: €{guardrails.min_price} | Máximo: €{guardrails.max_price}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Regra
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
            Nenhuma regra criada. Adicione uma para começar.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-sm transition"
            >
              <button
                onClick={() => onToggleRule(rule.id, !rule.enabled)}
                className="flex-shrink-0"
              >
                {rule.enabled ? (
                  <ToggleRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-gray-400" />
                )}
              </button>

              <div className="flex-1">
                <p className={`font-semibold ${!rule.enabled && 'text-gray-400'}`}>
                  {rule.name}
                </p>
                <p className="text-sm text-gray-600">
                  Priority: {rule.priority}
                </p>
              </div>

              <button
                onClick={() => onDeleteRule(rule.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Form (collapsed) */}
      {showForm && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            Funcionalidade completa de criação de regras chegando em breve.
          </p>
        </div>
      )}
    </div>
  );
}
