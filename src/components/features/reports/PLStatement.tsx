'use client'

import { TrendingUp, TrendingDown, DollarSign, Info } from 'lucide-react'
import { ExportToExcelButton } from './ExportToExcelButton'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

interface PLStatementProps {
  grossRevenue: Record<string, number>
  platformFees: Record<string, number>
  netRevenue: Record<string, number>
  operationalExpenses: Record<string, number>
  taxExpenses: Record<string, number>
  netProfit: Record<string, number>
  startDate: string
  endDate: string
}

function PLRow({
  label,
  values,
  type,
  indent = false,
  bold = false,
  note,
}: {
  label: string
  values: Record<string, number>
  type: 'positive' | 'negative' | 'subtotal' | 'total'
  indent?: boolean
  bold?: boolean
  note?: string
}) {
  const colorMap = {
    positive: 'text-green-700',
    negative: 'text-red-700',
    subtotal: 'text-blue-700',
    total: 'text-gray-900',
  }

  const hasValues = Object.values(values).some(v => v !== 0)

  return (
    <div className={`flex items-center justify-between py-3 ${type === 'total' ? 'border-t-2 border-gray-900 mt-1' : type === 'subtotal' ? 'border-t border-blue-200 bg-blue-50 px-3 rounded' : 'border-t border-gray-100'}`}>
      <div className={`flex items-center gap-2 ${indent ? 'ml-4' : ''}`}>
        <span className={`text-sm ${bold ? 'font-semibold' : 'font-normal'} text-gray-700`}>
          {type === 'positive' ? '(+)' : type === 'negative' ? '(−)' : type === 'subtotal' ? '(=)' : '(=)'}
          {' '}{label}
        </span>
        {note && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Info className="h-3 w-3" />
            {note}
          </span>
        )}
      </div>
      <div className="text-right">
        {hasValues ? (
          Object.entries(values).map(([currency, amount]) => (
            <p key={currency} className={`text-sm ${bold ? 'font-bold text-base' : 'font-medium'} ${colorMap[type]}`}>
              {formatCurrency(Math.abs(amount), currency as CurrencyCode)}
            </p>
          ))
        ) : (
          <p className="text-sm text-gray-400">—</p>
        )}
      </div>
    </div>
  )
}

export function PLStatement({
  grossRevenue,
  platformFees,
  netRevenue,
  operationalExpenses,
  taxExpenses,
  netProfit,
  startDate,
  endDate,
}: PLStatementProps) {
  const hasPlatformFees = Object.values(platformFees).some(v => v > 0)

  const currencies = [
    ...new Set([
      ...Object.keys(grossRevenue),
      ...Object.keys(netProfit),
    ]),
  ]

  const exportData = currencies.map(currency => {
    const gross = grossRevenue[currency] || 0
    const fees = platformFees[currency] || 0
    const net = netRevenue[currency] || 0
    const opEx = operationalExpenses[currency] || 0
    const taxEx = taxExpenses[currency] || 0
    const profit = netProfit[currency] || 0
    const margin = net > 0 ? (profit / net) * 100 : 0

    return {
      'Moeda': currency,
      'Receita Bruta': gross.toFixed(2),
      'Taxas de Plataforma': fees.toFixed(2),
      'Receita Líquida': net.toFixed(2),
      'Despesas Operacionais': opEx.toFixed(2),
      'Impostos': taxEx.toFixed(2),
      'Lucro Líquido': profit.toFixed(2),
      'Margem (%)': margin.toFixed(1),
    }
  })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Demonstrativo de Resultado (P&amp;L)</h3>
          <p className="text-sm text-gray-500 mt-1">
            {startDate} → {endDate}
          </p>
        </div>
        {exportData.length > 0 && (
          <ExportToExcelButton
            data={exportData}
            filename="pl_demonstrativo"
            sheetName="P&L"
          />
        )}
      </div>

      {currencies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p>Nenhum dado disponível para o período selecionado.</p>
        </div>
      ) : (
        currencies.map(currency => {
          const gross = grossRevenue[currency] || 0
          const fees = platformFees[currency] || 0
          const net = netRevenue[currency] || 0
          const opEx = operationalExpenses[currency] || 0
          const taxEx = taxExpenses[currency] || 0
          const profit = netProfit[currency] || 0
          const margin = net > 0 ? (profit / net) * 100 : 0

          const marginColor =
            margin >= 30 ? 'bg-green-100 text-green-800' :
            margin >= 10 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'

          return (
            <div key={currency} className="mb-8 last:mb-0">
              {currencies.length > 1 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    {currency}
                  </span>
                </div>
              )}

              <div className="space-y-0">
                {/* Receita Bruta */}
                <PLRow
                  label="Receita Bruta"
                  values={{ [currency]: gross }}
                  type="positive"
                  bold
                />

                {/* Taxas de Plataforma */}
                <PLRow
                  label="Taxas de Plataforma"
                  values={{ [currency]: fees }}
                  type="negative"
                  indent
                  note={!hasPlatformFees ? 'Não registado nas reservas' : undefined}
                />

                {/* Receita Líquida */}
                <PLRow
                  label="Receita Líquida"
                  values={{ [currency]: net }}
                  type="subtotal"
                  bold
                />

                {/* Despesas Operacionais */}
                <PLRow
                  label="Despesas Operacionais"
                  values={{ [currency]: opEx }}
                  type="negative"
                  indent
                />

                {/* Impostos */}
                <PLRow
                  label="Impostos"
                  values={{ [currency]: taxEx }}
                  type="negative"
                  indent
                />

                {/* Lucro Líquido */}
                <div className={`flex items-center justify-between py-4 border-t-2 ${profit >= 0 ? 'border-green-600' : 'border-red-600'} mt-2`}>
                  <div className="flex items-center gap-3">
                    {profit >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-bold text-gray-900">(=) Lucro Líquido</span>
                    {net > 0 && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${marginColor}`}>
                        Margem {margin.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profit, currency as CurrencyCode)}
                  </p>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
