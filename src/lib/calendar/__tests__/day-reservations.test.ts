import { reservationsForDay } from '../day-reservations'

const joca = { id: 'a', startDate: new Date(2026, 9, 6), endDate: new Date(2026, 9, 7) }
const maria = { id: 'b', startDate: new Date(2026, 9, 7), endDate: new Date(2026, 9, 10) }

describe('reservationsForDay', () => {
  it('noite ocupada do check-in até à véspera do check-out', () => {
    expect(reservationsForDay([joca], new Date(2026, 9, 6))).toEqual({ staying: joca, departing: undefined })
  })

  it('dia de check-out fica livre e mostra só a saída', () => {
    expect(reservationsForDay([joca], new Date(2026, 9, 7))).toEqual({ staying: undefined, departing: joca })
  })

  it('saída e nova entrada no mesmo dia aparecem as duas', () => {
    expect(reservationsForDay([joca, maria], new Date(2026, 9, 7))).toEqual({ staying: maria, departing: joca })
  })

  it('dias fora da reserva não têm nada', () => {
    expect(reservationsForDay([joca], new Date(2026, 9, 8))).toEqual({ staying: undefined, departing: undefined })
  })
})
