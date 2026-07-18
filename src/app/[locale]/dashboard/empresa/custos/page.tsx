import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Plus, Receipt, RotateCcw, Save, Trash2 } from 'lucide-react'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumMetricCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { Button } from '@/components/common/ui/button'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { writeAuditLog } from '@/lib/audit'
import {
  COMPANY_EXPENSE_CATEGORIES,
  COMPANY_EXPENSE_CATEGORY_LABELS,
  COMPANY_EXPENSE_RECURRENCE_LABELS,
  COMPANY_EXPENSE_STATUS_LABELS,
  formatMoneyMapText,
  sumCompanyExpensesForYear,
  type CompanyExpenseRow,
} from '@/lib/financial/company-expenses'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Única' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
]

const STATUS_OPTIONS = [
  { value: 'paid', label: 'Pago' },
  { value: 'pending', label: 'Pendente' },
  { value: 'planned', label: 'Planeado' },
]

function parseAmount(value: FormDataEntryValue | null) {
  const normalized = String(value || '').replace(',', '.')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : 0
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

async function createCompanyExpenseAction(formData: FormData) {
  'use server'

  const locale = getString(formData, 'locale') || 'pt-BR'
  const year = getString(formData, 'year') || String(new Date().getFullYear())
  const auth = await requireRole(['admin', 'gestor'])

  if (!auth.authorized) redirect('/login')
  if (!auth.organizationId || !auth.userId) {
    throw new Error('Organização não encontrada para criar custo da empresa.')
  }

  const description = getString(formData, 'description')
  const category = getString(formData, 'category') || 'other'
  const currency = (getString(formData, 'currency') || 'EUR').toUpperCase()
  const expenseDate = getString(formData, 'expense_date')
  const recurrenceType = getString(formData, 'recurrence_type') || 'none'
  const recurrenceEndDate = getString(formData, 'recurrence_end_date')
  const status = getString(formData, 'status') || 'paid'
  const notes = getString(formData, 'notes')
  const amount = parseAmount(formData.get('amount'))

  if (!description || !expenseDate || amount <= 0) {
    throw new Error('Descrição, data e valor positivo são obrigatórios.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('company_expenses')
    .insert({
      organization_id: auth.organizationId,
      description,
      amount,
      currency,
      category,
      expense_date: expenseDate,
      recurrence_type: recurrenceType,
      recurrence_end_date: recurrenceType === 'none' ? null : recurrenceEndDate || null,
      status,
      notes: notes || null,
      created_by: auth.userId,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar custo da empresa: ${error.message}`)

  await writeAuditLog({
    userId: auth.userId,
    action: 'create',
    resourceType: 'company_expense',
    resourceId: data?.id,
    details: { description, amount, currency, category, expense_date: expenseDate, recurrence_type: recurrenceType, status },
  })

  revalidatePath(`/${locale}/dashboard/empresa`)
  revalidatePath(`/${locale}/dashboard/empresa/custos`)
  redirect(`/${locale}/dashboard/empresa/custos?year=${year}`)
}

async function deleteCompanyExpenseAction(formData: FormData) {
  'use server'

  const locale = getString(formData, 'locale') || 'pt-BR'
  const year = getString(formData, 'year') || String(new Date().getFullYear())
  const id = getString(formData, 'id')
  const auth = await requireRole(['admin', 'gestor'])

  if (!auth.authorized) redirect('/login')
  if (!auth.organizationId || !auth.userId || !id) {
    throw new Error('Custo da empresa inválido.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('company_expenses')
    .delete()
    .eq('id', id)
    .eq('organization_id', auth.organizationId)

  if (error) throw new Error(`Erro ao excluir custo da empresa: ${error.message}`)

  await writeAuditLog({
    userId: auth.userId,
    action: 'delete',
    resourceType: 'company_expense',
    resourceId: id,
  })

  revalidatePath(`/${locale}/dashboard/empresa`)
  revalidatePath(`/${locale}/dashboard/empresa/custos`)
  redirect(`/${locale}/dashboard/empresa/custos?year=${year}`)
}

function getYearRange(year: number) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  }
}

function getDateLabel(date?: string | null) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${date}T00:00:00`))
}

export default async function CompanyCostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ year?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  const auth = await requireRole(['admin', 'gestor'])

  if (!auth.authorized) redirect(`/${locale}/onboarding/pendente`)
  if (!auth.organizationId) redirect(`/${locale}/onboarding`)

  const selectedYear = Number(query.year || new Date().getFullYear())
  const safeYear = Number.isFinite(selectedYear) ? selectedYear : new Date().getFullYear()
  const { start, end } = getYearRange(safeYear)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('company_expenses')
    .select('id, description, amount, currency, category, expense_date, recurrence_type, recurrence_end_date, status, notes')
    .eq('organization_id', auth.organizationId)
    .lte('expense_date', end)
    .or(`recurrence_end_date.is.null,recurrence_end_date.gte.${start}`)
    .order('expense_date', { ascending: false })

  const setupPending = Boolean(error)
  if (error) console.error('Erro ao buscar custos da empresa:', error)

  const expenses = (data || []) as CompanyExpenseRow[]
  const activeExpenses = expenses.filter((expense) => expense.status !== 'cancelled')
  const cancelledCount = expenses.length - activeExpenses.length
  const totals = sumCompanyExpensesForYear(activeExpenses, safeYear)
  const recurringCount = activeExpenses.filter((expense) => expense.recurrence_type && expense.recurrence_type !== 'none').length
  const monthlyAverage = Object.fromEntries(
    Object.entries(totals.total).map(([currency, amount]) => [currency, amount / 12])
  )

  return (
    <AuthLayout>
      <PremiumPageShell maxWidth="max-w-[1400px]" className="pb-28">
        <PremiumPageHeader
          title="Custos da Empresa"
          description="Despesas operacionais da Lodgra usadas no resultado líquido dos sócios."
          icon={Receipt}
          badge={`Ano ${safeYear}`}
          actions={(
            <>
              <Link
                href={`/${locale}/dashboard/empresa?year=${safeYear}`}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-brand-white px-4 py-2 text-xs font-bold text-brand-text-dark transition-all hover:border-brand-gold/45 hover:bg-brand-bg hover:text-brand-gold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard Empresa
              </Link>
              <Link
                href={`/${locale}/dashboard/empresa/custos?year=${safeYear - 1}`}
                className="rounded-full border border-neutral-200 bg-brand-white px-4 py-2 text-xs font-bold text-brand-text-dark transition-all hover:border-brand-gold/45 hover:bg-brand-bg hover:text-brand-gold"
              >
                {safeYear - 1}
              </Link>
              <Link
                href={`/${locale}/dashboard/empresa/custos?year=${safeYear + 1}`}
                className="rounded-full border border-neutral-200 bg-brand-white px-4 py-2 text-xs font-bold text-brand-text-dark transition-all hover:border-brand-gold/45 hover:bg-brand-bg hover:text-brand-gold"
              >
                {safeYear + 1}
              </Link>
            </>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PremiumMetricCard
            label="Custo anual operacional"
            value={formatMoneyMapText(totals.total)}
            type="EMPRESA"
            description="Entrará no card Custos do Dashboard Empresa"
            icon={Receipt}
            tone="danger"
          />
          <PremiumMetricCard
            label="Média mensal"
            value={formatMoneyMapText(monthlyAverage)}
            type="MENSAL"
            description="Total anual dividido por 12 meses"
            icon={Building2}
            tone="gold"
          />
          <PremiumMetricCard
            label="Lançamentos ativos"
            value={String(activeExpenses.length)}
            type="ATIVOS"
            description={`${recurringCount} recorrentes`}
            icon={Plus}
            tone="blue"
          />
          <PremiumMetricCard
            label="Cancelados"
            value={String(cancelledCount)}
            type="FORA DO RESULTADO"
            description="Não entram no cálculo anual"
            icon={Trash2}
            tone="blue"
          />
        </div>

        {setupPending && (
          <PremiumCard as="section" className="border-brand-gold/35 bg-brand-gold/10">
            <p className="text-sm font-bold text-brand-text-dark">
              Estrutura de custos da empresa pendente no Supabase.
            </p>
            <p className="mt-2 text-xs font-semibold text-brand-text-medium">
              A migration `20260718084911_company_expenses.sql` precisa ser aplicada para cadastrar e calcular custos operacionais reais.
            </p>
          </PremiumCard>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <PremiumCard as="section">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-dark transition-colors group-hover:text-brand-gold">
                  Novo custo operacional
                </h2>
                <p className="mt-1 text-xs font-semibold text-brand-text-medium">
                  Use para sistemas, contabilidade, salários, marketing e outros custos da empresa.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="reset"
                  form="company-expense-form"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-brand-white px-4 py-2 text-xs font-bold text-brand-text-dark transition-all hover:border-brand-gold/45 hover:bg-brand-bg hover:text-brand-gold"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="company-expense-form"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-blue/90"
                  disabled={setupPending}
                >
                  <Save className="h-3.5 w-3.5" />
                  Salvar
                </button>
              </div>
            </div>

            <form id="company-expense-form" action={createCompanyExpenseAction} className="space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="year" value={safeYear} />

              <div>
                <label htmlFor="description" className="text-[11px] font-black uppercase tracking-wider text-brand-text-medium">
                  Descrição
                </label>
                <input
                  id="description"
                  name="description"
                  required
                  maxLength={160}
                  placeholder="Ex: Contabilidade mensal"
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-brand-white px-4 py-3 text-sm font-semibold text-brand-text-dark outline-none transition-all focus:border-brand-gold"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="amount" className="text-[11px] font-black uppercase tracking-wider text-brand-text-medium">
                    Valor
                  </label>
                  <input
                    id="amount"
                    name="amount"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-brand-white px-4 py-3 text-sm font-semibold text-brand-text-dark outline-none transition-all focus:border-brand-gold"
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="text-[11px] font-black uppercase tracking-wider text-brand-text-medium">
                    Moeda
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    defaultValue="EUR"
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-brand-white px-4 py-3 text-sm font-semibold text-brand-text-dark outline-none transition-all focus:border-brand-gold"
                  >
                    <option value="EUR">EUR</option>
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="expense_date" className="text-[11px] font-black uppercase tracking-wider text-brand-text-medium">
                    Data inicial
                  </label>
                  <input
                    id="expense_date"
                    name="expense_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-brand-white px-4 py-3 text-sm font-semibold text-brand-text-dark outline-none transition-all focus:border-brand-gold"
                  />
                </div>
                <div>
                  <label htmlFor="recurrence_type" className="text-[11px] font-black uppercase tracking-wider text-brand-text-medium">
                    Recorrência
                  </label>
                  <select
                    id="recurrence_type"
                    name="recurrence_type"
                    defaultValue="monthly"
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-brand-white px-4 py-3 text-sm font-semibold text-brand-text-dark outline-none transition-all focus:border-brand-gold"
                  >
                    {RECURRENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="recurrence_end_date" className="text-[11px] font-black uppercase tracking-wider text-brand-text-medium">
                    Fim da recorrência
                  </label>
                  <input
                    id="recurrence_end_date"
                    name="recurrence_end_date"
                    type="date"
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-brand-white px-4 py-3 text-sm font-semibold text-brand-text-dark outline-none transition-all focus:border-brand-gold"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="text-[11px] font-black uppercase tracking-wider text-brand-text-medium">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue="paid"
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-brand-white px-4 py-3 text-sm font-semibold text-brand-text-dark outline-none transition-all focus:border-brand-gold"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="category" className="text-[11px] font-black uppercase tracking-wider text-brand-text-medium">
                  Categoria
                </label>
                <select
                  id="category"
                  name="category"
                  defaultValue="software"
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-brand-white px-4 py-3 text-sm font-semibold text-brand-text-dark outline-none transition-all focus:border-brand-gold"
                >
                  {COMPANY_EXPENSE_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="text-[11px] font-black uppercase tracking-wider text-brand-text-medium">
                  Notas
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Detalhes internos, contrato ou observações..."
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-brand-white px-4 py-3 text-sm font-semibold text-brand-text-dark outline-none transition-all focus:border-brand-gold"
                />
              </div>

              <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-2xl border border-brand-bg bg-brand-white/95 p-3 shadow-lg backdrop-blur sm:flex-row">
                <button
                  type="reset"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-brand-white px-4 py-3 text-sm font-bold text-brand-text-dark transition-all hover:border-brand-gold/45 hover:bg-brand-bg hover:text-brand-gold"
                >
                  <RotateCcw className="h-4 w-4" />
                  Cancelar
                </button>
                <Button type="submit" variant="action" className="flex-1 justify-center rounded-full" disabled={setupPending}>
                  <Save className="h-4 w-4" />
                  Salvar custo
                </Button>
              </div>
            </form>
          </PremiumCard>

          <PremiumCard as="section" className="overflow-hidden p-0">
            <div className="flex flex-col gap-2 border-b border-brand-bg px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-dark transition-colors group-hover:text-brand-gold">
                  Lançamentos
                </h2>
                <p className="mt-1 text-xs font-semibold text-brand-text-medium">
                  Custos operacionais que alimentam o Dashboard Empresa.
                </p>
              </div>
              <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brand-blue">
                {activeExpenses.length} ativos
              </span>
            </div>

            <div className="divide-y divide-brand-bg">
              {expenses.map((expense) => {
                const category = expense.category || 'other'
                const recurrence = expense.recurrence_type || 'none'
                const status = expense.status || 'paid'
                const amount = Number(expense.amount || 0)
                const currency = (expense.currency || 'EUR') as CurrencyCode

                return (
                  <div key={expense.id} className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-brand-text-dark">{expense.description}</p>
                        <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-text-medium">
                          {COMPANY_EXPENSE_CATEGORY_LABELS[category] || category}
                        </span>
                        <span className="rounded-full bg-brand-gold/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-gold">
                          {COMPANY_EXPENSE_RECURRENCE_LABELS[recurrence] || recurrence}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-brand-text-medium">
                        Início {getDateLabel(expense.expense_date)}
                        {expense.recurrence_end_date ? ` · fim ${getDateLabel(expense.recurrence_end_date)}` : ''}
                        {' · '}
                        {COMPANY_EXPENSE_STATUS_LABELS[status] || status}
                      </p>
                      {expense.notes && (
                        <p className="mt-2 text-xs font-medium text-brand-text-medium">{expense.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-4 lg:justify-end">
                      <div className="text-left lg:text-right">
                        <p className="text-lg font-black tabular-nums text-brand-text-dark">
                          {formatCurrency(amount, currency)}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">
                          valor base
                        </p>
                      </div>
                      <form action={deleteCompanyExpenseAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="year" value={safeYear} />
                        <input type="hidden" name="id" value={expense.id} />
                        <button
                          type="submit"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-500/20 px-4 text-xs font-bold text-red-600 transition-all hover:border-red-500/40 hover:bg-red-500/10"
                          aria-label={`Excluir ${expense.description}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </button>
                      </form>
                    </div>
                  </div>
                )
              })}

              {expenses.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm font-semibold text-brand-text-medium">
                    Nenhum custo da empresa cadastrado para {safeYear}.
                  </p>
                </div>
              )}
            </div>
          </PremiumCard>
        </div>
      </PremiumPageShell>
    </AuthLayout>
  )
}
