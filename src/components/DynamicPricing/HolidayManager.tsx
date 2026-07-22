'use client';

import React, { useState } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Holiday {
  id: string;
  name: string;
  date: string;
  affectsDays: number; // ±n days around the holiday
  isCustom: boolean;
}

interface HolidayManagerProps {
  propertyId: string;
  holidays: Holiday[];
  onAddHoliday: (holiday: Omit<Holiday, 'id'>) => Promise<void>;
  onRemoveHoliday: (holidayId: string) => Promise<void>;
}

const MAJOR_HOLIDAYS_PT = [
  { name: 'Ano Novo', month: 1, day: 1 },
  { name: 'Dia de Reis', month: 1, day: 6 },
  { name: 'Sexta-feira Santa', month: 4, day: 9 }, // Varia, example
  { name: 'Dia da Liberdade', month: 4, day: 25 },
  { name: 'Dia do Trabalhador', month: 5, day: 1 },
  { name: 'Corpus Christi', month: 6, day: 8 }, // Varia, example
  { name: 'Festa de Santo António', month: 6, day: 13 },
  { name: 'Festa de São João', month: 6, day: 24 },
  { name: 'Assunção de Maria', month: 8, day: 15 },
  { name: 'Dia da República', month: 10, day: 5 },
  { name: 'Finados', month: 11, day: 1 },
  { name: 'Restauração da Independência', month: 12, day: 1 },
  { name: 'Imaculada Conceição', month: 12, day: 8 },
  { name: 'Natal', month: 12, day: 25 },
];

export function HolidayManager({
  propertyId,
  holidays = [],
  onAddHoliday,
  onRemoveHoliday,
}: HolidayManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [affectsDays, setAffectsDays] = useState(3);
  const [loading, setLoading] = useState(false);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customDate) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      await onAddHoliday({
        name: customName.trim(),
        date: customDate,
        affectsDays,
        isCustom: true,
      });
      setCustomName('');
      setCustomDate('');
      setAffectsDays(3);
      setShowForm(false);
      toast.success('Feriado adicionado com sucesso');
    } catch (error) {
      toast.error('Erro ao adicionar feriado');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMajorHoliday = async (holiday: (typeof MAJOR_HOLIDAYS_PT)[0]) => {
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear, holiday.month - 1, holiday.day);
    const formattedDate = date.toISOString().split('T')[0];

    try {
      await onAddHoliday({
        name: holiday.name,
        date: formattedDate,
        affectsDays: 3,
        isCustom: false,
      });
      toast.success(`${holiday.name} adicionado ao calendário`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        toast.info(`${holiday.name} já está no calendário`);
      } else {
        toast.error('Erro ao adicionar feriado');
      }
    }
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Gerenciar Feriados
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure feriados para ajustar preços automaticamente (±3 dias)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Feriado
        </button>
      </div>

      {/* Add Custom Holiday Form */}
      {showForm && (
        <form onSubmit={handleAddHoliday} className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nome do Feriado
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="ex: Festa Local"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Data
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Afetar ±{affectsDays} dias
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={affectsDays}
                onChange={(e) => setAffectsDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      )}

      {/* Current Holidays */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-900 dark:text-white">Feriados Configurados</h4>
        {holidays.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nenhum feriado configurado. Adicione feriados principais abaixo.
          </p>
        ) : (
          <div className="grid gap-2">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {holiday.name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {new Date(holiday.date).toLocaleDateString('pt-PT')} (±{holiday.affectsDays} dias)
                  </p>
                </div>
                <button
                  onClick={() => onRemoveHoliday(holiday.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Major Portuguese Holidays */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <h4 className="font-semibold text-slate-900 dark:text-white">Feriados Principais (Portugal)</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {MAJOR_HOLIDAYS_PT.map((holiday) => (
            <button
              key={holiday.name}
              onClick={() => handleAddMajorHoliday(holiday)}
              className="p-3 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {holiday.name}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {holiday.day}/{holiday.month}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Como funciona:</strong> Quando uma regra de preço é avaliada, ela verifica se a data está dentro do intervalo de um feriado. Se sim, a regra se aplica automaticamente.
        </p>
      </div>
    </div>
  );
}
