export interface SeriousIssueDecisionEmailData {
  guest_name: string
  decision: 'APPROVED' | 'PARTIAL' | 'DENIED'
  refund_amount: number
  refund_percentage: number
  notes?: string
}

export function seriousIssueDecisionTemplate(data: SeriousIssueDecisionEmailData) {
  const decisionLabel = {
    APPROVED: 'Reembolso Completo Aprovado',
    PARTIAL: 'Reembolso Parcial Aprovado',
    DENIED: 'Sem Reembolso',
  }[data.decision]

  const decisionColor = {
    APPROVED: '#28a745',
    PARTIAL: '#ffc107',
    DENIED: '#dc3545',
  }[data.decision]

  const decisionMessage = {
    APPROVED:
      'Sua reclamação foi aprovada. Você receberá o reembolso completo em 3-5 dias úteis.',
    PARTIAL:
      'Sua reclamação foi parcialmente aprovada. Você receberá um reembolso de 50% em 3-5 dias úteis.',
    DENIED:
      'Sua reclamação foi analisada mas não foi possível aprovar um reembolso neste momento.',
  }[data.decision]

  return {
    subject: `Decisão sobre sua reclamação — ${decisionLabel}`,
    html: `
      <h1>Sua Reclamação foi Revisada</h1>
      <p>Olá ${data.guest_name},</p>
      <p>Sua reclamação "serious issue" foi cuidadosamente revisada. Aqui está nossa decisão:</p>

      <div style="background-color: ${decisionColor}; color: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <h2 style="margin: 0 0 10px 0; font-size: 24px;">${decisionLabel}</h2>
        ${data.decision !== 'DENIED' ? `<p style="margin: 0; font-size: 20px; font-weight: bold;">€${data.refund_amount.toFixed(2)} (${data.refund_percentage}%)</p>` : ''}
      </div>

      <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Detalhes</h3>
        <p>${decisionMessage}</p>
        ${data.notes ? `<p style="color: #6c757d; font-style: italic;"><strong>Observações:</strong> ${data.notes}</p>` : ''}
      </div>

      ${data.decision !== 'DENIED' ? `
        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #004085;">
            <strong>Próximos Passos:</strong> O reembolso será processado automaticamente. Você receberá o valor na sua conta bancária em 3-5 dias úteis.
          </p>
        </div>
      ` : ''}

      <p style="color: #6c757d;">
        Se tiver dúvidas sobre esta decisão, entre em contacto com nosso suporte em support@lodgra.io.
      </p>

      <hr style="border: none; border-top: 1px solid #dee2e6; margin: 40px 0;">
      <p style="color: #6c757d; font-size: 12px;">
        Obrigado por usar Lodgra. Sistema de Gestão de Reservas
      </p>
    `,
    text: `
      SUA RECLAMAÇÃO FOI REVISADA

      Decisão: ${decisionLabel}
      ${data.decision !== 'DENIED' ? `Reembolso: €${data.refund_amount.toFixed(2)} (${data.refund_percentage}%)` : 'Sem Reembolso'}

      ${decisionMessage}

      ${data.notes ? `Observações: ${data.notes}` : ''}

      ${data.decision !== 'DENIED' ? 'O reembolso será processado em 3-5 dias úteis.' : ''}

      Obrigado,
      Equipa Lodgra
    `,
  }
}
