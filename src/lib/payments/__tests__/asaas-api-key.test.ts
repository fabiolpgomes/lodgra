import { validateAsaasApiKey } from '../asaas-api-key'

describe('validateAsaasApiKey', () => {
  it('aceita chaves reais de cada ambiente', () => {
    expect(validateAsaasApiKey('$aact_hmlg_000abc', 'sandbox')).toBeNull()
    expect(validateAsaasApiKey('$aact_prod_000abc', 'production')).toBeNull()
  })

  it('recusa a chave Pix (UUID) colada por engano', () => {
    expect(validateAsaasApiKey('e326af68-f6c1-461b-b3a6-f6d49f783269', 'sandbox')).toMatch(/\$aact_/)
  })

  it('recusa lixo sem o prefixo', () => {
    expect(validateAsaasApiKey('abcdefgh12345678', 'production')).toMatch(/chave de API/)
  })

  it('recusa chave de sandbox em produção e o contrário', () => {
    expect(validateAsaasApiKey('$aact_hmlg_000abc', 'production')).toMatch(/sandbox/)
    expect(validateAsaasApiKey('$aact_prod_000abc', 'sandbox')).toMatch(/produção/)
  })
})
