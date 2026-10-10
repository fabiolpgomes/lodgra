import { formatBrPhone, formatCpfCnpj, isValidCnpj, isValidCpf, isValidCpfOrCnpj, onlyDigits } from '../cpf-cnpj'

describe('cpf-cnpj', () => {
  it('valida CPF com e sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('52998224725')).toBe(true)
    expect(isValidCpf('529.982.247-24')).toBe(false)
    expect(isValidCpf('111.111.111-11')).toBe(false)
    expect(isValidCpf('123')).toBe(false)
  })

  it('valida CNPJ', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false)
    expect(isValidCnpj('00000000000000')).toBe(false)
  })

  it('aceita CPF ou CNPJ', () => {
    expect(isValidCpfOrCnpj('52998224725')).toBe(true)
    expect(isValidCpfOrCnpj('11222333000181')).toBe(true)
    expect(isValidCpfOrCnpj('')).toBe(false)
  })

  it('formata progressivamente', () => {
    expect(formatCpfCnpj('52998224725')).toBe('529.982.247-25')
    expect(formatCpfCnpj('529')).toBe('529')
    expect(formatCpfCnpj('5299')).toBe('529.9')
    expect(formatCpfCnpj('11222333000181')).toBe('11.222.333/0001-81')
    expect(onlyDigits('529.982.247-25')).toBe('52998224725')
  })

  it('formata telefone brasileiro', () => {
    expect(formatBrPhone('11987654321')).toBe('(11) 98765-4321')
    expect(formatBrPhone('1133334444')).toBe('(11) 3333-4444')
    expect(formatBrPhone('11')).toBe('(11')
    expect(formatBrPhone('')).toBe('')
  })
})
