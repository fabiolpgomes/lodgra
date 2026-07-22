'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { ForecastingAPIResponse } from '@/types/forecasting';

interface ForecastChartProps {
  data: ForecastingAPIResponse;
  period?: '30' | '60' | '90';
}

export function ForecastChart({ data, period = '90' }: ForecastChartProps) {
  // Filter data based on period
  const chartData = useMemo(() => {
    const daysToShow = parseInt(period) || 90;
    return data.chartData.slice(0, daysToShow);
  }, [data.chartData, period]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{data.date}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Forecast: €{data.projected.toFixed(2)}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Range: €{data.lower.toFixed(2)} - €{data.upper.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-96 md:h-96 bg-white dark:bg-slate-900 rounded-lg p-4 md:p-6 border border-slate-200 dark:border-slate-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Revenue Forecast Chart ({period} days)
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Solid line shows forecast, shaded area shows confidence interval
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#93c5fd" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            className="dark:stroke-slate-700"
          />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            className="dark:stroke-slate-600"
            tick={{ fontSize: 12 }}
            interval={Math.max(0, Math.floor(chartData.length / 7))}
          />
          <YAxis
            stroke="#6b7280"
            className="dark:stroke-slate-600"
            tick={{ fontSize: 12 }}
            label={{ value: 'EUR', angle: -90, position: 'insideLeft' }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="upper"
            stackId="1"
            stroke="none"
            fill="url(#colorConfidence)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="lower"
            stackId="1"
            stroke="none"
            fill="#ffffff"
            className="dark:fill-slate-900"
            isAnimationActive={false}
          />

          {/* Main forecast line */}
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
            name="Forecast"
          />

          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ paddingTop: '20px' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
