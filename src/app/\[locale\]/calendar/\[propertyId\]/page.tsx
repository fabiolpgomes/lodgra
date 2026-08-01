'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'

/**
 * Epic 43 - Mobile-First Calendar Page
 * Fully responsive, touch-friendly, functional
 */
export default function CalendarPage({
  params,
}: {
  params: Promise<{ propertyId: string; locale: string }>
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [inputPrice, setInputPrice] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<'prices' | 'discounts' | 'availability'>('prices')

  // Calculate days
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  const formatDate = (day: number) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const handleDayClick = (day: number) => {
    const dateStr = formatDate(day)
    setSelectedDate(dateStr)
    setInputPrice(prices[dateStr]?.toString() || '')
    setShowModal(true)
  }

  const handleSavePrice = () => {
    if (inputPrice && selectedDate) {
      const price = parseFloat(inputPrice)
      if (price > 0) {
        setPrices({ ...prices, [selectedDate]: price })
        setShowModal(false)
        setSelectedDate(null)
      }
    }
  }

  const handleBlockDate = () => {
    if (selectedDate) {
      const newBlocked = new Set(blockedDates)
      if (newBlocked.has(selectedDate)) {
        newBlocked.delete(selectedDate)
      } else {
        newBlocked.add(selectedDate)
      }
      setBlockedDates(newBlocked)
      setShowModal(false)
      setSelectedDate(null)
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Render calendar days
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between p-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Calendário</h1>
            <p className="text-xs text-gray-600">{monthNames[currentMonth]} {currentYear}</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="flex-1 overflow-auto px-3 py-3">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-lg p-3">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold text-gray-900 text-sm">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg p-2 shadow-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-gray-600 text-xs py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const dateStr = day ? formatDate(day) : null
              const isBlocked = dateStr && blockedDates.has(dateStr)
              const hasPrice = dateStr && prices[dateStr]
              const price = dateStr ? prices[dateStr] : null

              return (
                <div key={index}>
                  {day === null ? (
                    <div className="aspect-square bg-gray-50 rounded"></div>
                  ) : (
                    <button
                      onClick={() => handleDayClick(day)}
                      className={`
                        w-full aspect-square rounded font-semibold transition-all
                        flex flex-col items-center justify-center text-xs
                        ${
                          isBlocked
                            ? 'bg-red-500 text-white'
                            : hasPrice
                              ? 'bg-green-500 text-white'
                              : 'bg-blue-100 text-gray-900 hover:bg-blue-200'
                        }
                      `}
                    >
                      <div>{day}</div>
                      {price && <div className="text-xs mt-0.5">R${price}</div>}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Settings Bottom Sheet */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl max-h-[80vh] overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Configurações</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {['prices', 'discounts', 'availability'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`
                    flex-1 py-3 text-xs font-semibold transition-all
                    ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600'}
                  `}
                >
                  {tab === 'prices' && '💰'}
                  {tab === 'discounts' && '📊'}
                  {tab === 'availability' && '📅'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {activeTab === 'prices' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Preço Base (R$)
                    </label>
                    <input
                      type="number"
                      placeholder="150"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">
                    Preencher Calendário
                  </button>
                </>
              )}

              {activeTab === 'discounts' && (
                <>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <label className="text-sm font-semibold text-gray-900">Desconto Semanal (7-27 noites)</label>
                    <input
                      type="number"
                      placeholder="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                    <p className="text-xs text-gray-600 mt-1">Economia: R$70</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <label className="text-sm font-semibold text-gray-900">Desconto Mensal (28+ noites)</label>
                    <input
                      type="number"
                      placeholder="20"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                    <p className="text-xs text-gray-600 mt-1">Economia: R$140</p>
                  </div>
                </>
              )}

              {activeTab === 'availability' && (
                <>
                  <div>
                    <label className="text-sm font-semibold text-gray-900">Mínimo de noites</label>
                    <input
                      type="number"
                      placeholder="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-900">Máximo de noites</label>
                    <input
                      type="number"
                      placeholder="30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {blockedDates.has(selectedDate) ? '🔒 Bloqueada' : '💰 Preço'}
            </h3>

            {!blockedDates.has(selectedDate) ? (
              <>
                <input
                  type="number"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  placeholder="Digite o preço"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSavePrice}
                    disabled={!inputPrice}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
                  >
                    Salvar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={handleBlockDate}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg"
                  >
                    Desbloquear
                  </button>
                </div>
              </>
            )}

            {!blockedDates.has(selectedDate) && (
              <button
                onClick={handleBlockDate}
                className="w-full mt-2 px-4 py-2 text-red-600 border border-red-300 rounded-lg font-semibold"
              >
                🔒 Bloquear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
