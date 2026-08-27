'use client';

import React from 'react';
import { StatisticCard } from './StatisticCard';
import { ForecastingAPIResponse } from '@/types/forecasting';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';

interface StatisticsCardsProps {
  data: ForecastingAPIResponse;
}

export function StatisticsCards({ data }: StatisticsCardsProps) {
  // Calcular ADR (tarifa média diária)
  const adr = data.assumptions.baseRevenue90Days
    ? data.assumptions.baseRevenue90Days / 90
    : 0;

  // Obter índice de confiança
  const confidencePercent = (data.forecasts.days30.confidenceScore * 100).toFixed(0);

  // Obter taxa de ocupação
  const occupancyRate = data.forecasts.days30.occupancyRateForecast
    ? (data.forecasts.days30.occupancyRateForecast * 100).toFixed(1)
    : '0.0';

  // Determinar a direção da tendência
  const trendValue = data.summary.trendsDescription;
  const isUpward =
    trendValue.toLowerCase().includes('upward') || trendValue.toLowerCase().includes('increase');
  const isDownward =
    trendValue.toLowerCase().includes('downward') || trendValue.toLowerCase().includes('decrease');

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <StatisticCard
          label="Tarifa média diária (ADR)"
          value={formatCurrency(adr)}
          explanation="Receita média prevista por noite"
          helpText="Com base nos dados históricos de reservas e nos ajustes sazonais"
        />

        <StatisticCard
          label="Índice de confiança"
          value={confidencePercent}
          unit="%"
          explanation={`${data.forecasts.days30.confidenceLevel.toUpperCase()}`}
          helpText={`Com base em ${data.assumptions.last90DaysBookings} reservas recentes`}
        />

        <StatisticCard
          label="Previsão de taxa de ocupação (30 dias)"
          value={occupancyRate}
          unit="%"
          explanation="Ocupação prevista para os próximos 30 dias"
          helpText="Pode variar consoante as condições de mercado"
        />

        <StatisticCard
          label="Indicador de tendência"
          value={isUpward ? '↑ Em subida' : isDownward ? '↓ Em descida' : '→ Estável'}
          icon={
            isUpward ? (
              <TrendingUp className="text-emerald-700 dark:text-emerald-400" />
            ) : isDownward ? (
              <TrendingDown className="text-red-600 dark:text-red-400" />
            ) : (
              <Minus className="text-slate-600 dark:text-slate-400" />
            )
          }
          explanation={data.summary.trendsDescription}
          helpText="Com base nos padrões históricos e sazonais"
        />
      </div>
    </div>
  );
}
