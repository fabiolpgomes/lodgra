import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  return apiKey ? new Resend(apiKey) : null
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'homestay.pt <noreply@resend.dev>'

export interface DeletionRequestEmailData {
  guestName: string
  guestEmail: string
  scheduledAt: string
  appUrl: string
}

function fmtDate(d: string) {
  return format(parseISO(d), "d 'de' MMMM yyyy", { locale: ptBR })
}

/**
 * Email to user confirming their account deletion request.
 */
export async function sendDeletionRequestConfirmation(data: DeletionRequestEmailData): Promise<void> {
  if (!data.guestEmail) return

  const resend = getResendClient()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY não configurado — email de pedido de eliminação não enviado')
    return
  }

  const cancelUrl = `${data.appUrl}/settings` // Assume a secção de eliminação de conta está aqui

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

    <!-- Header -->
    <div style="background:#111827;padding:28px 32px;">
      <p style="margin:0;color:#fff;font-size:18px;font-weight:600;">homestay.pt</p>
    </div>

    <!-- Alert banner -->
    <div style="background:#fee2e2;padding:20px 32px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:28px;">⚠️</span>
      <div>
        <p style="margin:0;font-size:16px;font-weight:700;color:#991b1b;">Pedido de Eliminação de Conta</p>
        <p style="margin:4px 0 0;font-size:13px;color:#7f1d1d;">A sua conta será eliminada em breve</p>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">
        Olá <strong>${data.guestName}</strong>,<br>
        Recebemos um pedido para eliminar a sua conta e todos os dados associados na nossa plataforma.
      </p>

      <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#4b5563;">
          A sua conta será eliminada permanentemente no dia:<br>
          <strong style="color:#111827;font-size:16px;">${fmtDate(data.scheduledAt)}</strong>
        </p>
      </div>

      <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;">
        Até essa data, a sua conta permanece activa. Se mudar de ideias, pode cancelar este pedido
        a qualquer momento nas definições da sua conta.
      </p>

      <!-- CTA -->
      <a href="${cancelUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        Cancelar Eliminação →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        Se você não fez este pedido, por favor altere a sua password imediatamente ou contacte-nos.<br>
        homestay.pt
      </p>
    </div>

  </div>
</body>
</html>`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.guestEmail,
      subject: `⚠️ Aviso: Pedido de eliminação de conta em processamento`,
      html,
    })
    if (error) console.error('[email] Erro ao enviar confirmação de eliminação:', error)
    else console.log(`[email] Aviso de eliminação enviado para ${data.guestEmail}`)
  } catch (err) {
    console.error('[email] Excepção ao enviar confirmação de eliminação:', err)
  }
}
