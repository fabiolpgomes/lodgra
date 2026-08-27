'use client';

import React, { useState, useCallback } from 'react';
import { useForecastData } from '@/hooks/useForecastData';
import { generateForecastPDF } from '@/lib/export/pdfExport';
import { generateForecastCSV } from '@/lib/export/csvExport';
import { ForecastCards } from './ForecastCards';
import { ForecastChart } from './ForecastChart';
import { StatisticsCards } from './StatisticsCards';
import { ForecastDetailsModal } from './ForecastDetailsModal';
import { RevenueForecast } from '@/types/forecasting';
import { Download, FileJson } from 'lucide-react';
import { toast } from 'sonner';

interface ForecastingDashboardProps {
  propertyId: string;
  propertyName: string;
}

export function ForecastingDashboard({ propertyId, propertyName }: ForecastingDashboardProps) {
  const { data, isLoading, error, refresh } = useForecastData(propertyId);
  const [selectedPeriod, setSelectedPeriod] = useState<'30' | '60' | '90' | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Get selected forecast
  const selectedForecast = selectedPeriod
    ? data?.forecasts[`days${selectedPeriod}` as keyof typeof data.forecasts]
    : null;

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setSelectedPeriod(null);
  }, []);

  // Handle card click to open modal
  const handleCardClick = useCallback((period: '30' | '60' | '90') => {
    setSelectedPeriod(period);
  }, []);

  // Handle PDF export
  const handlePdfExport = useCallback(async () => {
    if (!data) {
      toast.error('Não existem dados de previsão para exportar');
      return;
    }

    try {
      setIsExporting(true);
      const startDate = new Date().toLocaleDateString('pt-PT');
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT');

      await generateForecastPDF(data, propertyName, startDate, endDate);
      toast.success('PDF descarregado com sucesso');
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      toast.error('Falha ao gerar o PDF');
    } finally {
      setIsExporting(false);
    }
  }, [data, propertyName]);

  // Handle CSV export
  const handleCsvExport = useCallback(() => {
    if (!data) {
      toast.error('Não existem dados de previsão para exportar');
      return;
    }

    try {
      const startDate = new Date().toLocaleDateString('pt-PT');
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT');

      generateForecastCSV(data, propertyName, startDate, endDate);
      toast.success('CSV descarregado com sucesso');
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
      toast.error('Falha ao gerar o CSV');
    }
  }, [data, propertyName]);

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Previsão de receitas
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Análise da receita prevista para {propertyName}
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={handlePdfExport}
            disabled={!data || isLoading || isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            aria-label="Descarregar relatório em PDF"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Descarregar PDF</span>
          </button>

          <button
            onClick={handleCsvExport}
            disabled={!data || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            aria-label="Descarregar exportação em CSV"
          >
            <FileJson className="w-4 h-4" />
            <span className="text-sm font-medium">Descarregar CSV</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-8">
        {/* Forecast Cards */}
        <section aria-labelledby="forecast-heading">
          <h2 id="forecast-heading" className="sr-only">
            Cartões de previsão
          </h2>
          <ForecastCards
            data={data}
            isLoading={isLoading}
            error={error}
            onCardClick={handleCardClick}
            onRefresh={refresh}
          />
        </section>

        {/* Chart */}
        {data && !isLoading && (
          <section aria-labelledby="chart-heading">
            <h2 id="chart-heading" className="sr-only">
              Gráfico da previsão de receitas
            </h2>
            <ForecastChart data={data} period={selectedPeriod || '90'} />
          </section>
        )}

        {/* Statistics */}
        {data && !isLoading && (
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="sr-only">
              Estatísticas principais
            </h2>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Estatísticas principais
              </h3>
              <StatisticsCards data={data} />
            </div>
          </section>
        )}
      </div>

      {/* Details Modal */}
      <ForecastDetailsModal
        isOpen={selectedPeriod !== null}
        onClose={handleCloseModal}
        forecast={selectedForecast || null}
        data={data}
        period={selectedPeriod || '30'}
      />
    </div>
  );
}
