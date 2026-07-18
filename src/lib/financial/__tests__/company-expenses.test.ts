import {
  getCompanyExpenseOccurrencesForYear,
  sumCompanyExpensesForYear,
} from '../company-expenses'

describe('company expenses recurrence', () => {
  it('counts one-time expenses only in their own year', () => {
    const expense = {
      id: 'expense-1',
      description: 'Setup',
      amount: 100,
      currency: 'EUR',
      expense_date: '2026-03-10',
      recurrence_type: 'none',
      status: 'paid',
    }

    expect(getCompanyExpenseOccurrencesForYear(expense, 2026)).toEqual([
      { monthIndex: 2, currency: 'EUR', amount: 100 },
    ])
    expect(getCompanyExpenseOccurrencesForYear(expense, 2027)).toEqual([])
  })

  it('expands monthly expenses from the start month through the selected year', () => {
    const expense = {
      id: 'expense-2',
      description: 'Software',
      amount: 50,
      currency: 'EUR',
      expense_date: '2026-04-15',
      recurrence_type: 'monthly',
      status: 'paid',
    }

    const occurrences = getCompanyExpenseOccurrencesForYear(expense, 2026)

    expect(occurrences).toHaveLength(9)
    expect(occurrences[0]).toEqual({ monthIndex: 3, currency: 'EUR', amount: 50 })
    expect(occurrences[8]).toEqual({ monthIndex: 11, currency: 'EUR', amount: 50 })
  })

  it('stops monthly expenses at recurrence_end_date', () => {
    const expense = {
      id: 'expense-3',
      description: 'Contract',
      amount: 200,
      currency: 'BRL',
      expense_date: '2026-01-01',
      recurrence_type: 'monthly',
      recurrence_end_date: '2026-03-31',
      status: 'paid',
    }

    expect(getCompanyExpenseOccurrencesForYear(expense, 2026)).toEqual([
      { monthIndex: 0, currency: 'BRL', amount: 200 },
      { monthIndex: 1, currency: 'BRL', amount: 200 },
      { monthIndex: 2, currency: 'BRL', amount: 200 },
    ])
  })

  it('excludes cancelled expenses from totals', () => {
    const { total } = sumCompanyExpensesForYear([
      {
        id: 'expense-4',
        description: 'Cancelled',
        amount: 999,
        currency: 'EUR',
        expense_date: '2026-01-01',
        recurrence_type: 'monthly',
        status: 'cancelled',
      },
    ], 2026)

    expect(total).toEqual({})
  })
})
