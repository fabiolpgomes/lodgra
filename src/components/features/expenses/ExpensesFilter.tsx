'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Eye, Edit, Receipt, Plus, ArrowRight, Calendar, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/common/ui/input'
import { Button } from '@/components/common/ui/button'
import { Badge } from '@/components/common/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import { formatCurrency, type CurrencyCode, groupByCurrency } from '@/lib/utils/currency'
import { PaginationNav } from '@/components/common/ui/PaginationNav'

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

// Correct category order per AC6
const CATEGORY_ORDER = ['water', 'electricity', 'gas', 'phone', 'internet', 'condo', 'cleaning', 'laundry', 'cleaning_supplies', 'repairs', 'insurance', 'management', 'other']

const CATEGORY_LABELS: Record<string, string> = {
  water: 'Água',
  electricity: 'Luz',
  gas: 'Gás',
  phone: 'Telefone',
  internet: 'Internet',
  condo: 'Condomínio',
  cleaning: 'Limpeza',
  laundry: 'Lavanderia',
  cleaning_supplies: 'Material de limpeza',
  repairs: 'Reparos',
  insurance: 'Seguro Residencial',
  management: 'Gestão do Imóvel',
  other: 'Outros',
}

function getProperty(expense: Expense) {
  return Array.isArray(expense.properties) ? expense.properties[0] : expense.properties
}

function getStorageKey(key: string): string {
  return `expenses_filter_${key}`
}

export function ExpensesFilter({ expenses, properties = [], canCreate, canEdit, pagination }: ExpensesFilterProps) {
  const [search, setSearch] = useState(() => localStorage.getItem(getStorageKey('search')) || '')
  const [categoryFilter, setCategoryFilter] = useState(() => localStorage.getItem(getStorageKey('category')) || 'all')
  const [propertyFilter, setPropertyFilter] = useState<string>(() => localStorage.getItem(getStorageKey('property')) || 'all')
  const [startDate, setStartDate] = useState<string>(() => localStorage.getItem(getStorageKey('start_date')) || '')
  const [endDate, setEndDate] = useState<string>(() => localStorage.getItem(getStorageKey('end_date')) || '')

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(getStorageKey('search'), search)
  }, [search])

  useEffect(() => {
    localStorage.setItem(getStorageKey('category'), categoryFilter)
  }, [categoryFilter])

  useEffect(() => {
    localStorage.setItem(getStorageKey('property'), propertyFilter)
  }, [propertyFilter])

  useEffect(() => {
    localStorage.setItem(getStorageKey('start_date'), startDate)
  }, [startDate])

  useEffect(() => {
    localStorage.setItem(getStorageKey('end_date'), endDate)
  }, [endDate])

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
        const expenseDate = new Date(e.expense_date).toISOString().split('T')[0]
        if (expenseDate < startDate) return false
      }

      if (endDate) {
        const expenseDate = new Date(e.expense_date).toISOString().split('T')[0]
        if (expenseDate > endDate) return false
      }

      return true
    })
  }, [expenses, search, categoryFilter, propertyFilter, startDate, endDate])

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const totalsByCurrency = groupByCurrency(
      filtered.map(e => {
        const prop = Array.isArray(e.properties) ? e.properties[0] : e.properties
        return {
          currency: (e.currency || prop?.currency || 'EUR') as CurrencyCode,
          amount: e.amount ? Number(e.amount) : 0,
        }
      })
    )
    return {
      count: filtered.length,
      totalsByCurrency,
    }
  }, [filtered])

  const emptyState = (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {expenses.length === 0 ? 'Nenhuma despesa cadastrada' : 'Nenhum resultado encontrado'}
      </h3>
      <p className="text-gray-600 mb-6">
        {expenses.length === 0
          ? 'Comece adicionando sua primeira despesa'
          : 'Tente ajustar os filtros ou o termo de pesquisa.'}
      </p>
      {expenses.length === 0 && canCreate && (
        <Button asChild>
          <Link href="/expenses/new">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">Total</span>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{filteredStats.count}</h3>
          <p className="text-sm text-gray-600 mt-1">Despesas</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 col-span-3">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Valor Total</span>
          </div>
          <div className="space-y-1">
            {Object.entries(filteredStats.totalsByCurrency).length > 0 ? (
              Object.entries(filteredStats.totalsByCurrency).map(([currency, amount]) => (
                <h3 key={currency} className="text-3xl font-bold text-red-600">
                  {formatCurrency(amount, currency as CurrencyCode)}
                </h3>
              ))
            ) : (
              <h3 className="text-3xl font-bold text-gray-900">-</h3>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {propertyFilter !== 'all' || startDate || endDate
              ? `Despesas filtradas${propertyFilter !== 'all' ? ` de ${propertyFilter}` : ''}${startDate || endDate ? ` de ${startDate} a ${endDate}` : ''}`
              : 'Todas as despesas'}
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search and Property Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar por descrição ou propriedade..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Propriedade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as propriedades</SelectItem>
                {uniqueProperties.map(prop => (
                  <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Date Range and Category Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Data inicial</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Data final</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="pl-9"
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
          {/* Mobile: cards */}
          <div className="block sm:hidden space-y-3">
            {filtered.map(expense => {
              const property = getProperty(expense)
              return (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="block bg-white rounded-xl shadow p-4 active:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-1">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                      {CATEGORY_LABELS[expense.category] || expense.category}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mt-2">{expense.description}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{property?.name}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {new Date(expense.expense_date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(expense.amount, expense.currency as CurrencyCode)}
                    </span>
                  </div>
                </Link>
              )
            })}
            {filtered.length < expenses.length && (
              <p className="text-center text-sm text-gray-500 py-2">
                Mostrando {filtered.length} de {expenses.length} despesas
              </p>
            )}
          </div>

          {/* Tablet+: tabela */}
          <div className="hidden sm:block bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propriedade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma de Pagamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(expense => {
                  const property = getProperty(expense)
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Link href={`/expenses/${expense.id}`} className="hover:text-blue-600">
                          {new Date(expense.expense_date).toLocaleDateString('pt-BR')}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/expenses/${expense.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {property?.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/expenses/${expense.id}`} className="block">
                          <div className="text-sm text-gray-900 hover:text-blue-600">{expense.description}</div>
                          {expense.notes && <div className="text-xs text-gray-500 mt-1">{expense.notes}</div>}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                          {CATEGORY_LABELS[expense.category] || expense.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                        {formatCurrency(expense.amount, expense.currency as CurrencyCode)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/expenses/${expense.id}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {canEdit && (
                            <Link
                              href={`/expenses/${expense.id}/edit`}
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length < expenses.length && (
              <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 border-t">
                Mostrando {filtered.length} de {expenses.length} despesas nesta página
              </div>
            )}
            {pagination && <PaginationNav {...pagination} />}
          </div>
        </>
      )}
    </>
  )
}
