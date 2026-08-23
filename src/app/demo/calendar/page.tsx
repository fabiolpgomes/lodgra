'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

/**
 * DEMO PAGE - Epic 43 Calendar (100% Standalone - No Auth)
 * Fully functional preview without login
 * All data stored in browser memory (demo only)
 */
export default function DemoCalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [inputPrice, setInputPrice] = useState('')
  const [activeTab, setActiveTab] = useState<'prices' | 'discounts' | 'availability' | 'cancellations' | 'taxes'>('prices')

  // Calculate days in month
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

  // Format date as YYYY-MM-DD
  const formatDate = (day: number) => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Handle day click
  const handleDayClick = (day: number) => {
    const dateStr = formatDate(day)
    setSelectedDate(dateStr)
    setInputPrice(prices[dateStr]?.toString() || '')
    setShowModal(true)
  }

  // Save price
  const handleSavePrice = () => {
    if (inputPrice && selectedDate) {
      const price = parseFloat(inputPrice)
      if (price > 0) {
        setPrices({ ...prices, [selectedDate]: price })
        setShowModal(false)
        setSelectedDate(null)
        alert(`✅ Preço salvo: ${formatCurrency(price)}`)
      }
    }
  }

  // Toggle block date
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

  // Previous month
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  // Next month
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
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold">📅 Epic 43 - Calendar Preview</h1>
        <p className="text-blue-100 mt-2">Clique em um dia para definir preço, bloquear ou ajustar configurações</p>
        <p className="text-blue-200 text-sm mt-2">✨ Sem login necessário • Tudo funciona offline</p>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CALENDAR */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
                <div key={day} className="text-center font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dateStr = day ? formatDate(day) : null
                const isBlocked = dateStr && blockedDates.has(dateStr)
                const hasPrice = dateStr && prices[dateStr]
                const price = dateStr ? prices[dateStr] : null

                return (
                  <div key={index}>
                    {day === null ? (
                      <div className="aspect-square bg-gray-50 rounded-lg"></div>
                    ) : (
                      <button
                        onClick={() => handleDayClick(day)}
                        className={`
                          w-full aspect-square rounded-lg font-semibold transition-all duration-200
                          flex flex-col items-center justify-center text-sm
                          ${
                            isBlocked
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : hasPrice
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-blue-100 text-gray-900 hover:bg-blue-200'
                          }
                        `}
                      >
                        <div>{day}</div>
                        {price && <div className="text-xs mt-1">{formatCurrency(price)}</div>}
                        {isBlocked && <div className="text-xs">🔒</div>}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-200 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-100"></div>
                <span>Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span>Com preço</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span>Bloqueado</span>
              </div>
            </div>
          </div>

          {/* SETTINGS SIDEBAR */}
          <div className="lg:col-span-1 space-y-4">
            {/* Settings Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                {['prices', 'discounts', 'availability', 'cancellations', 'taxes'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`
                      flex-1 py-3 text-xs font-semibold transition-all
                      ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}
                    `}
                  >
                    {tab === 'prices' && '💰'}
                    {tab === 'discounts' && '📊'}
                    {tab === 'availability' && '📅'}
                    {tab === 'cancellations' && '🔄'}
                    {tab === 'taxes' && '💳'}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'prices' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-1">
                        Preço Base
                      </label>
                      <input
                        type="number"
                        placeholder="150"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                      Preencher Calendário
                    </button>
                  </div>
                )}

                {activeTab === 'discounts' && (
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-semibold text-gray-900">Desconto Semanal (7-27 noites)</label>
                      <input
                        type="number"
                        placeholder="10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-600 mt-1">Economia: {formatCurrency(70)}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <label className="text-sm font-semibold text-gray-900">Desconto Mensal (28+ noites)</label>
                      <input
                        type="number"
                        placeholder="20"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-xs text-gray-600 mt-1">Economia: {formatCurrency(140)}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <label className="text-sm font-semibold text-gray-900">Desconto Fidelidade</label>
                      <input
                        type="number"
                        placeholder="5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'availability' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-900">Mínimo de noites</label>
                      <input
                        type="number"
                        placeholder="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-900">Máximo de noites</label>
                      <input
                        type="number"
                        placeholder="30"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="rounded w-4 h-4" />
                      <span>Permitir reservas em última hora</span>
                    </label>
                  </div>
                )}

                {activeTab === 'cancellations' && (
                  <div className="space-y-3">
                    <div className="bg-red-50 p-3 rounded-lg cursor-pointer hover:bg-red-100 transition">
                      <p className="font-semibold text-gray-900">Política Rígida</p>
                      <p className="text-xs text-gray-600">Sem reembolso</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg cursor-pointer hover:bg-yellow-100 transition">
                      <p className="font-semibold text-gray-900">Política Moderada</p>
                      <p className="text-xs text-gray-600">Reembolso parcial</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg cursor-pointer hover:bg-green-100 transition">
                      <p className="font-semibold text-gray-900">Política Flexível</p>
                      <p className="text-xs text-gray-600">Reembolso total</p>
                    </div>
                  </div>
                )}

                {activeTab === 'taxes' && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">Limpeza</p>
                        <p className="text-xs text-gray-600">{formatCurrency(50)}</p>
                      </div>
                      <button className="text-red-600 text-sm hover:text-red-800">✕</button>
                    </div>
                    <button className="w-full border border-dashed border-gray-300 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                      + Adicionar taxa
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
              <p className="font-semibold text-blue-900">💡 Dica:</p>
              <p className="text-blue-800 text-xs mt-1">Todos os dados salvos no navegador (não sincronizam com servidor)</p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {blockedDates.has(selectedDate) ? '🔒 Data Bloqueada' : '💰 Definir Preço'}
            </h3>

            {!blockedDates.has(selectedDate) ? (
              <>
                <input
                  type="number"
                  value={inputPrice}
                  onChange={(e) => setInputPrice(e.target.value)}
                  placeholder="Digite o preço"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSavePrice}
                    disabled={!inputPrice}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    Salvar Preço
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">Esta data está bloqueada.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBlockDate}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                  >
                    Desbloquear
                  </button>
                </div>
              </>
            )}

            {!blockedDates.has(selectedDate) && (
              <button
                onClick={handleBlockDate}
                className="w-full mt-3 px-4 py-2 text-red-600 border border-red-300 rounded-lg font-semibold hover:bg-red-50"
              >
                🔒 Bloquear esta data
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
