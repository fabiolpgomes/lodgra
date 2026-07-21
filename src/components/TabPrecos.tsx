/**
 * Story 36.2: Tab Preços (Pricing configuration)
 */

import { useEffect, useState } from 'react';
import { usePricingSettings } from '@/hooks/usePricingSettings';

interface TabPrecosProps {
  propertyId: string;
  onSaved?: () => void;
}

export function TabPrecos({ propertyId, onSaved }: TabPrecosProps) {
  const { fetchPrices, updatePrices, loading, error } = usePricingSettings(propertyId);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [weekendPrice, setWeekendPrice] = useState<number | undefined>();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchPrices();
        if (res.data) {
          setBasePrice(res.data.base_price || 0);
          setWeekendPrice(res.data.weekend_price);
        }
      } catch {
        // Error handled in hook
      }
    })();
  }, [fetchPrices]);

  async function handleSave() {
    try {
      setSuccess(false);
      await updatePrices(basePrice, weekendPrice);
      setSuccess(true);
      onSaved?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // Error handled in hook
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Preço básico */}
      <div>
        <label className="block text-sm font-medium mb-1">Preço básico</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={basePrice}
          onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="€0.00"
        />
      </div>

      {/* Preço de fim de semana */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Preço de fim de semana
          {weekendPrice && <button onClick={() => setWeekendPrice(undefined)} className="ml-2 text-blue-600 text-xs">Remover</button>}
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={weekendPrice || ''}
          onChange={(e) => setWeekendPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="€0.00 (opcional)"
        />
      </div>

      {/* Preço Inteligente */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Preço Inteligente</label>
          <input type="checkbox" disabled className="w-4 h-4" />
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Seus preços serão ajustados automaticamente com base na demanda dos hóspedes.
        </p>
      </div>

      {/* Taxas */}
      <div className="p-3 border-t pt-3">
        <button className="text-sm text-gray-700 font-medium">
          Taxas →
        </button>
        <p className="text-xs text-gray-500 mt-1">
          Limpeza, animais de estimação, hóspedes extras
        </p>
      </div>

      {/* Messages */}
      {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="p-2 bg-green-100 text-green-700 rounded text-sm">Preços salvos com sucesso</div>}

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
