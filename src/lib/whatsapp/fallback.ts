/**
 * Email fallback for WhatsApp failures
 * AC7: If WhatsApp send fails 3x, fallback to email via Resend
 */

import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

interface FallbackOptions {
  organizationId: string;
  toPhone: string;
  templateName?: string;
  variables?: Record<string, string>;
}

/**
 * Send fallback email when WhatsApp fails after 3 retries
 */
export async function sendEmailFallback(options: FallbackOptions): Promise<void> {
  const { organizationId, toPhone, templateName, variables = {} } = options;

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not configured, skipping email fallback');
      return;
    }

    const resend = new Resend(apiKey);

    // Get organization and user email from phone
    const supabase = await createClient();

    // Try to find user by phone number for email
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id, email, organization_id')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    if (!userProfile?.email) {
      console.warn('No email found for fallback, skipping');
      return;
    }

    // Compose fallback email
    const subject = `Notificação via WhatsApp Falhou`;
    const body = composeFallbackEmail(templateName, variables, toPhone);

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@lodgra.io',
      to: userProfile.email,
      subject,
      html: body,
    });

    // Log fallback in database
    await supabase
      .from('whatsapp_logs')
      .update({ fallback_email_sent: true })
      .eq('to_phone', toPhone);
  } catch (error) {
    console.error('Email fallback failed:', error);
  }
}

/**
 * Compose HTML email body for fallback
 */
function composeFallbackEmail(
  templateName: string | undefined,
  variables: Record<string, string>,
  toPhone: string
): string {
  const varList = Object.entries(variables)
    .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
    .join('');

  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          <h2>Notificação via WhatsApp Falhou</h2>
          <p>Não foi possível enviar a mensagem WhatsApp. Abaixo estão os detalhes:</p>

          <hr>

          <p><strong>Telefone:</strong> ${toPhone}</p>
          <p><strong>Template:</strong> ${templateName || 'Mensagem de texto'}</p>

          ${varList ? `<h3>Variáveis:</h3><ul>${varList}</ul>` : ''}

          <hr>

          <p style="color: #666; font-size: 12px;">
            Esta é uma mensagem automática. Por favor, contacte o suporte se o problema persistir.
          </p>
        </div>
      </body>
    </html>
  `;
}
