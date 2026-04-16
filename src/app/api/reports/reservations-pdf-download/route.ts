import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Reservation extends Record<string, any> {
  id: string
  check_in: string
  check_out: string
  status: string
  total_amount: number | null
  currency: string
  number_of_guests: number
  property_listings: Record<string, any>
  guests: Record<string, any> | null
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

function calculateTotalNights(reservations: Reservation[]): number {
  return reservations.reduce((total, r) => {
    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    return total + nights
  }, 0)
}

function generateHtml(
  reservations: Reservation[],
  startDate: string,
  endDate: string,
  propertyId: string,
  isAdmin: boolean,
  fileName: string,
  nonce: string
): string {
  const totalAmount = reservations.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)
  const groupedByProperty = reservations.reduce((acc: Record<string, Reservation[]>, r) => {
    const propId = r.property_listings.properties.id
    if (!acc[propId]) acc[propId] = []
    acc[propId].push(r)
    return acc
  }, {})

  const propertyLabel = propertyId ? 'Propriedade Selecionada' : 'Todas as Propriedades'
  const totalNights = calculateTotalNights(reservations)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Reservas</title>
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
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    .toolbar button:hover { background: #2563eb; }
    .toolbar button.secondary { background: #6b7280; }
    .toolbar button.secondary:hover { background: #4b5563; }
    .content { margin-top: 70px; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; }
    h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    .info { margin: 20px 0; font-size: 13px; }
    .summary { background: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .summary-item { margin: 8px 0; }
    h2 { background: #3b82f6; color: white; padding: 10px; margin: 20px 0 10px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
    th { background: #f0f0f0; font-weight: bold; }
    tr:nth-child(even) { background: #f9f9f9; }
    .currency { text-align: right; font-weight: bold; color: #059669; }
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
      <h1>Relatório de Reservas</h1>
      <p style="color: #666; font-size: 13px;">Home Stay - Gestão de Propriedades</p>

      <div class="info">
        <p><strong>Período:</strong> ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}</p>
        <p><strong>Escopo:</strong> ${propertyLabel}</p>
        <p><strong>Data de Geração:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div class="summary">
        <div class="summary-item"><strong>Total de Reservas:</strong> ${reservations.length}</div>
        ${isAdmin ? `<div class="summary-item"><strong>Receita Total:</strong> ${formatCurrency(totalAmount, 'EUR')}</div>` : ''}
        ${isAdmin ? `<div class="summary-item"><strong>Média por Reserva:</strong> ${reservations.length > 0 ? formatCurrency(totalAmount / reservations.length, 'EUR') : '€0,00'}</div>` : ''}
        <div class="summary-item"><strong>Noites Reservadas:</strong> ${totalNights}</div>
      </div>

      ${Object.entries(groupedByProperty)
        .map(([, propReservations]: [string, Reservation[]]) => {
          const propData = propReservations[0]?.property_listings.properties
          return `
            <h2>${propData?.name || 'Propriedade'} - ${propData?.city || ''}</h2>
            <table>
              <thead>
                <tr>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Hóspede</th>
                  <th>Noites</th>
                  ${isAdmin ? '<th>Valor</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${propReservations
                  .map(r => {
                    const checkIn = new Date(r.check_in)
                    const checkOut = new Date(r.check_out)
                    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
                    const guest = r.guests
                    const guestName = guest ? guest.first_name + ' ' + guest.last_name : 'N/A'
                    return `<tr>
                      <td>${checkIn.toLocaleDateString('pt-BR')}</td>
                      <td>${checkOut.toLocaleDateString('pt-BR')}</td>
                      <td>${guestName}</td>
                      <td>${nights}</td>
                      ${isAdmin ? '<td class="currency">' + formatCurrency(Number(r.total_amount) || 0, r.currency || 'EUR') + '</td>' : ''}
                    </tr>`
                  })
                  .join('')}
              </tbody>
            </table>
          `
        })
        .join('')}

      <div class="footer">
        <p>Este relatório foi gerado automaticamente pelo sistema Home Stay.</p>
        <p>&copy; ${new Date().getFullYear()} Home Stay. Todos os direitos reservados.</p>
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
    const auth = await requireRole(['admin', 'gestor', 'viewer', 'guest'])
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const propertyId = searchParams.get('propertyId') || ''
    const roleParam = searchParams.get('role') || auth.role || 'viewer'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate e endDate são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const userPropertyIds = await getUserPropertyIds(supabase)
    const isAdmin = roleParam === 'admin'

    // Build query
    let reservationsQuery = supabase
      .from('reservations')
      .select(`
        id,
        check_in,
        check_out,
        status,
        total_amount,
        currency,
        number_of_guests,
        property_listings!inner(
          properties!inner(
            id,
            name,
            city
          )
        ),
        guests(
          first_name,
          last_name,
          email
        )
      `)
      .eq('status', 'confirmed')
      .lte('check_in', endDate)
      .gte('check_out', startDate)
      .order('check_in', { ascending: true })

    // Filter by property
    if (propertyId) {
      reservationsQuery = reservationsQuery.eq('property_listings.property_id', propertyId)
    }
    if (userPropertyIds) {
      reservationsQuery = reservationsQuery.in('property_listings.property_id', userPropertyIds)
    }

    const { data: reservations, error } = await reservationsQuery

    if (error) {
      console.error('Error fetching reservations:', error)
      return NextResponse.json({ error: 'Erro ao buscar reservas' }, { status: 500 })
    }

    const fileName = `reservas-${startDate}-${endDate}.pdf`

    // Generate nonce for CSP (must be done before generateHtml)
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

    // Generate HTML with embedded PDF download capability
    const html = generateHtml(
      reservations as Reservation[],
      startDate,
      endDate,
      propertyId,
      isAdmin,
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
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatório' },
      { status: 500 }
    )
  }
}
