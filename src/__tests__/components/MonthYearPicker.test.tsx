/**
 * O seletor entrega a data em hora local: quem o usa lê getFullYear()/getMonth().
 * Regressão: em UTC, fusos a oeste (São Paulo) recuavam um mês (abril → março).
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { MonthYearPicker } from '@/components/calendar/MonthYearPicker'

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

describe('MonthYearPicker', () => {
  it.each(MONTH_LABELS.map((label, index) => [label, index] as const))(
    'escolher %s devolve esse mês, em qualquer fuso',
    (label, index) => {
      const onSelect = jest.fn()
      render(<MonthYearPicker currentDate={new Date(2027, 0, 1)} onSelect={onSelect} onCancel={jest.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: label }))

      expect(onSelect).toHaveBeenCalledTimes(1)
      const picked: Date = onSelect.mock.calls[0][0]
      expect(picked.getFullYear()).toBe(2027)
      expect(picked.getMonth()).toBe(index)
      expect(picked.getDate()).toBe(1)
    },
  )

  it('respeita o ano escolhido', () => {
    const onSelect = jest.fn()
    render(<MonthYearPicker currentDate={new Date(2027, 3, 1)} onSelect={onSelect} onCancel={jest.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '→' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mai' }))

    const picked: Date = onSelect.mock.calls[0][0]
    expect([picked.getFullYear(), picked.getMonth()]).toEqual([2028, 4])
  })
})
