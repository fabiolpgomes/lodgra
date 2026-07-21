/**
 * Story 36.2: Tab Disponibilidade (Availability configuration)
 */

import { useEffect, useState } from 'react';
import { usePricingSettings } from '@/hooks/usePricingSettings';

interface TabDisponibilidadeProps {
  propertyId: string;
  onSaved?: () => void;
}

export function TabDisponibilidade({ propertyId, onSaved }: TabDisponibilidadeProps) {
  const { fetchAvailability, updateAvailability, loading, error } = usePricingSettings(propertyId);
  const [minNights, setMinNights] = useState(1);
  const [maxNights, setMaxNights] = useState(365);
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState(0);
  const [noticeForSameDay, setNoticeForSameDay] = useState('00:00');
  const [preparationDays, setPreparationDays] = useState(0);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAvailability();
        if (res.data) {
          setMinNights(res.data.min_nights || 1);
          setMaxNights(res.data.max_nights || 365);
          setAdvanceNoticeDays(res.data.advance_notice_days || 0);
          setNoticeForSameDay(res.data.notice_for_same_day || '00:00');
          setPreparationDays(res.data.preparation_days || 0);
        }
      } catch {
        // Error handled in hook
      }
    })();
  }, [fetchAvailability]);

  async function handleSave() {
    try {
      setSuccess(false);
      await updateAvailability({
        minNights,
        maxNights,
        advanceNoticeDays,
        noticeForSameDay,
        preparationDays,
      });
      setSuccess(true);
      onSaved?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // Error handled in hook
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Número mínimo de noites */}
      <div>
        <label className="block text-sm font-medium mb-1">Número mínimo de noites</label>
        <input
          type="number"
          min="1"
          value={minNights}
          onChange={(e) => setMinNights(parseInt(e.target.value) || 1)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Número máximo de noites */}
      <div>
        <label className="block text-sm font-medium mb-1">Número máximo de noites</label>
        <input
          type="number"
          min="1"
          value={maxNights}
          onChange={(e) => setMaxNights(parseInt(e.target.value) || 365)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Tempo de antecedência */}
      <div>
        <label className="block text-sm font-medium mb-1">Tempo de antecedência</label>
        <select
          value={advanceNoticeDays}
          onChange={(e) => setAdvanceNoticeDays(parseInt(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value={0}>Mesmo dia</option>
          <option value={1}>1 dia</option>
          <option value={7}>1 semana</option>
          <option value={14}>2 semanas</option>
          <option value={30}>1 mês</option>
          <option value={90}>3 meses</option>
        </select>
      </div>

      {/* Aviso prévio para o mesmo dia */}
      <div>
        <label className="block text-sm font-medium mb-1">Aviso prévio para o mesmo dia</label>
        <input
          type="time"
          value={noticeForSameDay}
          onChange={(e) => setNoticeForSameDay(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Tempo de preparação */}
      <div>
        <label className="block text-sm font-medium mb-1">Tempo de preparação</label>
        <select
          value={preparationDays}
          onChange={(e) => setPreparationDays(parseInt(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value={0}>Nenhum</option>
          <option value={1}>1 dia</option>
          <option value={2}>2 dias</option>
          <option value={3}>3 dias</option>
          <option value={5}>5 dias</option>
          <option value={7}>1 semana</option>
        </select>
      </div>

      {/* Messages */}
      {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="p-2 bg-green-100 text-green-700 rounded text-sm">Disponibilidade salva com sucesso</div>}

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
