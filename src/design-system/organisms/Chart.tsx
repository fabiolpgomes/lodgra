'use client'

import React from 'react'

export interface ChartData {
  label: string
  value: number
  color?: string
}

export interface BarChartProps {
  data: ChartData[]
  height?: number
  showGrid?: boolean
  showValues?: boolean
}

export function BarChart({
  data,
  height = 300,
  showGrid = true,
  showValues = true,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value))
  const padding = 40
  const chartWidth = 600
  const chartHeight = height
  const barWidth = (chartWidth - padding * 2) / data.length
  const barGap = barWidth * 0.1

  return (
    <div className="w-full bg-white rounded-sm border border-be-border/10 p-6">
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="mx-auto"
      >
        {/* Grid */}
        {showGrid && (
          <g stroke="currentColor" strokeOpacity="0.1" className="text-be-text">
            {[0, 25, 50, 75, 100].map((percent) => {
              const y = chartHeight - padding - (chartHeight - padding * 2) * (percent / 100)
              return <line key={`grid-${percent}`} x1={padding} y1={y} x2={chartWidth - padding} y2={y} />
            })}
          </g>
        )}

        {/* Bars */}
        {data.map((item, idx) => {
          const barHeight = ((item.value / maxValue) * (chartHeight - padding * 2))
          const x = padding + idx * barWidth + barGap / 2
          const y = chartHeight - padding - barHeight

          return (
            <g key={idx}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth - barGap}
                height={barHeight}
                fill={item.color || '#1E3A8A'}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />

              {/* Value on top */}
              {showValues && (
                <text
                  x={x + (barWidth - barGap) / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-design-xs fill-lodgra-primary font-bold"
                >
                  {item.value}
                </text>
              )}

              {/* Label */}
              <text
                x={x + (barWidth - barGap) / 2}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                className="text-design-xs fill-lodgra-primary"
              >
                {item.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      {data.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color || '#1E3A8A' }}
              />
              <span className="text-design-sm text-be-text">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export interface PieChartProps {
  data: ChartData[]
  size?: 'sm' | 'md' | 'lg'
}

interface PieSlice {
  path: string
  label: string
  value: number
  color: string
  percentage: string
}

export function PieChart({ data, size = 'md' }: PieChartProps) {
  const sizeMap = { sm: 200, md: 300, lg: 400 }
  const diameter = sizeMap[size]
  const radius = diameter / 2 - 20
  const cx = diameter / 2
  const cy = diameter / 2

  const total = data.reduce((sum, item) => sum + item.value, 0)

  const slices: PieSlice[] = data.reduce<{ slices: PieSlice[]; angle: number }>(
    (acc, item) => {
      const currentAngle = acc.angle
      const sliceAngle = (item.value / total) * 2 * Math.PI
      const startAngle = currentAngle
      const endAngle = currentAngle + sliceAngle

      const x1 = cx + radius * Math.cos(startAngle)
      const y1 = cy + radius * Math.sin(startAngle)
      const x2 = cx + radius * Math.cos(endAngle)
      const y2 = cy + radius * Math.sin(endAngle)

      const largeArc = sliceAngle > Math.PI ? 1 : 0

      acc.slices.push({
        path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        label: item.label,
        value: item.value,
        color: item.color || '#1E3A8A',
        percentage: ((item.value / total) * 100).toFixed(1),
      })

      return { ...acc, angle: endAngle }
    },
    { slices: [], angle: -Math.PI / 2 }
  ).slices

  return (
    <div className="w-full bg-white rounded-sm border border-be-border/10 p-6">
      <svg width="100%" height={diameter} viewBox={`0 0 ${diameter} ${diameter}`} className="mx-auto">
        {slices.map((slice, idx) => (
          <path
            key={idx}
            d={slice.path}
            fill={slice.color}
            stroke="white"
            strokeWidth="2"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: slice.color }} />
            <span className="text-design-sm text-be-text">
              {slice.label} ({slice.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

BarChart.displayName = 'BarChart'
PieChart.displayName = 'PieChart'
