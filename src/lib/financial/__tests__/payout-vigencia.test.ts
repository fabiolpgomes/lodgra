import { staleVigenciaMessage } from '../payout-vigencia'

describe('staleVigenciaMessage', () => {
  it('data igual a hoje: sem erro', () => {
    expect(staleVigenciaMessage('2026-10-10', '2026-10-10')).toBeNull()
  })

  it('o dia mudou desde que o formulário abriu: mensagem clara com a data de hoje em DD/MM/AAAA', () => {
    expect(staleVigenciaMessage('2026-10-09', '2026-10-10')).toBe(
      'O dia mudou desde que abriu o formulário. Recarregue a página para usar a data de hoje (10/10/2026).',
    )
  })
})
