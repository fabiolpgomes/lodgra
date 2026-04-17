'use client'

import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
)

interface StatusChartProps {
  confirmed: number
  pending: number
  cancelled: number
}

export function StatusChart({ confirmed, pending, cancelled }: StatusChartProps) {
  const chartData = {
    labels: ['Confirmadas', 'Pendentes', 'Canceladas'],
    datasets: [
      {
        data: [confirmed, pending, cancelled],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 146, 60)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
        },
      },
    },
  }

  return (
    <div className="h-48 sm:h-64 lg:h-80">
      <Doughnut data={chartData} options={options} />
    </div>
  )
}
