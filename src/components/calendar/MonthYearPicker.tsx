'use client'
import { useState } from 'react'

interface MonthYearPickerProps {
  currentDate: Date
  onSelect: (date: Date) => void
  onCancel: () => void
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function MonthYearPicker({ currentDate, onSelect, onCancel }: MonthYearPickerProps) {
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth())

  const minYear = 2024
  const maxYear = 2028

  const handleYearChange = (offset: number) => {
    const newYear = selectedYear + offset
    if (newYear >= minYear && newYear <= maxYear) {
      setSelectedYear(newYear)
    }
  }

  const handleSelect = (monthIndex: number) => {
    const date = new Date(Date.UTC(selectedYear, monthIndex, 1))
    onSelect(date)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          maxHeight: '82vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1b2430' }}>
          Escolha Mês e Ano
        </h3>

        {/* Ano seletor - mais compacto */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '16px', padding: '0 4px' }}>
          <button
            onClick={() => handleYearChange(-1)}
            disabled={selectedYear <= minYear}
            style={{
              background: selectedYear <= minYear ? '#e0e0e0' : '#f0f0f0',
              border: '1px solid #d0d0d0',
              borderRadius: '9999px',
              width: '40px',
              height: '40px',
              cursor: selectedYear <= minYear ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              padding: 0,
            }}
          >
            ←
          </button>
          <span style={{ fontSize: '17px', fontWeight: '700', minWidth: '64px', textAlign: 'center', color: '#1b2430' }}>
            {selectedYear}
          </span>
          <button
            onClick={() => handleYearChange(1)}
            disabled={selectedYear >= maxYear}
            style={{
              background: selectedYear >= maxYear ? '#e0e0e0' : '#f0f0f0',
              border: '1px solid #d0d0d0',
              borderRadius: '9999px',
              width: '40px',
              height: '40px',
              cursor: selectedYear >= maxYear ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              padding: 0,
            }}
          >
            →
          </button>
        </div>

        {/* Grid de meses 3x4 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}>
          {MONTHS.map((month, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              style={{
                minHeight: '48px',
                padding: '10px 8px',
                background: index === selectedMonth ? '#10203E' : '#f5f5f5',
                border: index === selectedMonth ? '2px solid #10203E' : '1px solid #d0d0d0',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                color: index === selectedMonth ? '#ffffff' : '#333',
                cursor: 'pointer',
                transition: 'all 0.15s',
                lineHeight: '1.2',
              }}
              onMouseEnter={(e) => {
                if (index !== selectedMonth) {
                  (e.target as HTMLButtonElement).style.background = '#e8e8e8'
                }
              }}
              onMouseLeave={(e) => {
                if (index !== selectedMonth) {
                  (e.target as HTMLButtonElement).style.background = '#f5f5f5'
                }
              }}
            >
              {month.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '10px 12px',
              background: '#f0f0f0',
              border: '1px solid #d0d0d0',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#333',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#e0e0e0'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#f0f0f0'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSelect(selectedMonth)}
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '10px 12px',
              background: '#10203E',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#0c1830'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#10203E'
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
