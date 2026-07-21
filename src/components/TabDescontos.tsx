/**
 * Story 36.2: Tab Descontos (Discount configuration)
 */

import { useState } from 'react';
import { usePricingSettings } from '@/hooks/usePricingSettings';

interface TabDescontosProps {
  propertyId: string;
  basePrice?: number;
  onSaved?: () => void;
}

export function TabDescontos({ propertyId, basePrice = 0, onSaved }: TabDescontosProps) {
  const { updateDiscount, loading, error } = usePricingSettings(propertyId);
  const [weeklyPercent, setWeeklyPercent] = useState(0);
  const [monthlyPercent, setMonthlyPercent] = useState(0);
  const [success, setSuccess] = useState(false);

  const weeklyAverage = (basePrice * 7) * (1 - weeklyPercent / 100);
  const monthlyAverage = (basePrice * 28) * (1 - monthlyPercent / 100);

  async function handleSave() {
    try {
      setSuccess(false);
      if (weeklyPercent > 0) {
        await updateDiscount('weekly', weeklyPercent, 7);
      }
      if (monthlyPercent > 0) {
        await updateDiscount('monthly', monthlyPercent, 28);
      }
      setSuccess(true);
      onSaved?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // Error handled in hook
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Por semana */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex justify-between items-start mb-3">
          <div>
            <label className="block text-sm font-medium">Por semana</label>
            <p className="text-xs text-gray-600">Para 7 noites ou mais</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={weeklyPercent}
              onChange={(e) => setWeeklyPercent(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <span>%</span>
          </div>
        </div>
        <p className="text-sm text-gray-700">
          A média semanal é de €{weeklyAverage.toFixed(2)}
        </p>
      </div>

      {/* Por mês */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex justify-between items-start mb-3">
          <div>
            <label className="block text-sm font-medium">Por mês</label>
            <p className="text-xs text-gray-600">Para 28 noites ou mais</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={monthlyPercent}
              onChange={(e) => setMonthlyPercent(parseInt(e.target.value) || 0)}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <span>%</span>
          </div>
        </div>
        <p className="text-sm text-gray-700">
          A média mensal é de €{monthlyAverage.toFixed(2)}
        </p>
      </div>

      {/* Disabled future discounts */}
      <div className="p-4 bg-gray-100 rounded-lg opacity-60">
        <p className="text-sm font-medium text-gray-600">Hóspedes com avaliações excelentes</p>
        <p className="text-xs text-gray-500">Disponível em breve</p>
      </div>

      <div className="p-4 bg-gray-100 rounded-lg opacity-60">
        <p className="text-sm font-medium text-gray-600">Reservas de última hora</p>
        <p className="text-xs text-gray-500">Disponível em breve</p>
      </div>

      {/* Messages */}
      {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="p-2 bg-green-100 text-green-700 rounded text-sm">Descontos salvos com sucesso</div>}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
      >
        {loading ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  );
}
