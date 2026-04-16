import { Resend } from 'resend'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  return new Resend(apiKey)
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'Home Stay <noreply@resend.dev>'
const ADMIN_EMAIL = process.env.EMAIL_ADMIN || ''

interface OwnerReservationNotification {
  ownerName: string
  ownerEmail: string
  guestName: string
  propertyName: string
  checkIn: string
  checkOut: string
  nights: number
  totalAmount?: string
  currency?: string
  source?: string
}

interface OwnerCancellationNotification {
  ownerName: string
  ownerEmail: string
  guestName: string
  propertyName: string
  checkIn: string
  checkOut: string
  nights: number
  cancellationReason?: string
  source?: string
}

interface CheckInNotification {
  guestName: string
  guestEmail?: string
  propertyName: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  totalAmount?: string
  currency?: string
}

/**
 * Enviar resumo diário de check-ins e check-outs ao admin
 */
export async function sendDailySummary({
  date,
  checkIns,
  checkOuts,
}: {
  date: string
  checkIns: CheckInNotification[]
  checkOuts: CheckInNotification[]
}) {
  if (!ADMIN_EMAIL) {
    console.warn('EMAIL_ADMIN não configurado, pulando envio de resumo diário')
    return null
  }

  const formattedDate = new Date(date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const checkInRows = checkIns.map(ci => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${ci.guestName}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${ci.propertyName}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${ci.nights} noites</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${ci.guests} hóspedes</td>
    </tr>
  `).join('')

  const checkOutRows = checkOuts.map(co => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${co.guestName}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${co.propertyName}</td>
    </tr>
  `).join('')

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Home Stay - Resumo Diário</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">${formattedDate}</p>
      </div>

      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb;">
        ${checkIns.length > 0 ? `
          <h2 style="color: #16a34a; font-size: 16px; margin: 0 0 12px;">
            Chegadas Hoje (${checkIns.length})
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Hóspede</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Propriedade</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Duração</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Hóspedes</th>
              </tr>
            </thead>
            <tbody>${checkInRows}</tbody>
          </table>
        ` : `
          <p style="color: #6b7280; margin-bottom: 24px;">Nenhuma chegada prevista para hoje.</p>
        `}

        ${checkOuts.length > 0 ? `
          <h2 style="color: #dc2626; font-size: 16px; margin: 0 0 12px;">
            Saídas Hoje (${checkOuts.length})
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Hóspede</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Propriedade</th>
              </tr>
            </thead>
            <tbody>${checkOutRows}</tbody>
          </table>
        ` : `
          <p style="color: #6b7280;">Nenhuma saída prevista para hoje.</p>
        `}
      </div>

      <div style="background: #f9fafb; padding: 16px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Enviado automaticamente pelo Home Stay
        </p>
      </div>
    </div>
  `

  try {
    const resend = getResendClient()
    if (!resend) {
      console.warn('RESEND_API_KEY não configurado, pulando envio de email')
      return null
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Home Stay - ${checkIns.length} chegada(s) e ${checkOuts.length} saída(s) hoje`,
      html,
    })

    if (error) {
      console.error('Erro ao enviar email de resumo:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Erro ao enviar email:', err)
    return null
  }
}

/**
 * Enviar email de confirmação de reserva ao hóspede
 */
export async function sendReservationConfirmation(data: CheckInNotification) {
  if (!data.guestEmail) return null

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Confirmação de Reserva</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">Home Stay</p>
      </div>

      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px; color: #374151;">
          Olá <strong>${data.guestName}</strong>,
        </p>
        <p style="color: #6b7280;">A sua reserva está confirmada:</p>

        <table style="width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Propriedade</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.propertyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Check-in</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${new Date(data.checkIn).toLocaleDateString('pt-BR')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Check-out</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${new Date(data.checkOut).toLocaleDateString('pt-BR')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Duração</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.nights} noite(s)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Hóspedes</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.guests}</td>
          </tr>
          ${data.totalAmount ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Valor Total</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.totalAmount} ${data.currency || 'EUR'}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div style="background: #f9fafb; padding: 16px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Home Stay - Sistema de Gestão de Alojamentos
        </p>
      </div>
    </div>
  `

  try {
    const resend = getResendClient()
    if (!resend) {
      console.warn('RESEND_API_KEY não configurado, pulando envio de email')
      return null
    }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.guestEmail,
      subject: `Confirmação de Reserva - ${data.propertyName}`,
      html,
    })

    if (error) {
      console.error('Erro ao enviar confirmação:', error)
      return null
    }

    return result
  } catch (err) {
    console.error('Erro ao enviar email:', err)
    return null
  }
}

/**
 * Enviar notificação de nova reserva ao proprietário do imóvel
 */
export async function sendOwnerReservationNotification(data: OwnerReservationNotification) {
  if (!data.ownerEmail) {
    console.warn('Owner sem email, pulando notificação de reserva')
    return null
  }

  const sourceLabel: Record<string, string> = {
    manual: 'Manual',
    ical_import: 'Importação iCal',
    ical_auto_sync: 'Sincronização Automática',
    airbnb: 'Airbnb',
    booking: 'Booking.com',
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Nova Reserva</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">${data.propertyName}</p>
      </div>

      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px; color: #374151;">
          Olá <strong>${data.ownerName}</strong>,
        </p>
        <p style="color: #6b7280;">Uma nova reserva foi registada para a sua propriedade:</p>

        <table style="width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Hóspede</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.guestName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Propriedade</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.propertyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Check-in</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${new Date(data.checkIn).toLocaleDateString('pt-BR')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Check-out</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${new Date(data.checkOut).toLocaleDateString('pt-BR')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Duração</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.nights} noite(s)</td>
          </tr>
          ${data.totalAmount ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Valor Total</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.totalAmount} ${data.currency || 'EUR'}</td>
          </tr>
          ` : ''}
          ${data.source ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Origem</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${sourceLabel[data.source] || data.source}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div style="background: #f9fafb; padding: 16px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Home Stay - Sistema de Gestão de Alojamentos
        </p>
      </div>
    </div>
  `

  try {
    const resend = getResendClient()
    if (!resend) {
      console.warn('RESEND_API_KEY não configurado, pulando envio de email')
      return null
    }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.ownerEmail,
      subject: `Nova Reserva - ${data.propertyName}`,
      html,
    })

    if (error) {
      console.error('Erro ao enviar notificação ao proprietário:', error)
      return null
    }

    return result
  } catch (err) {
    console.error('Erro ao enviar email ao proprietário:', err)
    return null
  }
}

/**
 * Enviar notificação de cancelamento de reserva ao proprietário do imóvel
 */
export async function sendOwnerCancellationNotification(data: OwnerCancellationNotification) {
  if (!data.ownerEmail) {
    console.warn('Owner sem email, pulando notificação de cancelamento')
    return null
  }

  const sourceLabel: Record<string, string> = {
    manual: 'Manual',
    ical_import: 'Importação iCal',
    ical_auto_sync: 'Sincronização Automática',
    airbnb: 'Airbnb',
    booking: 'Booking.com',
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc2626; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Reserva Cancelada</h1>
        <p style="margin: 8px 0 0; opacity: 0.9;">${data.propertyName}</p>
      </div>

      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb;">
        <p style="font-size: 16px; color: #374151;">
          Olá <strong>${data.ownerName}</strong>,
        </p>
        <p style="color: #6b7280;">Uma reserva foi cancelada na sua propriedade:</p>

        <table style="width: 100%; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Hóspede</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.guestName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Propriedade</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.propertyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Check-in</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${new Date(data.checkIn).toLocaleDateString('pt-BR')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Check-out</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${new Date(data.checkOut).toLocaleDateString('pt-BR')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Duração</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.nights} noite(s)</td>
          </tr>
          ${data.cancellationReason ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Motivo</td>
            <td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${data.cancellationReason}</td>
          </tr>
          ` : ''}
          ${data.source ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Origem</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">${sourceLabel[data.source] || data.source}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <div style="background: #f9fafb; padding: 16px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Home Stay - Sistema de Gestão de Alojamentos
        </p>
      </div>
    </div>
  `

  try {
    const resend = getResendClient()
    if (!resend) {
      console.warn('RESEND_API_KEY não configurado, pulando envio de email')
      return null
    }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.ownerEmail,
      subject: `Reserva Cancelada - ${data.propertyName}`,
      html,
    })

    if (error) {
      console.error('Erro ao enviar notificação de cancelamento ao proprietário:', error)
    }

    // Enviar cópia ao admin
    if (ADMIN_EMAIL && ADMIN_EMAIL !== data.ownerEmail) {
      const adminHtml = html
        .replace(`Olá <strong>${data.ownerName}</strong>`, 'Olá <strong>Admin</strong>')
        .replace('Uma reserva foi cancelada na sua propriedade:', `Uma reserva foi cancelada na propriedade <strong>${data.propertyName}</strong> (proprietário: ${data.ownerName}):`)

      resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `Reserva Cancelada - ${data.propertyName}`,
        html: adminHtml,
      }).catch(err => console.error('Erro ao enviar notificação de cancelamento ao admin:', err))
    }

    return result || null
  } catch (err) {
    console.error('Erro ao enviar email de cancelamento ao proprietário:', err)
    return null
  }
}
