'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Analytics {
  period_days: number;
  summary: {
    total_sent: number;
    successful: number;
    failed: number;
    bounced: number;
    read: number;
    delivery_rate: number;
    read_rate: number;
  };
  by_message_type: Record<string, { total: number; successful: number; failed: number }>;
  by_recipient_type: Record<string, { total: number; successful: number; failed: number }>;
  trend: Array<{
    date: string;
    sent: number;
    successful: number;
    failed: number;
  }>;
}

export default function WhatsAppAnalyticsDashboard() {
  const t = useTranslations('whatsapp.analytics');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/whatsapp/analytics?days=${days}`);
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const data = await res.json();
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [days]);

  if (loading) {
    return <div className="text-center py-12">{t('loading')}</div>;
  }

  if (!analytics) {
    return <div className="text-center py-12 text-red-600">{t('error')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-4 py-2 border rounded-lg"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label={t('total_sent')}
          value={analytics.summary.total_sent}
          icon="📤"
        />
        <SummaryCard
          label={t('successful')}
          value={analytics.summary.successful}
          color="green"
          icon="✅"
        />
        <SummaryCard
          label={t('delivery_rate')}
          value={`${analytics.summary.delivery_rate}%`}
          color="blue"
          icon="📊"
        />
        <SummaryCard
          label={t('read_rate')}
          value={`${analytics.summary.read_rate}%`}
          color="purple"
          icon="👁️"
        />
      </div>

      {/* Message Type Breakdown */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">{t('by_message_type')}</h2>
        <div className="space-y-3">
          {Object.entries(analytics.by_message_type).map(([type, data]) => (
            <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium capitalize">{type}</span>
              <div className="text-sm text-gray-600">
                {data.total} sent • {data.successful} successful
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recipient Type Breakdown */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">{t('by_recipient_type')}</h2>
        <div className="space-y-3">
          {Object.entries(analytics.by_recipient_type).map(([type, data]) => (
            <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium capitalize">{type}</span>
              <div className="text-sm text-gray-600">
                {data.total} sent • {data.successful} successful
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trend Chart (Simple Bar Chart) */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">{t('trend')}</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {analytics.trend.map((day) => (
            <div key={day.date} className="flex items-center gap-4">
              <span className="w-24 text-sm">{day.date}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded relative">
                <div
                  className="h-full bg-green-500 rounded"
                  style={{
                    width: `${(day.successful / Math.max(...analytics.trend.map((d) => d.sent))) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium">{day.successful}/{day.sent}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error Summary */}
      {analytics.summary.failed > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">{t('errors')}</h3>
          <p className="text-red-700">
            {analytics.summary.failed} failed messages • {analytics.summary.bounced} bounced
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = 'gray',
  icon = '📊',
}: {
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'purple' | 'gray';
  icon?: string;
}) {
  const colors = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    gray: 'bg-gray-50 border-gray-200',
  };

  return (
    <div className={`${colors[color]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
