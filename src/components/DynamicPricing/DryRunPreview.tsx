'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PriceChange {
  date: string;
  currentPrice: number;
  simulatedPrice: number;
  change: number;
  percentChange: number;
}

interface DryRunPreviewProps {
  propertyId: string;
  priceChanges: PriceChange[];
  totalRevenueDifference: number;
  onApply: () => Promise<void>;
  onDiscard: () => void;
  loading?: boolean;
}

export function DryRunPreview({
  propertyId,
  priceChanges,
  totalRevenueDifference,
  onApply,
  onDiscard,
  loading = false,
}: DryRunPreviewProps) {
  const [applying, setApplying] = useState(false);

  const stats = useMemo(() => {
    const increases = priceChanges.filter((p) => p.change > 0).length;
    const decreases = priceChanges.filter((p) => p.change < 0).length;
    const unchanged = priceChanges.length - increases - decreases;

    return {
      total: priceChanges.length,
      increases,
      decreases,
      unchanged,
      avgChange: priceChanges.length > 0
        ? priceChanges.reduce((acc, p) => acc + p.change, 0) / priceChanges.length
        : 0,
    };
  }, [priceChanges]);

  const handleApply = async () => {
    try {
      setApplying(true);
      await onApply();
      toast.success('Mudanças de preço aplicadas com sucesso');
    } catch (error) {
      toast.error('Erro ao aplicar mudanças');
      console.error(error);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Prévia de Mudanças de Preço
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Próximos 30 dias — nenhuma mudança foi aplicada ainda
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Total de Noites
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.total}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">
            Aumentos
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">
            {stats.increases}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">
            Reduções
          </p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-2">
            {stats.decreases}
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Mudança Média
          </p>
          <p className={`text-2xl font-bold mt-2 ${stats.avgChange > 0 ? 'text-green-600' : stats.avgChange < 0 ? 'text-red-600' : 'text-slate-600'}`}>
            €{stats.avgChange.toFixed(2)}
          </p>
        </div>

        <div className={`rounded-lg p-4 ${totalRevenueDifference > 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
          <p className="text-xs font-semibold uppercase">
            {totalRevenueDifference > 0 ? 'Impacto em Receita' : 'Impacto em Receita'}
          </p>
          <p className={`text-2xl font-bold mt-2 ${totalRevenueDifference > 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            €{totalRevenueDifference.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Price Changes Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">
                Data
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                Preço Atual
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                Preço Simulado
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                Mudança
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">
                Tipo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {priceChanges.slice(0, 15).map((change) => (
              <tr key={change.date} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="px-4 py-3 text-slate-900 dark:text-white">
                  {new Date(change.date).toLocaleDateString('pt-PT')}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                  €{change.currentPrice.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                  €{change.simulatedPrice.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div
                    className={`font-semibold ${
                      change.change > 0
                        ? 'text-green-600'
                        : change.change < 0
                          ? 'text-red-600'
                          : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {change.change > 0 ? '+' : ''}{change.change.toFixed(2)} ({change.percentChange.toFixed(1)}%)
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {change.change > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600 mx-auto" />
                  ) : change.change < 0 ? (
                    <TrendingDown className="w-4 h-4 text-red-600 mx-auto" />
                  ) : (
                    <div className="w-4 h-4 bg-slate-300 mx-auto rounded"></div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {priceChanges.length > 15 && (
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
          Mostrando 15 de {priceChanges.length} dias — role para ver mais
        </p>
      )}

      {/* Warning */}
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          💡 <strong>Esta é uma prévia.</strong> Nenhuma mudança de preço foi aplicada ainda. Clique em "Aplicar" para confirmar e salvar as mudanças.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onDiscard}
          disabled={applying}
          className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors disabled:opacity-50"
        >
          <XCircle className="w-4 h-4 inline-block mr-2" />
          Descartar Mudanças
        </button>
        <button
          onClick={handleApply}
          disabled={applying || loading}
          className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
        >
          <CheckCircle className="w-4 h-4 inline-block mr-2" />
          {applying ? 'Aplicando...' : 'Aplicar Mudanças'}
        </button>
      </div>
    </div>
  );
}
