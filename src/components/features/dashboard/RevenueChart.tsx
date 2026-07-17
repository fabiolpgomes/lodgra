'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ChartOptions } from 'chart.js'
import { getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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
  const formatAxisValue = (value: number | string) => {
    const amount = Number(value)
    if (!Number.isFinite(amount)) return `${currencySymbol}${value}`
    if (amount >= 1000) return `${currencySymbol} ${(amount / 1000).toFixed(0)}k`
    return `${currencySymbol} ${amount.toFixed(0)}`
  }

  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: `Receita (${currencySymbol})`,
        data: data.map(d => d.revenue),
        backgroundColor: '#C9A227',
        borderColor: '#C9A227',
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.52,
        categoryPercentage: 0.72,
        maxBarThickness: 88,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
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
        displayColors: false,
        backgroundColor: '#FBFAF6',
        borderColor: 'rgba(16, 32, 62, 0.10)',
        borderWidth: 1,
        titleColor: '#4D5566',
        bodyColor: '#10203E',
        titleFont: {
          size: 13,
          weight: 'bold',
        },
        bodyFont: {
          size: 17,
          weight: 'bold',
        },
        padding: 12,
        caretSize: 0,
        callbacks: {
          label: function(context) {
            const value = (context.parsed.y ?? 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
            return `${currencySymbol} ${value}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#64748B',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
      },
      y: {
        beginAtZero: true,
        border: {
          display: false,
        },
        grid: {
          color: 'rgba(16, 32, 62, 0.08)',
        },
        ticks: {
          color: '#64748B',
          maxTicksLimit: 5,
          font: {
            size: 12,
            weight: 'bold',
          },
          callback: function(value: number | string) {
            return formatAxisValue(value)
          },
        },
      },
    },
  }

  return (
    <div className="h-48 sm:h-64 lg:h-80">
      <Bar data={chartData} options={options} />
    </div>
  )
}
