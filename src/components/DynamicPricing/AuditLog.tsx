'use client';

import React, { useState, useMemo } from 'react';
import { Download, Filter, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLogEntry {
  id: string;
  date: string;
  type: 'manual' | 'automated';
  ruleName?: string;
  oldPrice: number;
  newPrice: number;
  change: number;
  percentChange: number;
  userId?: string;
  notes?: string;
}

interface AuditLogProps {
  propertyId: string;
  entries: AuditLogEntry[];
  onExport?: () => Promise<void>;
}

type DateFilter = 'today' | '7d' | '30d' | '90d' | 'all';

export function AuditLog({ propertyId, entries = [], onExport }: AuditLogProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d');
  const [typeFilter, setTypeFilter] = useState<'all' | 'manual' | 'automated'>('all');
  const [exporting, setExporting] = useState(false);

  // Filter entries
  const filteredEntries = useMemo(() => {
    const now = new Date();
    let filtered = [...entries];

    // Date filter
    if (dateFilter !== 'all') {
      const daysAgo =
        dateFilter === 'today'
          ? 1
          : dateFilter === '7d'
            ? 7
            : dateFilter === '30d'
              ? 30
              : dateFilter === '90d'
                ? 90
                : Infinity;

      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((e) => new Date(e.date) >= cutoffDate);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((e) => e.type === typeFilter);
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, dateFilter, typeFilter]);

  const handleExportCSV = async () => {
    try {
      setExporting(true);

      const rows = [
        ['Audit Log Report', 'Propriedade ' + propertyId],
        ['Gerado:', new Date().toISOString()],
        [],
        ['Data', 'Tipo', 'Regra', 'Preço Anterior €', 'Novo Preço €', 'Mudança €', 'Mudança %', 'Usuário', 'Notas'],
      ];

      filteredEntries.forEach((entry) => {
        rows.push([
          new Date(entry.date).toLocaleDateString('pt-PT'),
          entry.type === 'manual' ? 'Manual' : 'Automática',
          entry.ruleName || '-',
          entry.oldPrice.toFixed(2),
          entry.newPrice.toFixed(2),
          entry.change.toFixed(2),
          entry.percentChange.toFixed(2) + '%',
          entry.userId || '-',
          entry.notes || '-',
        ]);
      });

      const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Audit log exportado como CSV');
    } catch (error) {
      toast.error('Erro ao exportar audit log');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const stats = useMemo(() => {
    const manual = filteredEntries.filter((e) => e.type === 'manual').length;
    const automated = filteredEntries.filter((e) => e.type === 'automated').length;
    const totalChange = filteredEntries.reduce((acc, e) => acc + e.change, 0);

    return { manual, automated, totalChange };
  }, [filteredEntries]);

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Histórico de Mudanças (Audit Log)
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Todas as mudanças de preço (manual e automática)
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Total
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {filteredEntries.length}
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
            Manual
          </p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-2">
            {stats.manual}
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">
            Automática
          </p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-2">
            {stats.automated}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Período:
          </span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="all">Todo o período</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Tipo:
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'manual' | 'automated')}
            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="manual">Manual</option>
            <option value="automated">Automática</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-600 dark:text-slate-400">
              Nenhuma mudança de preço no período selecionado
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">
                  Data
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">
                  Regra/Motivo
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                  Preço Anterior
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                  Novo Preço
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                  Mudança
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 text-slate-900 dark:text-white">
                    {new Date(entry.date).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        entry.type === 'manual'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                      }`}
                    >
                      {entry.type === 'manual' ? 'Manual' : 'Automática'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-900 dark:text-white">
                    {entry.ruleName || 'Ajuste manual'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                    €{entry.oldPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                    €{entry.newPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className={`font-semibold ${
                        entry.change > 0
                          ? 'text-green-600'
                          : entry.change < 0
                            ? 'text-red-600'
                            : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {entry.change > 0 ? '+' : ''}€{entry.change.toFixed(2)} ({entry.percentChange.toFixed(1)}%)
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Data retention note */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          💾 Os registros de auditoria são mantidos por 1 ano. Exporte periodicamente para manter backups.
        </p>
      </div>
    </div>
  );
}
