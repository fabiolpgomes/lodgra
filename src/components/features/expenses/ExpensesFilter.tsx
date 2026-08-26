'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Eye, Edit, Receipt, Plus, Calendar, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/common/ui/input'
import { Button } from '@/components/common/ui/button'
import { Badge } from '@/components/common/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import { formatCurrency, type CurrencyCode, groupByCurrency } from '@/lib/utils/currency'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/utils/expense-categories'
import { CurrencyStack } from '@/components/common/ui/CurrencyStack'
import { PaginationNav } from '@/components/common/ui/PaginationNav'
import { useLocale } from '@/lib/i18n/routing'
import { DeleteExpenseButton } from './DeleteExpenseButton'

interface Expense {
  id: string
  expense_date: string
  description: string
  notes?: string | null
  category: string
  amount: number
  currency: string
  properties: { id: string; name: string; currency: string } | { id: string; name: string; currency: string }[]
}

interface ExpensesFilterProps {
  expenses: Expense[]
  properties?: { id: string; name: string; currency: string }[]
  canCreate: boolean
  canEdit: boolean
  pagination?: { page: number; total: number; pageSize: number }
}


function getProperty(expense: Expense) {
  return Array.isArray(expense.properties) ? expense.properties[0] : expense.properties
}

function getStorageKey(key: string): string {
  return `expenses_filter_${key}`
}

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString().split('T')[0]
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

export function ExpensesFilter({ expenses, properties = [], canCreate, canEdit, pagination }: ExpensesFilterProps) {
  const locale = useLocale()
  const prefix = locale ? `/${locale}` : ''
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const hasRequiredFilters = propertyFilter !== 'all' && Boolean(startDate) && Boolean(endDate)

  useEffect(() => {
    try {
      setSearch(localStorage.getItem(getStorageKey('search')) || '')
      setCategoryFilter(localStorage.getItem(getStorageKey('category')) || 'all')
      setPropertyFilter(localStorage.getItem(getStorageKey('property')) || 'all')
      setStartDate(localStorage.getItem(getStorageKey('start_date')) || '')
      setEndDate(localStorage.getItem(getStorageKey('end_date')) || '')
    } catch (error) {
      console.error('Failed to load expense filter preferences:', error)
    }

    setMounted(true)
  }, [])

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(getStorageKey('search'), search)
  }, [mounted, search])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(getStorageKey('category'), categoryFilter)
  }, [mounted, categoryFilter])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(getStorageKey('property'), propertyFilter)
  }, [mounted, propertyFilter])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(getStorageKey('start_date'), startDate)
  }, [mounted, startDate])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(getStorageKey('end_date'), endDate)
  }, [mounted, endDate])

  // Extract unique properties from server-passed properties or from expenses
  const uniqueProperties = useMemo(() => {
    if (properties && properties.length > 0) {
      return properties.map(p => p.name).sort()
    }
    const props = new Set<string>()
    expenses.forEach(e => {
      const prop = getProperty(e)
      if (prop?.name) props.add(prop.name)
    })
    return Array.from(props).sort()
  }, [properties, expenses])

  const filtered = useMemo(() => {
    if (!hasRequiredFilters) {
      return []
    }

    return expenses.filter(e => {
      // Property filter
      if (propertyFilter !== 'all') {
        const property = getProperty(e)
        if (property?.name !== propertyFilter) return false
      }

      // Category filter
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const property = getProperty(e)
        const propertyName = (property?.name || '').toLowerCase()
        const description = (e.description || '').toLowerCase()
        if (!propertyName.includes(q) && !description.includes(q)) return false
      }

      // Date range filter
      if (startDate) {
        const expenseDate = toIsoDate(e.expense_date)
        if (!expenseDate) return false
        if (expenseDate < startDate) return false
      }

      if (endDate) {
        const expenseDate = toIsoDate(e.expense_date)
        if (!expenseDate) return false
        if (expenseDate > endDate) return false
      }

      return true
    })
  }, [expenses, search, categoryFilter, propertyFilter, startDate, endDate, hasRequiredFilters])

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    if (!hasRequiredFilters) {
      return {
        count: 0,
        totalsByCurrency: {},
      }
    }

    const totalsByCurrency = groupByCurrency(
      filtered.flatMap((e) => {
        const prop = Array.isArray(e.properties) ? e.properties[0] : e.properties
        const currency = e.currency?.toUpperCase() || prop?.currency?.toUpperCase() || null

        if (!currency) {
          return []
        }

        return [{
          currency: currency as CurrencyCode,
          amount: e.amount ? Number(e.amount) : 0,
        }]
      })
    )
    return {
      count: filtered.length,
      totalsByCurrency,
    }
  }, [filtered, hasRequiredFilters])

  const filtersHint = (() => {
    if (propertyFilter === 'all') {
      return 'Escolha uma propriedade para carregar as despesas.'
    }

    if (!startDate && !endDate) {
      return 'Agora defina a data inicial e a data final para ver os lançamentos.'
    }

    if (!startDate) {
      return 'Informe a data inicial para continuar.'
    }

    if (!endDate) {
      return 'Informe a data final para continuar.'
    }

    return 'Aplique os filtros para ver a lista.'
  })()

  const emptyState = (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-border-soft p-8 sm:p-10 text-center">
      <Receipt className="h-16 w-16 text-gray-500 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {hasRequiredFilters ? 'Nenhum resultado encontrado' : 'Selecione filtros para ver despesas'}
      </h3>
      <p className="text-gray-600 max-w-xl mx-auto">
        {hasRequiredFilters
          ? 'Tente ajustar a pesquisa, a categoria ou o período escolhido.'
          : filtersHint}
      </p>
      {!hasRequiredFilters && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-surface px-4 py-2 border border-brand-border-soft text-sm text-gray-600">
            <span className="h-2 w-2 rounded-full bg-brand-blue" />
            Propriedade + período = lista
          </span>
          {canCreate && (
            <Button asChild variant="outline">
              <Link href={`${prefix}/expenses/new`}>
                <Plus className="h-5 w-5" />
                Nova Despesa
              </Link>
            </Button>
          )}
        </div>
      )}
      {hasRequiredFilters && canCreate && expenses.length === 0 && (
        <Button asChild className="mt-6">
          <Link href={`${prefix}/expenses/new`}>
            <Plus className="h-5 w-5" />
            Adicionar Primeira Despesa
          </Link>
        </Button>
      )}
    </div>
  )

  return (
    <>
      {/* Filtered Stats */}
      {hasRequiredFilters ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total</span>
            </div>
            <p className="text-4xl font-bold text-gray-900">{filteredStats.count}</p>
            <p className="text-sm text-gray-600 mt-1">Despesas</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 sm:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Valor Total</p>
                <p className="text-xs text-gray-500 mt-0.5">Despesas filtradas</p>
              </div>
            </div>
            <div className="text-red-600">
              <CurrencyStack totals={filteredStats.totalsByCurrency} size="md" showEmpty={true} />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-dashed border-brand-border-soft bg-white/80 px-5 py-4 text-sm text-gray-600">
          <span className="font-semibold text-gray-900">Visão protegida</span>
          <span className="ml-2">{filtersHint}</span>
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-brand-border-soft p-4 sm:p-5 mb-6">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search and Property Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Pesquisar por descrição ou propriedade..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Propriedade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as propriedades</SelectItem>
                {uniqueProperties.map(prop => (
                  <SelectItem key={prop} value={prop} title={prop}>{truncateText(prop, 40)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Date Range and Category Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Data inicial <span className="text-gray-500">(dd/mm/aaaa)</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Data final <span className="text-gray-500">(dd/mm/aaaa)</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {CATEGORY_ORDER.map(value => (
                    <SelectItem key={value} value={value}>{CATEGORY_LABELS[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? emptyState : (
        <>
          <div className="space-y-3">
            {filtered.map(expense => {
              const property = getProperty(expense)
              const propertyName = property?.name ? truncateText(property.name, 40) : ''
              return (
                <article
                  key={expense.id}
                  className="rounded-2xl border border-brand-border-soft bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-800 text-[10px] px-2 py-0.5 uppercase tracking-wider"
                        >
                          {CATEGORY_LABELS[expense.category] || expense.category}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(expense.expense_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <Link href={`${prefix}/expenses/${expense.id}`} className="block">
                        <h3
                          className="mt-2 truncate text-sm font-semibold text-gray-900 md:text-base hover:text-brand-600"
                          title={expense.description}
                        >
                          {expense.description}
                        </h3>
                      </Link>

                      <p
                        className="mt-1 truncate text-xs text-gray-600 md:text-sm"
                        title={property?.name}
                      >
                        {propertyName}
                      </p>

                      {expense.notes && (
                        <p className="mt-2 text-xs text-gray-600 md:text-sm">
                          {expense.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 md:min-w-[220px] md:items-end">
                      <div className="text-xl font-bold text-red-600 md:text-2xl">
                        {formatCurrency(expense.amount, expense.currency as CurrencyCode)}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Button asChild variant="outline" size="xs" className="h-9 px-3 text-xs">
                          <Link href={`${prefix}/expenses/${expense.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">Ver</span>
                          </Link>
                        </Button>
                        {canEdit && (
                          <>
                            <Button asChild variant="action" size="xs" className="h-9 px-3 text-xs">
                              <Link href={`${prefix}/expenses/${expense.id}/edit`}>
                                <Edit className="h-4 w-4" />
                                <span className="hidden sm:inline">Editar</span>
                              </Link>
                            </Button>
                            <DeleteExpenseButton
                              expenseId={expense.id}
                              description={expense.description}
                              compact
                              className="h-9 px-3 text-xs"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
            {filtered.length < expenses.length && (
              <p className="text-center text-sm text-gray-600 py-2">
                Mostrando {filtered.length} de {expenses.length} despesas
              </p>
            )}
            {pagination && <PaginationNav {...pagination} />}
          </div>
        </>
      )}
    </>
  )
}
