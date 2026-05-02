import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'
import { getCategoryLabel } from '@/lib/utils/expense-categories'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Expense {
  id: string
  expense_date: string
  description: string
  notes: string | null
  category: string
  amount: number
  currency: string
  properties: Record<string, any>
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

function generateHtml(
  expenses: Expense[],
  startDate: string,
  endDate: string,
  propertyId: string,
  category: string,
  fileName: string,
  nonce: string
): string {
  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const mainCurrency = expenses[0]?.currency || 'EUR'

  const groupedByProperty = expenses.reduce((acc: Record<string, Expense[]>, e) => {
    const propId = e.properties.id
    if (!acc[propId]) acc[propId] = []
    acc[propId].push(e)
    return acc
  }, {})

  const groupedByCategory = expenses.reduce((acc: Record<string, number>, e) => {
    const cat = getCategoryLabel(e.category)
    acc[cat] = (acc[cat] || 0) + Number(e.amount)
    return acc
  }, {})

  const propertyLabel = propertyId ? 'Propriedade Selecionada' : 'Todas as Propriedades'
  const categoryLabel = category ? getCategoryLabel(category) : 'Todas'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatorio de Despesas</title>
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
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    .toolbar button:hover { background: #b91c1c; }
    .toolbar button.secondary { background: #6b7280; }
    .toolbar button.secondary:hover { background: #4b5563; }
    .content { margin-top: 70px; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; }
    h1 { color: #1f2937; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
    .info { margin: 20px 0; font-size: 13px; }
    .summary { background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .summary-item { margin: 8px 0; }
    .category-breakdown { margin: 15px 0; }
    .category-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    h2 { background: #dc2626; color: white; padding: 10px; margin: 20px 0 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
    th { background: #f0f0f0; font-weight: bold; }
    tr:nth-child(even) { background: #f9f9f9; }
    .currency { text-align: right; font-weight: bold; color: #dc2626; }
    .subtotal { background: #fef2f2; font-weight: bold; }
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
    <button id="btnDownload" type="button">Download PDF</button>
    <button id="btnPrint" type="button" class="secondary">Imprimir</button>
    <button id="btnClose" type="button" class="secondary">Fechar</button>
  </div>

  <div class="content">
    <div class="container">
      <h1>Relatorio de Despesas</h1>
      <p style="color: #666; font-size: 13px;">Lodgra - Gestao de Propriedades</p>

      <div class="info">
        <p><strong>Periodo:</strong> ${new Date(startDate).toLocaleDateString('pt-BR')} ate ${new Date(endDate).toLocaleDateString('pt-BR')}</p>
        <p><strong>Escopo:</strong> ${propertyLabel}</p>
        <p><strong>Categoria:</strong> ${categoryLabel}</p>
        <p><strong>Data de Geracao:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div class="summary">
        <div class="summary-item"><strong>Total de Despesas:</strong> ${expenses.length}</div>
        <div class="summary-item"><strong>Valor Total:</strong> ${formatCurrency(totalAmount, mainCurrency)}</div>
        ${expenses.length > 0 ? `<div class="summary-item"><strong>Media por Despesa:</strong> ${formatCurrency(totalAmount / expenses.length, mainCurrency)}</div>` : ''}
      </div>

      ${Object.keys(groupedByCategory).length > 0 ? `
      <h2 style="background: #374151;">Resumo por Categoria</h2>
      <div class="category-breakdown">
        ${Object.entries(groupedByCategory)
          .sort(([, a], [, b]) => b - a)
          .map(([cat, amount]) => `
            <div class="category-row">
              <span>${cat}</span>
              <span class="currency">${formatCurrency(amount, mainCurrency)}</span>
            </div>
          `).join('')}
      </div>` : ''}

      ${Object.entries(groupedByProperty)
        .map(([, propExpenses]: [string, Expense[]]) => {
          const propData = propExpenses[0]?.properties
          const propTotal = propExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
          return `
            <h2>${propData?.name || 'Propriedade'} ${propData?.city ? '- ' + propData.city : ''}</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Descricao</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${propExpenses
                  .map(e => `<tr>
                    <td>${new Date(e.expense_date).toLocaleDateString('pt-BR')}</td>
                    <td>${getCategoryLabel(e.category)}</td>
                    <td>${e.description}${e.notes ? ' (' + e.notes + ')' : ''}</td>
                    <td class="currency">${formatCurrency(Number(e.amount), e.currency || 'EUR')}</td>
                  </tr>`)
                  .join('')}
                <tr class="subtotal">
                  <td colspan="3" style="text-align: right;">Subtotal</td>
                  <td class="currency">${formatCurrency(propTotal, propExpenses[0]?.currency || 'EUR')}</td>
                </tr>
              </tbody>
            </table>
          `
        })
        .join('')}

      <div class="footer">
        <p>Este relatorio foi gerado automaticamente pelo sistema Lodgra.</p>
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
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const propertyId = searchParams.get('propertyId') || ''
    const category = searchParams.get('category') || ''

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate e endDate sao obrigatorios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const userPropertyIds = await getUserPropertyIds(supabase)

    let query = supabase
      .from('expenses')
      .select(`
        id,
        expense_date,
        description,
        notes,
        category,
        amount,
        currency,
        properties!inner(id, name, city, currency)
      `)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: true })

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }
    if (userPropertyIds) {
      query = query.in('property_id', userPropertyIds)
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data: expenses, error } = await query

    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 })
    }

    const fileName = `despesas-${startDate}-${endDate}.pdf`

    // Generate nonce for CSP (must be done before generateHtml)
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

    const html = generateHtml(
      expenses as Expense[],
      startDate,
      endDate,
      propertyId,
      category,
      fileName,
      nonce
    )

    // Return HTML as response with CSP headers
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
    console.error('Error generating expenses PDF:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatorio' },
      { status: 500 }
    )
  }
}
