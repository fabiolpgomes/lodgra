export interface RefundProcessedEmailData {
  organizationName: string
  guestName: string
  bookingId: string
  refundAmount: number
  currency: string
  reason: string
}

export function refundProcessedTemplate(data: RefundProcessedEmailData) {
  return {
    subject: `Reembolso Processado — Reserva ${data.bookingId}`,
    html: `
      <h1>Reembolso Processado</h1>
      <p>Olá ${data.organizationName},</p>
      <p>Um reembolso foi processado para a reserva ${data.bookingId}.</p>

      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
        <p><strong>ID da Reserva:</strong> ${data.bookingId}</p>
        <p><strong>Hóspede:</strong> ${data.guestName}</p>
        <p><strong>Valor do Reembolso:</strong> ${data.currency} ${data.refundAmount.toFixed(2)}</p>
        <p><strong>Motivo:</strong> ${data.reason}</p>
      </div>

      <p>O reembolso será processado para a conta bancária do hóspede em 3-5 dias úteis.</p>
    `,
    text: `
      Reembolso Processado

      ID da Reserva: ${data.bookingId}
      Hóspede: ${data.guestName}
      Valor: ${data.currency} ${data.refundAmount.toFixed(2)}
      Motivo: ${data.reason}
    `,
  }
}

export function refundProcessedGuestTemplate(data: RefundProcessedEmailData) {
  return {
    subject: `Seu reembolso foi processado ✓`,
    html: `
      <h1>Reembolso Confirmado</h1>
      <p>Olá ${data.guestName},</p>
      <p>Seu reembolso foi aprovado e está em processamento.</p>

      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
        <p><strong>Valor do Reembolso:</strong> ${data.currency} ${data.refundAmount.toFixed(2)}</p>
        <p><strong>Status:</strong> Processando</p>
      </div>

      <p>Você receberá o reembolso na sua conta em 3-5 dias úteis.</p>
      <p>Obrigado por usar Lodgra!</p>
    `,
    text: `
      Seu reembolso foi processado!

      Valor: ${data.currency} ${data.refundAmount.toFixed(2)}
      Status: Processando

      Você receberá em 3-5 dias úteis.
    `,
  }
}
