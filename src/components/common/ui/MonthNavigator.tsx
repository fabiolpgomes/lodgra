'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { MonthYearPicker } from '@/components/calendar/MonthYearPicker'

interface MonthNavigatorProps {
  currentMonth: string // 'YYYY-MM'
}

export function MonthNavigator({ currentMonth }: MonthNavigatorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showPicker, setShowPicker] = useState(false)

  const [year, month] = currentMonth.split('-').map(Number)
  const currentDate = new Date(year, month - 1, 1)
  const label = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  function navigate(direction: -1 | 1) {
    const newDate = new Date(year, month - 1 + direction, 1)
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', newMonth)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  function handlePickerSelect(selectedDate: Date) {
    const selectedYear = selectedDate.getFullYear()
    const selectedMonth = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const newMonth = `${selectedYear}-${selectedMonth}`
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', newMonth)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
    setShowPicker(false)
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setShowPicker(true)}
          className="text-sm font-semibold text-gray-700 capitalize min-w-[150px] text-center cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
        >
          {label}
        </button>
        <Button variant="ghost" size="sm" onClick={() => navigate(1)} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {showPicker && (
        <MonthYearPicker
          currentDate={currentDate}
          onSelect={handlePickerSelect}
          onCancel={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
