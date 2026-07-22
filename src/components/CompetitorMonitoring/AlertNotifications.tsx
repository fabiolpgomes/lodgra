'use client';

import React from 'react';
import { CompetitorPriceAlert } from '@/types/competitor';
import { TrendingUp, TrendingDown, X } from 'lucide-react';

interface AlertNotificationsProps {
  alerts: CompetitorPriceAlert[];
}

export function AlertNotifications({ alerts }: AlertNotificationsProps) {
  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Recent Price Alerts
      </h3>

      {recentAlerts.length > 0 ? (
        <div className="space-y-3">
          {recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                alert.alertType === 'increase'
                  ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                  : 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {alert.alertType === 'increase' ? (
                  <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      alert.alertType === 'increase'
                        ? 'text-red-900 dark:text-red-100'
                        : 'text-green-900 dark:text-green-100'
                    }`}
                  >
                    {alert.alertType === 'increase' ? 'Price Increase' : 'Price Decrease'}
                  </p>
                  <p
                    className={`text-sm ${
                      alert.alertType === 'increase'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-green-700 dark:text-green-300'
                    }`}
                  >
                    €{alert.previousPrice.toFixed(2)} → €{alert.newPrice.toFixed(2)} (
                    {alert.percentageChange > 0 ? '+' : ''}
                    {alert.percentageChange.toFixed(1)}%)
                  </p>
                </div>
              </div>
              <button
                className={`p-1 hover:bg-opacity-50 rounded transition-colors ${
                  alert.alertType === 'increase'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-600 dark:text-slate-400">No recent price changes</p>
      )}

      {alerts.length > 5 && (
        <button className="mt-4 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
          View all alerts
        </button>
      )}
    </div>
  );
}
