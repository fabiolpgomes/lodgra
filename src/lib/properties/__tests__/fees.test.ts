import { columnsToFees, feesToColumns } from '../fees'

describe('feesToColumns', () => {
  it('grava limpeza por estadia e animais por noite', () => {
    expect(feesToColumns({ cleaningFee: 35, cleaningFeeType: 'per_stay', petFee: 10, petFeeType: 'per_night' })).toEqual({
      cleaning_fee: 35, cleaning_fee_type: 'per_stay', pet_fee: 10, pet_fee_type: 'per_night',
    })
  })

  it('vazio ou zero = sem taxa', () => {
    expect(feesToColumns({ cleaningFee: null, petFee: 0 })).toEqual({
      cleaning_fee: null, cleaning_fee_type: null, pet_fee: null, pet_fee_type: null,
    })
  })

  it('tipo por omissão é por estadia e arredonda a 2 casas', () => {
    expect(feesToColumns({ cleaningFee: 12.345 })).toMatchObject({ cleaning_fee: 12.35, cleaning_fee_type: 'per_stay' })
  })

  it('recusa valores negativos e tipos desconhecidos', () => {
    expect(() => feesToColumns({ cleaningFee: -1 })).toThrow('Taxa de limpeza')
    expect(() => feesToColumns({ petFee: 5, petFeeType: 'per_week' as never })).toThrow('Taxa de animais')
  })
})

describe('columnsToFees', () => {
  it('converte numeric (string do Postgres) em número', () => {
    expect(columnsToFees({ cleaning_fee: '100', cleaning_fee_type: 'per_stay', pet_fee: null, pet_fee_type: null })).toEqual({
      cleaningFee: 100, cleaningFeeType: 'per_stay', petFee: null, petFeeType: null,
    })
  })
})
