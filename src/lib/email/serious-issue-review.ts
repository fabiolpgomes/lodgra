export interface SeriousIssueReviewEmailData {
  guest_name: string
  property_name: string
  reservation_id: string
  check_in: string
  check_out: string
  total_amount: number
  description: string
  evidence_url: string
  review_link: string
}

export function seriousIssueReviewTemplate(data: SeriousIssueReviewEmailData) {
  const checkIn = new Date(data.check_in).toLocaleDateString('pt-PT')
  const checkOut = new Date(data.check_out).toLocaleDateString('pt-PT')

  return {
    subject: `[REVISÃO URGENTE] Reclamação Serious Issue — ${data.property_name}`,
    html: `
      <h1>Nova Reclamação para Revisão</h1>
      <p>Uma reclamação "serious issue" foi reportada e requer sua revisão imediata.</p>

      <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #856404;">Detalhes da Reserva</h2>
        <p><strong>ID da Reserva:</strong> ${data.reservation_id}</p>
        <p><strong>Hóspede:</strong> ${data.guest_name}</p>
        <p><strong>Propriedade:</strong> ${data.property_name}</p>
        <p><strong>Datas:</strong> ${checkIn} — ${checkOut}</p>
        <p><strong>Valor da Reserva:</strong> €${data.total_amount.toFixed(2)}</p>
      </div>

      <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Problema Reportado</h3>
        <p style="white-space: pre-wrap; margin: 0;">${data.description}</p>
        ${data.evidence_url ? `<p><a href="${data.evidence_url}" target="_blank" style="color: #007bff;">Ver Evidência</a></p>` : ''}
      </div>

      <div style="margin: 30px 0;">
        <a href="${data.review_link}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Revisar e Decidir
        </a>
      </div>

      <p style="color: #6c757d; font-size: 12px;">
        Este link expira em 7 dias. Acesse ${data.review_link} para revisão e decisão.
      </p>

      <hr style="border: none; border-top: 1px solid #dee2e6; margin: 40px 0;">
      <p style="color: #6c757d; font-size: 12px;">
        Sistema Lodgra — Gestão de Reservas
      </p>
    `,
    text: `
      NOVA RECLAMAÇÃO PARA REVISÃO

      ID da Reserva: ${data.reservation_id}
      Hóspede: ${data.guest_name}
      Propriedade: ${data.property_name}
      Datas: ${checkIn} — ${checkOut}
      Valor: €${data.total_amount.toFixed(2)}

      Problema Reportado:
      ${data.description}

      ${data.evidence_url ? `Evidência: ${data.evidence_url}` : ''}

      Revisar em: ${data.review_link}

      Este link expira em 7 dias.
    `,
  }
}
