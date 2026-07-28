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
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '350px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#1b2430' }}>
          Seletor de Mês/Ano
        </h3>

        {/* Ano seletor */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={() => handleYearChange(-1)}
            disabled={selectedYear <= minYear}
            style={{
              background: selectedYear <= minYear ? '#ccc' : '#ffffff',
              border: '1px solid #efeadf',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              cursor: selectedYear <= minYear ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '700',
            }}
          >
            ←
          </button>
          <span style={{ fontSize: '18px', fontWeight: '700', minWidth: '60px', textAlign: 'center', color: '#1b2430' }}>
            {selectedYear}
          </span>
          <button
            onClick={() => handleYearChange(1)}
            disabled={selectedYear >= maxYear}
            style={{
              background: selectedYear >= maxYear ? '#ccc' : '#ffffff',
              border: '1px solid #efeadf',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              cursor: selectedYear >= maxYear ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '700',
            }}
          >
            →
          </button>
        </div>

        {/* Grid de meses 4x3 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '20px',
        }}>
          {MONTHS.map((month, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              style={{
                padding: '10px 8px',
                background: index === selectedMonth ? '#2196f3' : '#f7f5ef',
                border: index === selectedMonth ? '2px solid #1b2430' : '1px solid #efeadf',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: index === selectedMonth ? '#ffffff' : '#1b2430',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (index !== selectedMonth) {
                  (e.target as HTMLButtonElement).style.background = '#efefef'
                }
              }}
              onMouseLeave={(e) => {
                if (index !== selectedMonth) {
                  (e.target as HTMLButtonElement).style.background = '#f7f5ef'
                }
              }}
            >
              {month.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#f7f5ef',
              border: '1px solid #efeadf',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1b2430',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#efefef'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#f7f5ef'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSelect(selectedMonth)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#1b2430',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#0c1830'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#1b2430'
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
