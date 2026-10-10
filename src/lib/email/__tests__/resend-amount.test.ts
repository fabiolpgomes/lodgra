jest.mock('resend', () => ({ Resend: jest.fn() }))

import { formatEmailAmount } from '../resend'

describe('formatEmailAmount', () => {
  it('formata em reais', () => {
    expect(formatEmailAmount('4590', 'BRL').replace(/\s/g, ' ')).toBe('R$ 4.590,00')
  })

  it('formata em euros', () => {
    expect(formatEmailAmount('1622.74', 'EUR')).toContain('€')
    expect(formatEmailAmount('1622.74', 'EUR')).toMatch(/1\D?622,74/)
  })

  it('aceita moeda em minúsculas', () => {
    expect(formatEmailAmount('100', 'brl')).toContain('R$')
  })

  it('sem moeda devolve o valor como veio', () => {
    expect(formatEmailAmount('4590')).toBe('4590')
  })

  it('valor inválido não quebra o email', () => {
    expect(formatEmailAmount('abc', 'BRL')).toBe('abc BRL')
  })
})
