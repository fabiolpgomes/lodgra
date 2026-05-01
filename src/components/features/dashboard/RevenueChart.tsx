'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface RevenueChartProps {
  data: {
    month: string
    revenue: number
  }[]
  currency?: string
}

export function RevenueChart({ data, currency = 'EUR' }: RevenueChartProps) {
  const currencySymbol = getCurrencySymbol(currency as CurrencyCode)
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: `Receita (${currencySymbol})`,
        data: data.map(d => d.revenue),
        fill: true,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: import('chart.js').TooltipItem<'line'>) {
            return currencySymbol + ((context.parsed.y as number | null) ?? 0).toFixed(2)
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: number | string) {
            return currencySymbol + value
          },
        },
      },
    },
  }

  return (
    <div className="h-48 sm:h-64 lg:h-80">
      <Line data={chartData} options={options} />
    </div>
  )
}
