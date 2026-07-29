export interface SeriousIssueConfirmationEmailData {
  reservation_id: string
  guest_name: string
  property_name: string
  decision: 'APPROVED' | 'PARTIAL' | 'DENIED'
  refund_amount: number
  stripe_refund_id?: string
}

export function seriousIssueConfirmationTemplate(data: SeriousIssueConfirmationEmailData) {
  const decisionLabel = {
    APPROVED: 'Reembolso Completo',
    PARTIAL: 'Reembolso Parcial',
    DENIED: 'Sem Reembolso',
  }[data.decision]

  const statusBadge = {
    APPROVED: '✅',
    PARTIAL: '⚠️',
    DENIED: '❌',
  }[data.decision]

  return {
    subject: `[CONFIRMADO] Caso Resolvido — ${data.property_name} — ${statusBadge}`,
    html: `
      <h1>Caso de Serious Issue Resolvido</h1>
      <p>O seguinte caso foi revisado e processado:</p>

      <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>ID da Reserva</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><code>${data.reservation_id}</code></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>Hóspede</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${data.guest_name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>Propriedade</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${data.property_name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>Decisão</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>${statusBadge} ${decisionLabel}</strong></td>
          </tr>
          ${data.decision !== 'DENIED' ? `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>Valor do Reembolso</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #dee2e6;"><strong>€${data.refund_amount.toFixed(2)}</strong></td>
          </tr>
          ${data.stripe_refund_id ? `
          <tr>
            <td style="padding: 10px;"><strong>ID do Refund (Stripe)</strong></td>
            <td style="padding: 10px;"><code>${data.stripe_refund_id}</code></td>
          </tr>
          ` : ''}
          ` : ''}
        </table>
      </div>

      <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #004085;">
          <strong>Status:</strong> O caso foi processado e o hóspede foi notificado por email.
        </p>
      </div>

      <p style="color: #6c757d; font-size: 12px;">
        ${data.decision !== 'DENIED' ? `O reembolso será processado em 3-5 dias úteis. Stripe ID: ${data.stripe_refund_id || 'Processando...'}` : 'Nenhum reembolso será processado.'}
      </p>

      <hr style="border: none; border-top: 1px solid #dee2e6; margin: 40px 0;">
      <p style="color: #6c757d; font-size: 12px;">
        Sistema Lodgra — Gestão de Reservas
      </p>
    `,
    text: `
      CASO RESOLVIDO - SERIOUS ISSUE

      ID da Reserva: ${data.reservation_id}
      Hóspede: ${data.guest_name}
      Propriedade: ${data.property_name}
      Decisão: ${statusBadge} ${decisionLabel}
      ${data.decision !== 'DENIED' ? `Reembolso: €${data.refund_amount.toFixed(2)}` : 'Sem Reembolso'}
      ${data.stripe_refund_id ? `Stripe Refund ID: ${data.stripe_refund_id}` : ''}

      O hóspede foi notificado por email.
      ${data.decision !== 'DENIED' ? 'O reembolso será processado em 3-5 dias úteis.' : ''}

      Sistema Lodgra
    `,
  }
}
