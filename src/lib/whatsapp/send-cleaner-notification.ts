import { createAdminClient } from '@/lib/supabase/admin'

interface CleanerNotificationParams {
  cleanerId: string
  organizationId: string
  message: string
  templateName?: string // e.g., 'task_assigned', 'access_link', 'task_completed'
  variables?: Record<string, string>
}

/**
 * Send automatic WhatsApp message to cleaner
 * Checks if cleaner has opted in and has valid phone number
 */
export async function sendCleanerNotification({
  cleanerId,
  organizationId,
  message,
  templateName,
  variables,
}: CleanerNotificationParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    // 1. Get cleaner profile with phone and WhatsApp consent
    const { data: cleaner, error: cleanerError } = await supabase
      .from('user_profiles')
      .select('id, full_name, phone_number, accepts_whatsapp, guest_type')
      .eq('id', cleanerId)
      .eq('organization_id', organizationId)
      .single()

    if (cleanerError || !cleaner) {
      return { success: false, error: 'Cleaner not found' }
    }

    // 2. Validate cleaner is actual cleaner type
    if (cleaner.guest_type !== 'cleaner') {
      return { success: false, error: 'User is not a cleaner' }
    }

    // 3. Validate consent and phone number
    if (!cleaner.accepts_whatsapp) {
      return { success: false, error: 'Cleaner has not consented to WhatsApp messages' }
    }

    if (!cleaner.phone_number) {
      return { success: false, error: 'Cleaner has no phone number on file' }
    }

    // 4. Get organization WhatsApp config
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('metadata')
      .eq('id', organizationId)
      .single()

    if (orgError || !orgData?.metadata?.whatsapp_enabled) {
      return { success: false, error: 'WhatsApp not enabled for organization' }
    }

    // 5. Store message in WhatsApp analytics for tracking
    const { error: analyticsError } = await supabase
      .from('whatsapp_messages')
      .insert({
        organization_id: organizationId,
        recipient_id: cleanerId,
        recipient_name: cleaner.full_name,
        recipient_phone: cleaner.phone_number,
        message_type: templateName || 'auto_notification',
        body: message,
        variables: variables || {},
        status: 'queued',
      })

    if (analyticsError) {
      console.warn('Failed to log WhatsApp message:', analyticsError)
      // Don't fail the whole operation if logging fails
    }

    // 6. Send via WhatsApp API (using existing Meta Business API integration)
    const { error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
      body: {
        organizationId,
        phoneNumber: cleaner.phone_number,
        message,
        templateName,
        variables,
        recipientId: cleanerId,
      },
    })

    if (sendError) {
      return { success: false, error: `Failed to send message: ${sendError.message}` }
    }

    return { success: true }
  } catch (error) {
    console.error('Send cleaner notification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Predefined message templates for cleaner communications
 */
export const CLEANER_MESSAGE_TEMPLATES = {
  access_link: (cleanerName: string, organizationName: string, taskUrl: string) =>
    `Olá ${cleanerName}! Você foi adicionado ao sistema de limpeza da ${organizationName}. Aceda aqui: ${taskUrl}`,

  task_assigned: (cleanerName: string, propertyName: string, scheduledDate: string) =>
    `Olá ${cleanerName}! Nova tarefa de limpeza para ${propertyName} em ${scheduledDate}. Aceda o painel para detalhes.`,

  task_reminder: (cleanerName: string, propertyName: string, scheduledDate: string) =>
    `Lembrete: Tarefa de limpeza em ${propertyName} hoje (${scheduledDate}). Confirme quando completado.`,

  task_completed: (cleanerName: string, propertyName: string) =>
    `Obrigado ${cleanerName}! Limpeza de ${propertyName} foi marcada como concluída.`,

  welcome: (cleanerName: string, organizationName: string) =>
    `Bem-vindo ${cleanerName}! Estamos felizes em tê-lo no painel de limpeza da ${organizationName}.`,
}
