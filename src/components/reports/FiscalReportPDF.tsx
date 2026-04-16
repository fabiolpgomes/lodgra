'use client'

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyFiscal {
  id: string
  name: string
  address: string
  currency: string
  totalRevenue: number
  deductibleExpenses: number
  taxableNet: number
}

interface FiscalData {
  owner: { id: string; full_name: string; email: string; preferred_currency: string; tax_id?: string | null }
  year: number
  properties: PropertyFiscal[]
  summary: { totalRevenue: number; deductibleExpenses: number; taxableNet: number }
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#6d28d9',
  },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#6d28d9' },
  brandSub: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#6d28d9' },
  headerSub: { fontSize: 9, color: '#374151', marginTop: 2 },
  headerMeta: { fontSize: 8, color: '#9ca3af', marginTop: 2 },
  // Legal badge
  legalBadge: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#a78bfa',
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  legalBadgeText: { fontSize: 8, color: '#5b21b6', fontFamily: 'Helvetica-Bold' },
  // Owner info
  ownerSection: {
    backgroundColor: '#f5f3ff',
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ownerLeft: { flex: 1 },
  ownerRight: { alignItems: 'flex-end' },
  ownerName: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  ownerEmail: { fontSize: 9, color: '#6b7280' },
  ownerLabel: { fontSize: 7, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 1 },
  ownerNif: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#5b21b6', letterSpacing: 1 },
  ownerNifMissing: { fontSize: 9, color: '#ef4444' },
  // Summary cards
  summarySection: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  card: { flex: 1, borderRadius: 4, padding: 10, alignItems: 'center' },
  cardBlue: { backgroundColor: '#eff6ff' },
  cardGreen: { backgroundColor: '#f0fdf4' },
  cardPurple: { backgroundColor: '#f5f3ff' },
  cardLabel: { fontSize: 7, color: '#6b7280', textTransform: 'uppercase', marginBottom: 3 },
  cardValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  cardValueBlue: { color: '#1d4ed8' },
  cardValueGreen: { color: '#15803d' },
  cardValuePurple: { color: '#6d28d9' },
  // Table
  table: { marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#6d28d9',
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
  tableCellGreen: { fontSize: 9, color: '#15803d' },
  tableCellPurple: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6d28d9' },
  colProperty: { flex: 2.5 },
  colNum: { flex: 1.2, textAlign: 'right' },
  totalsRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#6d28d9',
    borderRadius: 3,
    marginTop: 2,
  },
  totalsCell: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  // Disclaimer
  disclaimer: {
    backgroundColor: '#fffbeb',
    borderWidth: 0.5,
    borderColor: '#fbbf24',
    borderRadius: 3,
    padding: 8,
    marginTop: 12,
  },
  disclaimerText: { fontSize: 7.5, color: '#92400e', lineHeight: 1.5 },
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

// ─── PDF Document ─────────────────────────────────────────────────────────────

function FiscalDocument({ data }: { data: FiscalData }) {
  const currency = data.owner.preferred_currency || 'EUR'
  const generated = new Date().toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <Document
      title={`Mapa Rendimentos Prediais ${data.year} — ${data.owner.full_name}`}
      author="Home Stay"
      creator="Home Stay"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Home Stay</Text>
            <Text style={s.brandSub}>Gestão de Alojamentos Locais</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>Mapa de Rendimentos Prediais</Text>
            <Text style={s.headerSub}>Categoria F · IRS {data.year} · Art.º 8.º CIRS</Text>
            <Text style={s.headerMeta}>Gerado em {generated}</Text>
          </View>
        </View>

        {/* Legal reference badge */}
        <View style={s.legalBadge}>
          <Text style={s.legalBadgeText}>
            Rendimentos Prediais — Categoria F — IRS {data.year}
          </Text>
        </View>

        {/* Owner info with NIF */}
        <View style={s.ownerSection}>
          <View style={s.ownerLeft}>
            <Text style={s.ownerName}>{data.owner.full_name}</Text>
            {data.owner.email ? <Text style={s.ownerEmail}>{data.owner.email}</Text> : null}
          </View>
          <View style={s.ownerRight}>
            <Text style={s.ownerLabel}>NIF</Text>
            {data.owner.tax_id
              ? <Text style={s.ownerNif}>{data.owner.tax_id}</Text>
              : <Text style={s.ownerNifMissing}>Não preenchido</Text>
            }
          </View>
        </View>

        {/* Summary cards */}
        <View style={s.summarySection}>
          <View style={[s.card, s.cardBlue]}>
            <Text style={s.cardLabel}>Rendas Recebidas</Text>
            <Text style={[s.cardValue, s.cardValueBlue]}>{fmt(data.summary.totalRevenue, currency)}</Text>
          </View>
          <View style={[s.card, s.cardGreen]}>
            <Text style={s.cardLabel}>Deduções Cat. F</Text>
            <Text style={[s.cardValue, s.cardValueGreen]}>{fmt(data.summary.deductibleExpenses, currency)}</Text>
          </View>
          <View style={[s.card, s.cardPurple]}>
            <Text style={s.cardLabel}>Líquido Tributável</Text>
            <Text style={[s.cardValue, s.cardValuePurple]}>{fmt(data.summary.taxableNet, currency)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.colProperty]}>Imóvel / Identificação</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Rendas Recebidas</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Deduções</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Líquido Tributável</Text>
          </View>

          {data.properties.map((prop, i) => {
            const propCurrency = prop.currency || currency
            return (
              <View key={prop.id} style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}>
                <View style={s.colProperty}>
                  <Text style={s.tableCellBold}>{prop.name}</Text>
                  {prop.address && prop.address !== prop.name && (
                    <Text style={[s.tableCell, { fontSize: 7, color: '#9ca3af' }]}>{prop.address}</Text>
                  )}
                </View>
                <Text style={[s.tableCell, s.colNum]}>{fmt(prop.totalRevenue, propCurrency)}</Text>
                <Text style={[s.tableCellGreen, s.colNum]}>
                  {prop.deductibleExpenses > 0 ? `− ${fmt(prop.deductibleExpenses, propCurrency)}` : '—'}
                </Text>
                <Text style={[s.tableCellPurple, s.colNum]}>{fmt(prop.taxableNet, propCurrency)}</Text>
              </View>
            )
          })}

          <View style={s.totalsRow}>
            <Text style={[s.totalsCell, s.colProperty]}>TOTAL</Text>
            <Text style={[s.totalsCell, s.colNum]}>{fmt(data.summary.totalRevenue, currency)}</Text>
            <Text style={[s.totalsCell, s.colNum]}>
              {data.summary.deductibleExpenses > 0 ? `− ${fmt(data.summary.deductibleExpenses, currency)}` : '—'}
            </Text>
            <Text style={[s.totalsCell, s.colNum]}>{fmt(data.summary.taxableNet, currency)}</Text>
          </View>
        </View>

        {/* Legal disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerText}>
            Nota legal: Este mapa é apenas indicativo. Deduções incluem despesas de manutenção, reparações,
            seguros e impostos (Categoria F, art.º 41.º CIRS). Confirme com o seu contabilista antes de
            submeter a declaração de IRS. Retenção na fonte (25%) aplica-se quando o arrendatário é pessoa colectiva (art.º 101.º CIRS).
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Home Stay — homestay.pt · Documento gerado automaticamente</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}

// ─── Export function ──────────────────────────────────────────────────────────

export async function downloadFiscalReportPDF(data: FiscalData) {
  const blob = await pdf(<FiscalDocument data={data} />).toBlob()

  const slugify = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const ownerSlug = slugify(data.owner.full_name)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `categoria-f-${ownerSlug}-${data.year}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
