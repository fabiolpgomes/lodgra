/**
 * WhatsApp Cloud API Client (Meta)
 * Handles message sending, rate limiting, logging, and fallback
 *
 * API: https://graph.facebook.com/v19.0/{phone_number_id}/messages
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/
 */

import { createClient } from '@/lib/supabase/server';
import { normalizePhoneNumber } from './phone-normalizer';
import { sendEmailFallback } from './fallback';

interface SendOptions {
  organizationId: string;
  to: string;
  retryCount?: number;
}

interface TemplateVariable {
  [key: string]: string;
}

export interface WhatsAppMessage {
  id?: string;
  organizationId: string;
  toPhone: string;
  templateName?: string;
  messageText?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  waMessageId?: string;
  retryCount: number;
  fallbackEmailSent: boolean;
}

// Rate limiter (in-memory, single instance)
class RateLimiter {
  private messages: number[] = [];
  private readonly maxPerSecond = 20;
  private readonly windowMs = 1000;

  canSend(): boolean {
    const now = Date.now();
    this.messages = this.messages.filter((t) => now - t < this.windowMs);

    if (this.messages.length >= this.maxPerSecond) {
      return false;
    }

    this.messages.push(now);
    return true;
  }

  wait(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.canSend()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
}

const rateLimiter = new RateLimiter();

/**
 * Test mode: when WHATSAPP_ACCESS_TOKEN is not set
 */
function isTestMode(): boolean {
  return !process.env.WHATSAPP_ACCESS_TOKEN;
}

/**
 * Send a templated WhatsApp message
 * AC2: sendTemplate(to, templateName, variables, lang)
 */
export async function sendTemplate(
  options: SendOptions & {
    templateName: string;
    variables: TemplateVariable;
    lang?: string;
  }
): Promise<WhatsAppMessage> {
  const { organizationId, to, templateName, variables, lang = 'pt_BR', retryCount = 0 } = options;

  // Normalize phone
  const phoneResult = normalizePhoneNumber(to);
  if (!phoneResult.isValid) {
    return logWhatsAppMessage(organizationId, to, {
      templateName,
      status: 'failed',
      errorMessage: phoneResult.error,
      retryCount,
    });
  }

  const normalizedPhone = phoneResult.normalized!;

  // Rate limit
  if (!rateLimiter.canSend()) {
    await rateLimiter.wait();
  }

  try {
    if (isTestMode()) {
      console.log(`[WhatsApp Test Mode] Template: ${templateName}, To: ${normalizedPhone}`, variables);
      return logWhatsAppMessage(organizationId, normalizedPhone, {
        templateName,
        status: 'sent',
        retryCount,
      });
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: lang.replace('_', '-'),
          },
          components: [
            {
              type: 'body',
              parameters: Object.values(variables).map((v) => ({ type: 'text', text: v })),
            },
          ],
        },
      }),
    });

    const data = await response.json() as { messages?: Array<{ id: string }>; error?: { message: string } };

    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    const waMessageId = data.messages?.[0]?.id;

    return logWhatsAppMessage(organizationId, normalizedPhone, {
      templateName,
      status: 'sent',
      waMessageId,
      retryCount,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Attempt fallback if max retries not reached
    if (retryCount < 3) {
      return {
        organizationId,
        toPhone: normalizedPhone,
        templateName,
        status: 'failed' as const,
        errorMessage,
        retryCount,
        fallbackEmailSent: false,
      };
    }

    // After 3 retries, send email fallback
    const result = await logWhatsAppMessage(organizationId, normalizedPhone, {
      templateName,
      status: 'failed',
      errorMessage,
      retryCount,
    });

    // Trigger email fallback asynchronously
    sendEmailFallback({ organizationId, toPhone: normalizedPhone, templateName, variables })
      .catch((e) => console.error('Email fallback failed:', e));

    return result;
  }
}

/**
 * Send a simple text message
 * AC3: sendText(to, message)
 */
export async function sendText(
  options: SendOptions & { message: string }
): Promise<WhatsAppMessage> {
  const { organizationId, to, message, retryCount = 0 } = options;

  const phoneResult = normalizePhoneNumber(to);
  if (!phoneResult.isValid) {
    return logWhatsAppMessage(organizationId, to, {
      messageText: message,
      status: 'failed',
      errorMessage: phoneResult.error,
      retryCount,
    });
  }

  const normalizedPhone = phoneResult.normalized!;

  if (!rateLimiter.canSend()) {
    await rateLimiter.wait();
  }

  try {
    if (isTestMode()) {
      console.log(`[WhatsApp Test Mode] Text to ${normalizedPhone}: ${message}`);
      return logWhatsAppMessage(organizationId, normalizedPhone, {
        messageText: message,
        status: 'sent',
        retryCount,
      });
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'text',
        text: {
          body: message,
        },
      }),
    });

    const data = await response.json() as { messages?: Array<{ id: string }>; error?: { message: string } };

    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    const waMessageId = data.messages?.[0]?.id;

    return logWhatsAppMessage(organizationId, normalizedPhone, {
      messageText: message,
      status: 'sent',
      waMessageId,
      retryCount,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return logWhatsAppMessage(organizationId, normalizedPhone, {
      messageText: message,
      status: 'failed',
      errorMessage,
      retryCount,
    });
  }
}

/**
 * Log message to whatsapp_logs table
 * AC6: Logs saved to database
 */
async function logWhatsAppMessage(
  organizationId: string,
  toPhone: string,
  log: Partial<Omit<WhatsAppMessage, 'organizationId' | 'toPhone'>>
): Promise<WhatsAppMessage> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('whatsapp_logs')
      .insert({
        organization_id: organizationId,
        to_phone: toPhone,
        template_name: log.templateName,
        message_text: log.messageText,
        wa_message_id: log.waMessageId,
        status: log.status || 'sent',
        error_message: log.errorMessage,
        retry_count: log.retryCount || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      organizationId,
      toPhone,
      templateName: log.templateName,
      messageText: log.messageText,
      status: log.status || 'sent',
      errorMessage: log.errorMessage,
      waMessageId: log.waMessageId,
      retryCount: log.retryCount || 0,
      fallbackEmailSent: false,
    };
  } catch (error) {
    console.error('Failed to log WhatsApp message:', error);
    return {
      organizationId,
      toPhone,
      templateName: log.templateName,
      messageText: log.messageText,
      status: log.status || 'sent',
      errorMessage: log.errorMessage,
      waMessageId: log.waMessageId,
      retryCount: log.retryCount || 0,
      fallbackEmailSent: false,
    };
  }
}

/**
 * Update message status (called from webhook)
 * AC5: Webhook status updates
 */
export async function updateMessageStatus(
  waMessageId: string,
  status: 'delivered' | 'read' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('whatsapp_logs')
      .update({
        status,
        error_message: errorMessage,
      })
      .eq('wa_message_id', waMessageId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to update WhatsApp message status:', error);
  }
}
