'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyReport {
  id: string
  name: string
  currency: string
  management_percentage: number
  revenue: number
  managementFee: number
  expenses: number
  ownerNet: number
}

interface ReportData {
  owner: { id: string; full_name: string; email: string; preferred_currency: string }
  properties: PropertyReport[]
  summary: { revenue: number; managementFee: number; expenses: number; ownerNet: number }
}

interface OwnerReportPDFProps {
  data: ReportData
  periodLabel: string
  generatedAt?: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1f2937',
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
  },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1e3a5f' },
  brandSub: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1e3a5f' },
  headerMeta: { fontSize: 8, color: '#6b7280', marginTop: 3 },
  // Owner info
  ownerSection: {
    backgroundColor: '#f0f4f8',
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  ownerName: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  ownerEmail: { fontSize: 9, color: '#6b7280' },
  ownerPeriod: { fontSize: 9, color: '#374151', marginTop: 4 },
  // Table
  table: { marginBottom: 20 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    padding: 8,
    borderRadius: 3,
    marginBottom: 1,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: { backgroundColor: '#f9fafb' },
  tableCell: { fontSize: 9, color: '#374151' },
  tableCellBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  tableCellOrange: { fontSize: 9, color: '#c2410c' },
  tableCellRed: { fontSize: 9, color: '#dc2626' },
  tableCellGreen: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f766e' },
  // Column widths
  colProperty: { flex: 2.5 },
  colNum: { flex: 1.2, textAlign: 'right' },
  // Totals row
  totalsRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 3,
    marginTop: 2,
  },
  totalsCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  // Summary cards
  summarySection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
  },
  cardGreen: { backgroundColor: '#f0fdf4' },
  cardOrange: { backgroundColor: '#fff7ed' },
  cardRed: { backgroundColor: '#fef2f2' },
  cardTeal: { backgroundColor: '#f0fdfa' },
  cardLabel: { fontSize: 7, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 },
  cardValue: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  cardValueGreen: { color: '#15803d' },
  cardValueOrange: { color: '#c2410c' },
  cardValueRed: { color: '#dc2626' },
  cardValueTeal: { color: '#0f766e' },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: '#9ca3af' },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  }).format(value)
}

// ─── PDF Document Component ───────────────────────────────────────────────────

function OwnerReportDocument({ data, periodLabel, generatedAt }: OwnerReportPDFProps) {
  const currency = data.owner.preferred_currency || 'EUR'
  const generated = generatedAt ?? new Date().toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <Document
      title={`Relatório ${data.owner.full_name} — ${periodLabel}`}
      author="Lodgra"
      creator="Lodgra"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Lodgra</Text>
            <Text style={s.brandSub}>Gestão de Alojamentos Locais</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Relatório do Proprietário</Text>
            <Text style={s.headerMeta}>Gerado em {generated}</Text>
          </View>
        </View>

        {/* Owner info */}
        <View style={s.ownerSection}>
          <Text style={s.ownerName}>{data.owner.full_name}</Text>
          {data.owner.email ? <Text style={s.ownerEmail}>{data.owner.email}</Text> : null}
          <Text style={s.ownerPeriod}>Período: {periodLabel}</Text>
        </View>

        {/* Summary cards */}
        <View style={s.summarySection}>
          <View style={[s.card, s.cardGreen]}>
            <Text style={s.cardLabel}>Receita Bruta</Text>
            <Text style={[s.cardValue, s.cardValueGreen]}>{fmt(data.summary.revenue, currency)}</Text>
          </View>
          <View style={[s.card, s.cardOrange]}>
            <Text style={s.cardLabel}>Comissão Gestão</Text>
            <Text style={[s.cardValue, s.cardValueOrange]}>{fmt(data.summary.managementFee, currency)}</Text>
          </View>
          <View style={[s.card, s.cardRed]}>
            <Text style={s.cardLabel}>Despesas</Text>
            <Text style={[s.cardValue, s.cardValueRed]}>{fmt(data.summary.expenses, currency)}</Text>
          </View>
          <View style={[s.card, s.cardTeal]}>
            <Text style={s.cardLabel}>Líquido Proprietário</Text>
            <Text style={[s.cardValue, s.cardValueTeal]}>{fmt(data.summary.ownerNet, currency)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.colProperty]}>Propriedade</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Receita Bruta</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Comissão</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Despesas</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Líquido</Text>
          </View>

          {data.properties.map((prop, i) => {
            const propCurrency = prop.currency || currency
            return (
              <View key={prop.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                <View style={s.colProperty}>
                  <Text style={s.tableCellBold}>{prop.name}</Text>
                  {prop.management_percentage > 0 && (
                    <Text style={[s.tableCell, { fontSize: 7, color: '#9ca3af' }]}>
                      {prop.management_percentage}% gestão
                    </Text>
                  )}
                </View>
                <Text style={[s.tableCell, s.colNum]}>{fmt(prop.revenue, propCurrency)}</Text>
                <Text style={[s.tableCellOrange, s.colNum]}>
                  {prop.management_percentage > 0 ? fmt(prop.managementFee, propCurrency) : '—'}
                </Text>
                <Text style={[s.tableCellRed, s.colNum]}>{fmt(prop.expenses, propCurrency)}</Text>
                <Text style={[s.tableCellGreen, s.colNum]}>{fmt(prop.ownerNet, propCurrency)}</Text>
              </View>
            )
          })}

          {/* Totals */}
          <View style={s.totalsRow}>
            <Text style={[s.totalsCell, s.colProperty]}>TOTAL</Text>
            <Text style={[s.totalsCell, s.colNum]}>{fmt(data.summary.revenue, currency)}</Text>
            <Text style={[s.totalsCell, s.colNum]}>{fmt(data.summary.managementFee, currency)}</Text>
            <Text style={[s.totalsCell, s.colNum]}>{fmt(data.summary.expenses, currency)}</Text>
            <Text style={[s.totalsCell, s.colNum]}>{fmt(data.summary.ownerNet, currency)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Lodgra — lodgra.pt</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}

// ─── Export: generate and trigger download ────────────────────────────────────

export async function downloadOwnerReportPDF(
  data: ReportData,
  periodLabel: string
) {
  const blob = await pdf(
    <OwnerReportDocument data={data} periodLabel={periodLabel} />
  ).toBlob()

  const slugify = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const ownerSlug = slugify(data.owner.full_name)
  const periodSlug = slugify(periodLabel)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-${ownerSlug}-${periodSlug}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
