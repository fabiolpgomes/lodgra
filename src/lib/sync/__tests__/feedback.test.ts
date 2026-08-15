import { getSyncFeedback } from '@/lib/sync/feedback'

describe('getSyncFeedback', () => {
  it('não apresenta zero como certeza quando os contadores antigos são desconhecidos', () => {
    const feedback = getSyncFeedback({ status: 'success', platformName: 'Booking.com' })

    expect(feedback.title).toBe('Calendário verificado')
    expect(feedback.severity).toBe('info')
    expect(feedback.detail).toContain('detalhes')
  })

  it('explica quando o feed respondeu sem trazer alterações', () => {
    const feedback = getSyncFeedback({
      status: 'success',
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      platformName: 'Airbnb',
    })

    expect(feedback.title).toBe('Tudo certo, sem novas reservas')
    expect(feedback.detail).toContain('Airbnb')
    expect(feedback.action).toBeNull()
  })

  it('mantém o estado informativo quando somente o contador de falhas é desconhecido', () => {
    const feedback = getSyncFeedback({
      status: 'success',
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: null,
    })

    expect(feedback.title).toBe('Calendário verificado')
    expect(feedback.severity).toBe('info')
  })

  it('transforma erro 400 em uma orientação específica para o canal', () => {
    const feedback = getSyncFeedback({
      status: 'failed',
      errorMessage: 'Failed to fetch iCal: 400 Bad Request',
      platformName: 'Booking.com',
    })

    expect(feedback.title).toBe('O link do calendário não funciona mais')
    expect(feedback.detail).toContain('Booking.com')
    expect(feedback.action).toContain('Copie um novo link')
  })

  it('orienta aguardar e só substituir o URL quando um timeout persistir', () => {
    const feedback = getSyncFeedback({
      status: 'failed',
      errorMessage: 'Request timed out',
      platformName: 'Airbnb',
    })

    expect(feedback.severity).toBe('warning')
    expect(feedback.action).toContain('próxima atualização')
  })
})
