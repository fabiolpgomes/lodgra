'use client';

import React from 'react';

interface StatisticCardProps {
  label: string;
  value: string;
  unit?: string;
  explanation?: string;
  icon?: React.ReactNode;
  helpText?: string;
}

export function StatisticCard({
  label,
  value,
  unit,
  explanation,
  icon,
  helpText,
}: StatisticCardProps) {
  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow"
      role="region"
      aria-label={label}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
          {explanation && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{explanation}</p>
          )}
        </div>
        {icon && <div className="text-lg text-slate-400 dark:text-slate-500">{icon}</div>}
      </div>

      <div className="mb-3">
        <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          {value}
          {unit && <span className="text-lg md:text-xl text-slate-600 dark:text-slate-400 ml-1">{unit}</span>}
        </p>
      </div>

      {helpText && (
        <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
          {helpText}
        </p>
      )}
    </div>
  );
}
