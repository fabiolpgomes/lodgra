'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ChartOptions } from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
)

interface OccupancyChartProps {
  data: {
    month: string
    occupancy: number
  }[]
}

export function OccupancyChart({ data }: OccupancyChartProps) {
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Taxa de Ocupação (%)',
        data: data.map(d => d.occupancy),
        fill: true,
        backgroundColor: 'rgba(27, 36, 48, 0.10)',
        borderColor: '#10203E',
        borderWidth: 4,
        tension: 0.42,
        pointBackgroundColor: '#FBFAF6',
        pointBorderColor: '#10203E',
        pointBorderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#FBFAF6',
        pointHoverBorderColor: '#10203E',
        pointHoverBorderWidth: 4,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
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
        enabled: true,
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
          size: 18,
          weight: 'bold',
        },
        padding: 14,
        caretSize: 0,
        callbacks: {
          title: function(items) {
            const item = items[0]
            return item ? item.label.toUpperCase() : ''
          },
          label: function(context) {
            return `${context.parsed.y ?? 0}% de Ocupação`
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
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
        max: 100,
        border: {
          display: false,
        },
        grid: {
          color: 'rgba(16, 32, 62, 0.08)',
        },
        ticks: {
          stepSize: 25,
          color: '#64748B',
          font: {
            size: 12,
            weight: 'bold',
          },
          callback: function(value: number | string) {
            return value + '%'
          },
        },
      },
    },
  }

  return (
    <div className="h-56 sm:h-72 lg:h-80">
      <Line data={chartData} options={options} />
    </div>
  )
}
