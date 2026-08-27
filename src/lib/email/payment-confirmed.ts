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
      <h1>Pagamento confirmado! ✓</h1>
      <p>Olá ${data.organizationName},</p>
      <p>O pagamento foi processado com sucesso. Aqui está o resumo:</p>

      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
        <p><strong>Propriedade:</strong> ${data.propertyName}</p>
        <p><strong>Hóspede:</strong> ${data.guestName}</p>
        <p><strong>Data de check-in:</strong> ${data.checkInDate}</p>
        <p><strong>Data de check-out:</strong> ${data.checkOutDate}</p>
        <p><strong>Valor pago:</strong> ${data.currency} ${data.amount.toFixed(2)}</p>
        <p><strong>ID da reserva:</strong> ${data.bookingId}</p>
      </div>

      <p>O hóspede também recebeu a confirmação de pagamento.</p>
      <p>Obrigado por utilizar a Lodgra!</p>
    `,
    text: `
      Pagamento confirmado!

      Propriedade: ${data.propertyName}
      Hóspede: ${data.guestName}
      Data de check-in: ${data.checkInDate}
      Data de check-out: ${data.checkOutDate}
      Valor: ${data.currency} ${data.amount.toFixed(2)}
      ID da reserva: ${data.bookingId}
    `,
  }
}

export function paymentConfirmedGuestTemplate(data: PaymentConfirmedEmailData) {
  return {
    subject: `A sua reserva em ${data.propertyName} foi confirmada! 🎉`,
    html: `
      <h1>Reserva confirmada!</h1>
      <p>Olá ${data.guestName},</p>
      <p>O seu pagamento foi processado com sucesso em ${data.organizationName}.</p>

      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
        <p><strong>Propriedade:</strong> ${data.propertyName}</p>
        <p><strong>Data de check-in:</strong> ${data.checkInDate}</p>
        <p><strong>Data de check-out:</strong> ${data.checkOutDate}</p>
        <p><strong>Valor pago:</strong> ${data.currency} ${data.amount.toFixed(2)}</p>
      </div>

      <p>A confirmação da reserva também foi enviada.</p>
    `,
    text: `
      A sua reserva foi confirmada!

      Propriedade: ${data.propertyName}
      Data de check-in: ${data.checkInDate}
      Data de check-out: ${data.checkOutDate}
      Valor: ${data.currency} ${data.amount.toFixed(2)}
    `,
  }
}
