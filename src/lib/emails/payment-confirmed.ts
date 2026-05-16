export interface PaymentConfirmedEmailData {
  organizationName: string
  guestName: string
  bookingId: string
  propertyName: string
  amount: number
  currency: string
  checkInDate: string
  checkOutDate: string
}

export function paymentConfirmedTemplate(data: PaymentConfirmedEmailData) {
  return {
    subject: `Confirmação de Pagamento — Reserva ${data.bookingId}`,
    html: `
      <h1>Pagamento Confirmado! ✓</h1>
      <p>Olá ${data.organizationName},</p>
      <p>Seu pagamento foi processado com sucesso. Aqui está o resumo:</p>

      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
        <p><strong>Propriedade:</strong> ${data.propertyName}</p>
        <p><strong>Hóspede:</strong> ${data.guestName}</p>
        <p><strong>Data de Check-in:</strong> ${data.checkInDate}</p>
        <p><strong>Data de Check-out:</strong> ${data.checkOutDate}</p>
        <p><strong>Valor Pago:</strong> ${data.currency} ${data.amount.toFixed(2)}</p>
        <p><strong>ID de Reserva:</strong> ${data.bookingId}</p>
      </div>

      <p>O hóspede também recebeu uma confirmação de pagamento.</p>
      <p>Obrigado por usar Lodgra!</p>
    `,
    text: `
      Pagamento Confirmado!

      Propriedade: ${data.propertyName}
      Hóspede: ${data.guestName}
      Check-in: ${data.checkInDate}
      Check-out: ${data.checkOutDate}
      Valor: ${data.currency} ${data.amount.toFixed(2)}
      ID da Reserva: ${data.bookingId}
    `,
  }
}

export function paymentConfirmedGuestTemplate(data: PaymentConfirmedEmailData) {
  return {
    subject: `Sua reserva em ${data.propertyName} foi confirmada! 🎉`,
    html: `
      <h1>Reserva Confirmada!</h1>
      <p>Olá ${data.guestName},</p>
      <p>Seu pagamento foi processado com sucesso em ${data.organizationName}.</p>

      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
        <p><strong>Propriedade:</strong> ${data.propertyName}</p>
        <p><strong>Check-in:</strong> ${data.checkInDate}</p>
        <p><strong>Check-out:</strong> ${data.checkOutDate}</p>
        <p><strong>Valor Pago:</strong> ${data.currency} ${data.amount.toFixed(2)}</p>
      </div>

      <p>Sua confirmação de reserva foi enviada. Divirta-se!</p>
    `,
    text: `
      Sua reserva foi confirmada!

      Propriedade: ${data.propertyName}
      Check-in: ${data.checkInDate}
      Check-out: ${data.checkOutDate}
      Valor: ${data.currency} ${data.amount.toFixed(2)}
    `,
  }
}
