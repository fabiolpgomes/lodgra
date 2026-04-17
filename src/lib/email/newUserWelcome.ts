import { Resend } from 'resend'

export interface NewUserWelcomeParams {
  email: string
  fullName: string
  provisionalPassword: string
  resetToken: string
  appUrl?: string
}

export async function sendNewUserWelcomeEmail(params: NewUserWelcomeParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY não configurado — email de boas-vindas não enviado')
    return false
  }
  const resend = new Resend(apiKey)
  const fromEmail = process.env.EMAIL_FROM || 'Lodgra <noreply@resend.dev>'
  const appUrl = params.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.pt'

  const setPasswordUrl = `${appUrl}/auth/set-password?token=${params.resetToken}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1f2937; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Bem-vindo à Lodgra</h1>
      </div>

      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 16px; color: #374151; font-size: 14px;">
          Olá <strong>${params.fullName}</strong>,
        </p>

        <p style="margin: 0 0 16px; color: #374151; font-size: 14px;">
          Sua conta foi criada com sucesso! Para começar, clique no botão abaixo para criar sua senha:
        </p>

        <div style="margin: 24px 0;">
          <a href="${setPasswordUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Criar Minha Senha
          </a>
        </div>

        <p style="margin: 0 0 16px; color: #374151; font-size: 14px;">
          Se o botão não funcionar, copie e cole este link no navegador:
        </p>

        <p style="margin: 0 0 16px; color: #2563eb; font-size: 12px; word-break: break-all;">
          ${setPasswordUrl}
        </p>

        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px; margin: 16px 0;">
          <p style="margin: 0; color: #92400e; font-size: 12px;">
            <strong>⚠️ Segurança:</strong> Este link expira em 24 horas. Não compartilhe este email com ninguém.
          </p>
        </div>

        <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          Detalhes da sua conta:
        </p>

        <p style="margin: 0; color: #374151; font-size: 13px;">
          <strong>Email:</strong> ${params.email}
        </p>

        <p style="margin: 16px 0 0; color: #6b7280; font-size: 12px;">
          Se você não solicitou a criação desta conta, ignore este email.
        </p>
      </div>
    </div>
  `

  const text = `
Bem-vindo à Lodgra

Olá ${params.fullName},

Sua conta foi criada com sucesso! Para começar, acesse este link para criar sua senha:

${setPasswordUrl}

⚠️ Segurança: Este link expira em 24 horas. Não compartilhe este email com ninguém.

Email da sua conta: ${params.email}

Se você não solicitou a criação desta conta, ignore este email.
  `.trim()

  try {
    await resend.emails.send({
      from: fromEmail,
      to: params.email,
      subject: 'Bem-vindo à Lodgra - Suas Credenciais de Acesso',
      html,
      text,
    })

    return true
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error)
    return false
  }
}
