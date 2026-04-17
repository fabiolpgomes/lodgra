import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

interface Reservation {
  id: string
  check_in: string
  check_out: string
  total_amount: number | null
  platform_fee: number | null
  net_amount: number | null
  currency: string
  source: string | null
  property_listings: { name: string } | null
  guests: { first_name: string; last_name: string } | null
}

interface Expense {
  id: string
  expense_date: string
  amount: number
  currency: string
  category: string
  description: string
  notes: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: { id: string; name: string; currency: string } | any
}

interface PropertyData {
  id: string
  name: string
  management_percentage: number
  owners: { full_name: string } | null
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

function groupByCurrency(
  items: Array<{ currency: string; amount: number }>
): Record<string, number> {
  return items.reduce((acc: Record<string, number>, item) => {
    const currency = item.currency || 'EUR'
    acc[currency] = (acc[currency] || 0) + (item.amount || 0)
    return acc
  }, {})
}

function normalizeChannelName(source: string | null): string {
  if (!source) return 'Outros'
  const lower = source.toLowerCase()
  if (lower.includes('airbnb')) return 'Airbnb'
  if (lower.includes('booking')) return 'Booking.com'
  if (lower.includes('directo') || lower.includes('direct')) return 'Direto'
  if (lower.includes('expedia')) return 'Expedia'
  if (lower.includes('vrbo')) return 'VRBO'
  return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase()
}

function generateHtml(
  data: {
    revenueByCurrency: Record<string, number>
    platformFeesByCurrency: Record<string, number>
    netRevenueByCurrency: Record<string, number>
    operationalByCurrency: Record<string, number>
    taxByCurrency: Record<string, number>
    netProfitByCurrency: Record<string, number>
    propertyStats: Array<{
      id: string
      name: string
      revenue: number
      reservations: number
      nights: number
      managementFee: number
      ownerNet: number
    }>
    monthlyStats: Array<{
      monthKey: string
      month: string
      revenue: number
      reservations: number
      nights: number
    }>
    channelStats: Array<{
      name: string
      revenue: number
      reservations: number
    }>
    totalReservations: number
    occupancyRate: number
    startDate: string
    endDate: string
    propertyLabel: string
  },
  fileName: string,
  nonce: string
): string {
  const currencies = Object.keys(data.revenueByCurrency)
  const mainCurrency = currencies[0] || 'EUR'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Financeiro</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: white;
      padding: 15px 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 1000;
      display: flex;
      gap: 10px;
    }
    .toolbar button {
      padding: 10px 20px;
      background: #1d4ed8;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    .toolbar button:hover { background: #1e40af; }
    .toolbar button.secondary { background: #6b7280; }
    .toolbar button.secondary:hover { background: #4b5563; }
    .content { margin-top: 70px; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; }
    h1 { color: #1f2937; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; }
    .info { margin: 20px 0; font-size: 13px; }
    .summary { background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .summary-item { margin: 8px 0; font-size: 13px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
    h2 { background: #1d4ed8; color: white; padding: 10px; margin: 20px 0 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
    th { background: #f0f0f0; font-weight: bold; }
    tr:nth-child(even) { background: #f9f9f9; }
    .currency { text-align: right; font-weight: bold; color: #1d4ed8; }
    .text-right { text-align: right; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; text-align: center; color: #666; }
    @media print {
      .toolbar { display: none !important; }
      body { background: white; padding: 0; }
      .content { margin-top: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button id="btnDownload" type="button">📥 Download PDF</button>
    <button id="btnPrint" type="button" class="secondary">🖨️ Imprimir</button>
    <button id="btnClose" type="button" class="secondary">✕ Fechar</button>
  </div>

  <div class="content">
    <div class="container">
      <h1>Relatório Financeiro</h1>
      <p style="color: #666; font-size: 13px;">Lodgra - Gestão de Propriedades</p>

      <div class="info">
        <p><strong>Período:</strong> ${new Date(data.startDate).toLocaleDateString('pt-BR')} até ${new Date(data.endDate).toLocaleDateString('pt-BR')}</p>
        <p><strong>Escopo:</strong> ${data.propertyLabel}</p>
        <p><strong>Data de Geração:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div class="summary">
        <div class="summary-item"><strong>Total de Reservas:</strong> ${data.totalReservations}</div>
        <div class="summary-item"><strong>Taxa de Ocupação:</strong> ${data.occupancyRate.toFixed(1)}%</div>
        ${currencies.map(curr => `
          <div class="summary-grid">
            <div class="summary-item"><strong>Receita Bruta (${curr}):</strong> ${formatCurrency(data.revenueByCurrency[curr], curr)}</div>
            <div class="summary-item"><strong>Receita Líquida (${curr}):</strong> ${formatCurrency(data.netRevenueByCurrency[curr], curr)}</div>
            <div class="summary-item"><strong>Despesas (${curr}):</strong> ${formatCurrency(data.operationalByCurrency[curr] + data.taxByCurrency[curr], curr)}</div>
            <div class="summary-item"><strong>Lucro Líquido (${curr}):</strong> ${formatCurrency(data.netProfitByCurrency[curr], curr)}</div>
          </div>
        `).join('')}
      </div>

      <h2>Demonstrativo de Resultado por Moeda</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            ${currencies.map(c => `<th class="text-right">${c}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Receita Bruta</strong></td>
            ${currencies.map(c => `<td class="currency">${formatCurrency(data.revenueByCurrency[c], c)}</td>`).join('')}
          </tr>
          <tr>
            <td>Taxas de Plataforma</td>
            ${currencies.map(c => `<td class="currency">${formatCurrency(data.platformFeesByCurrency[c], c)}</td>`).join('')}
          </tr>
          <tr>
            <td><strong>Receita Líquida</strong></td>
            ${currencies.map(c => `<td class="currency">${formatCurrency(data.netRevenueByCurrency[c], c)}</td>`).join('')}
          </tr>
          <tr>
            <td>Despesas Operacionais</td>
            ${currencies.map(c => `<td class="currency">${formatCurrency(data.operationalByCurrency[c], c)}</td>`).join('')}
          </tr>
          <tr>
            <td>Impostos</td>
            ${currencies.map(c => `<td class="currency">${formatCurrency(data.taxByCurrency[c], c)}</td>`).join('')}
          </tr>
          <tr style="background: #fef2f2; font-weight: bold;">
            <td><strong>Lucro Líquido</strong></td>
            ${currencies.map(c => `<td class="currency">${formatCurrency(data.netProfitByCurrency[c], c)}</td>`).join('')}
          </tr>
          <tr style="background: #fef2f2; font-weight: bold;">
            <td><strong>Margem (%)</strong></td>
            ${currencies.map(c => {
              const margin = data.netRevenueByCurrency[c] > 0
                ? ((data.netProfitByCurrency[c] / data.netRevenueByCurrency[c]) * 100).toFixed(1)
                : '0.0'
              return `<td class="text-right">${margin}%</td>`
            }).join('')}
          </tr>
        </tbody>
      </table>

      ${data.propertyStats.length > 0 ? `
      <h2>Análise por Propriedade</h2>
      <table>
        <thead>
          <tr>
            <th>Propriedade</th>
            <th class="text-right">Receita</th>
            <th class="text-right">Reservas</th>
            <th class="text-right">Noites</th>
            <th class="text-right">Comissão Gestão</th>
            <th class="text-right">Líquido Proprietário</th>
          </tr>
        </thead>
        <tbody>
          ${data.propertyStats.map(prop => `
            <tr>
              <td>${prop.name}</td>
              <td class="currency">${formatCurrency(prop.revenue, mainCurrency)}</td>
              <td class="text-right">${prop.reservations}</td>
              <td class="text-right">${prop.nights}</td>
              <td class="currency">${formatCurrency(prop.managementFee, mainCurrency)}</td>
              <td class="currency">${formatCurrency(prop.ownerNet, mainCurrency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}

      ${data.monthlyStats.length > 0 ? `
      <h2>Receita por Mês</h2>
      <table>
        <thead>
          <tr>
            <th>Mês</th>
            <th class="text-right">Receita</th>
            <th class="text-right">Reservas</th>
            <th class="text-right">Noites</th>
          </tr>
        </thead>
        <tbody>
          ${data.monthlyStats.map(month => `
            <tr>
              <td>${month.month}</td>
              <td class="currency">${formatCurrency(month.revenue, mainCurrency)}</td>
              <td class="text-right">${month.reservations}</td>
              <td class="text-right">${month.nights}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}

      ${data.channelStats.length > 0 ? `
      <h2>Receita por Canal</h2>
      <table>
        <thead>
          <tr>
            <th>Canal</th>
            <th class="text-right">Receita</th>
            <th class="text-right">Reservas</th>
            <th class="text-right">% do Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.channelStats.map(channel => {
            const percentage = data.totalReservations > 0
              ? ((channel.reservations / data.totalReservations) * 100).toFixed(1)
              : '0.0'
            return `
            <tr>
              <td>${channel.name}</td>
              <td class="currency">${formatCurrency(channel.revenue, mainCurrency)}</td>
              <td class="text-right">${channel.reservations}</td>
              <td class="text-right">${percentage}%</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
      ` : ''}

      <div class="footer">
        <p>Este relatório foi gerado automaticamente pelo sistema Lodgra.</p>
        <p>&copy; ${new Date().getFullYear()} Lodgra. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    function setupButtons() {
      var btnDownload = document.getElementById('btnDownload');
      var btnPrint = document.getElementById('btnPrint');
      var btnClose = document.getElementById('btnClose');

      if (btnDownload) {
        btnDownload.addEventListener('click', function(e) {
          e.preventDefault();
          var element = document.querySelector('.container');
          if (window.html2pdf && element) {
            window.html2pdf().set({
              margin: 10,
              filename: '${fileName}',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
            }).from(element).save();
          }
        });
      }

      if (btnPrint) {
        btnPrint.addEventListener('click', function(e) {
          e.preventDefault();
          window.print();
        });
      }

      if (btnClose) {
        btnClose.addEventListener('click', function(e) {
          e.preventDefault();
          window.close();
        });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupButtons);
    } else {
      setupButtons();
    }
  <\/script>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const propertyId = searchParams.get('propertyId') || ''

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate e endDate são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const userPropertyIds = await getUserPropertyIds(supabase)

    // Reservations query
    let reservationsQuery = supabase
      .from('reservations')
      .select(
        `id, check_in, check_out, total_amount, platform_fee, net_amount, currency, source,
         status, property_listings!inner(property_id, properties!inner(id, name, city)),
         guests(first_name, last_name)`
      )
      .eq('status', 'confirmed')
      .lte('check_in', endDate)
      .gte('check_out', startDate)

    if (propertyId) {
      reservationsQuery = reservationsQuery.eq('property_listings.properties.id', propertyId)
    }
    if (userPropertyIds) {
      reservationsQuery = reservationsQuery.in('property_listings.properties.id', userPropertyIds)
    }

    // Expenses query
    let expensesQuery = supabase
      .from('expenses')
      .select(`id, expense_date, amount, currency, category, description, notes, property_id, properties(id, name, currency)`)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    if (propertyId) {
      expensesQuery = expensesQuery.eq('property_id', propertyId)
    }
    if (userPropertyIds) {
      expensesQuery = expensesQuery.in('property_id', userPropertyIds)
    }

    // Properties query
    let propertiesQuery = supabase
      .from('properties')
      .select(`id, name, management_percentage, owners(full_name)`)
      .eq('is_active', true)

    if (userPropertyIds) {
      propertiesQuery = propertiesQuery.in('id', userPropertyIds)
    }

    // Queries em paralelo
    const [reservationsResult, expensesResult, propertiesResult] = await Promise.all([
      reservationsQuery,
      expensesQuery,
      propertiesQuery,
    ])

    const { data: reservations, error: resError } = reservationsResult
    const { data: expenses, error: expError } = expensesResult
    const { data: properties, error: propError } = propertiesResult

    if (resError || expError || propError) {
      console.error('Errors:', { resError, expError, propError })
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    // Cálculos
    const reservationsList = (reservations as unknown as Reservation[]) || []
    const expensesList = (expenses as unknown as Expense[]) || []
    const propertiesList = (properties as unknown as PropertyData[]) || []

    // Cálculos financeiros
    const revenueByCurrency = groupByCurrency(
      reservationsList.map(r => ({ currency: r.currency, amount: Number(r.total_amount) || 0 }))
    )
    const platformFeesByCurrency = groupByCurrency(
      reservationsList.map(r => ({ currency: r.currency, amount: Number(r.platform_fee) || 0 }))
    )
    const netRevenueByCurrency = groupByCurrency(
      reservationsList.map(r => ({ currency: r.currency, amount: Number(r.net_amount) || Number(r.total_amount) || 0 }))
    )

    const operationalExpenses = expensesList.filter(e => e.category !== 'taxes')
    const taxExpenses = expensesList.filter(e => e.category === 'taxes')

    const operationalByCurrency = groupByCurrency(
      operationalExpenses.map(e => ({ currency: e.currency, amount: e.amount }))
    )
    const taxByCurrency = groupByCurrency(
      taxExpenses.map(e => ({ currency: e.currency, amount: e.amount }))
    )

    const netProfitByCurrency: Record<string, number> = {}
    Object.keys(revenueByCurrency).forEach(curr => {
      netProfitByCurrency[curr] =
        (netRevenueByCurrency[curr] || 0) - (operationalByCurrency[curr] || 0) - (taxByCurrency[curr] || 0)
    })

    // Property Stats
    const propertyMap = new Map(propertiesList.map(p => [p.id, p]))
    const propertyStatsMap = new Map<
      string,
      { revenue: number; reservations: number; nights: number }
    >()

    reservationsList.forEach(r => {
      const listing = r.property_listings as unknown as { properties: { id: string; name: string; city: string } } | null
      const propId = listing?.properties?.id
      if (!propId) return

      if (!propertyStatsMap.has(propId)) {
        propertyStatsMap.set(propId, { revenue: 0, reservations: 0, nights: 0 })
      }
      const stat = propertyStatsMap.get(propId)!
      stat.revenue += Number(r.total_amount) || 0
      stat.reservations += 1
      const nights = Math.ceil(
        (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / (1000 * 60 * 60 * 24)
      )
      stat.nights += nights
    })

    const propertyStats = Array.from(propertyStatsMap).map(([propId, stat]) => {
      const propData = propertyMap.get(propId)
      const mgmtPercentage = propData?.management_percentage || 0
      const mgmtFee = stat.revenue * (mgmtPercentage / 100)
      const ownerNet = stat.revenue - mgmtFee
      return {
        id: propId,
        name: propData?.name || 'N/A',
        revenue: stat.revenue,
        reservations: stat.reservations,
        nights: stat.nights,
        managementFee: mgmtFee,
        ownerNet: ownerNet,
      }
    })

    // Monthly Stats
    const monthlyMap = new Map<string, { revenue: number; reservations: number; nights: number }>()
    reservationsList.forEach(r => {
      const monthKey = r.check_in.substring(0, 7)
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { revenue: 0, reservations: 0, nights: 0 })
      }
      const stat = monthlyMap.get(monthKey)!
      stat.revenue += Number(r.total_amount) || 0
      stat.reservations += 1
      const nights = Math.ceil(
        (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / (1000 * 60 * 60 * 24)
      )
      stat.nights += nights
    })

    const monthlyStats = Array.from(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, stat]) => {
        const [year, month] = monthKey.split('-')
        const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        return {
          monthKey,
          month: `${monthNames[parseInt(month)]} ${year}`,
          ...stat,
        }
      })

    // Channel Stats
    const channelMap = new Map<string, { revenue: number; reservations: number }>()
    reservationsList.forEach(r => {
      const channel = normalizeChannelName(r.source)
      if (!channelMap.has(channel)) {
        channelMap.set(channel, { revenue: 0, reservations: 0 })
      }
      const stat = channelMap.get(channel)!
      stat.revenue += Number(r.total_amount) || 0
      stat.reservations += 1
    })

    const channelStats = Array.from(channelMap)
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.revenue - a.revenue)

    // Occupancy Rate
    const totalNights = reservationsList.reduce((sum, r) => {
      const nights = Math.ceil(
        (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / (1000 * 60 * 60 * 24)
      )
      return sum + nights
    }, 0)
    const dayRange = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    )
    const totalAvailableNights = dayRange * propertiesList.length
    const occupancyRate = totalAvailableNights > 0 ? (totalNights / totalAvailableNights) * 100 : 0

    const fileName = `relatorio-financeiro-${startDate}-${endDate}.pdf`
    const propertyLabel = propertyId ? 'Propriedade Selecionada' : 'Todas as Propriedades'

    // Gerar nonce ANTES de generateHtml
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

    const html = generateHtml(
      {
        revenueByCurrency,
        platformFeesByCurrency,
        netRevenueByCurrency,
        operationalByCurrency,
        taxByCurrency,
        netProfitByCurrency,
        propertyStats,
        monthlyStats,
        channelStats,
        totalReservations: reservationsList.length,
        occupancyRate,
        startDate,
        endDate,
        propertyLabel,
      },
      fileName,
      nonce
    )

    // Return HTML response with CSP headers
    const response = new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': [
          "default-src 'self'",
          `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://js.stripe.com https://*.sentry.io https://cdnjs.cloudflare.com`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://region1.google-analytics.com https://js.stripe.com https://api.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://cdnjs.cloudflare.com",
          "font-src 'self' data:",
          "worker-src 'self' blob:",
          "frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    })
    return response
  } catch (error) {
    console.error('Error generating financial report:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatório' },
      { status: 500 }
    )
  }
}
