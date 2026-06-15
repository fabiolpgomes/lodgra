/**
 * Default WhatsApp message templates (Story 30.2)
 * Used as fallback when organization hasn't customized
 */

export interface DefaultTemplate {
  key: string;
  body: string;
  description: string;
}

export const DEFAULT_TEMPLATES_PT_BR: Record<string, DefaultTemplate> = {
  checkin_code: {
    key: 'checkin_code',
    body: `🏠 *{{property_name}}*
📍 {{property_address}}

Olá {{guest_name}}! Aqui estão os detalhes do seu check-in:

📅 Check-in: {{checkin_date}}
🔑 Código de acesso: *{{checkin_code}}*

{{checkin_instructions}}

Qualquer questão: {{manager_phone}}`,
    description: 'Enviado 24h antes do check-in com código de acesso',
  },
  checkout_reminder: {
    key: 'checkout_reminder',
    body: `🏠 *{{property_name}}*
📍 {{property_address}}

Olá {{guest_name}}! Amanhã é seu checkout.

📅 Checkout: {{checkout_date}} até às 11:00

Instruções:
- Deixar as chaves {{checkin_instructions}}
- Apagar as luzes
- Fechar as janelas

Obrigado pela sua estadia!`,
    description: 'Enviado 24h antes do checkout',
  },
  task_assigned: {
    key: 'task_assigned',
    body: `🏠 *{{property_name}}*
📍 {{property_address}}

Olá {{cleaner_name}}!

Tem uma tarefa de limpeza:

📅 Data: {{task_date}}
🕐 Hora: {{task_time}}

Por favor confirme assim que possa.`,
    description: 'Enviado quando tarefa atribuída ao cleaner',
  },
  task_reminder: {
    key: 'task_reminder',
    body: `🏠 *{{property_name}}*

Olá {{cleaner_name}}!

Lembrança: tem limpeza em 2 horas ({{task_time}})

Por favor confirme a sua chegada.`,
    description: 'Enviado 2h antes da tarefa de limpeza',
  },
};

export const DEFAULT_TEMPLATES_ES: Record<string, DefaultTemplate> = {
  checkin_code: {
    key: 'checkin_code',
    body: `🏠 *{{property_name}}*
📍 {{property_address}}

¡Hola {{guest_name}}! Aquí están los detalles de tu check-in:

📅 Check-in: {{checkin_date}}
🔑 Código de acceso: *{{checkin_code}}*

{{checkin_instructions}}

Cualquier pregunta: {{manager_phone}}`,
    description: 'Enviado 24h antes del check-in con código de acceso',
  },
  checkout_reminder: {
    key: 'checkout_reminder',
    body: `🏠 *{{property_name}}*
📍 {{property_address}}

¡Hola {{guest_name}}! Mañana es tu checkout.

📅 Checkout: {{checkout_date}} hasta las 11:00

Instrucciones:
- Dejar las llaves {{checkin_instructions}}
- Apagar las luces
- Cerrar las ventanas

¡Gracias por tu estancia!`,
    description: 'Enviado 24h antes del checkout',
  },
  task_assigned: {
    key: 'task_assigned',
    body: `🏠 *{{property_name}}*
📍 {{property_address}}

¡Hola {{cleaner_name}}!

Tienes una tarea de limpieza:

📅 Fecha: {{task_date}}
🕐 Hora: {{task_time}}

Por favor confirma tan pronto como puedas.`,
    description: 'Enviado cuando se asigna tarea al cleaner',
  },
  task_reminder: {
    key: 'task_reminder',
    body: `🏠 *{{property_name}}*

¡Hola {{cleaner_name}}!

Recordatorio: tienes limpieza en 2 horas ({{task_time}})

Por favor confirma tu llegada.`,
    description: 'Enviado 2h antes de la tarea de limpieza',
  },
};

/**
 * Get default template body for a given key and language
 */
export function getDefaultTemplate(key: string, language: string = 'pt-BR'): string | null {
  const templates = language === 'es' ? DEFAULT_TEMPLATES_ES : DEFAULT_TEMPLATES_PT_BR;
  return templates[key]?.body || null;
}

/**
 * Get all required variables from a template body
 */
export function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{([a-z_]+)\}\}/gi) || [];
  return [...new Set(matches.map((m) => m.toLowerCase()))];
}

/**
 * Validate that required variables are present
 */
export function validateRequiredVariables(body: string): { valid: boolean; missing: string[] } {
  const required = ['{{property_name}}', '{{property_address}}'];
  const missing = required.filter((v) => !body.includes(v));
  return {
    valid: missing.length === 0,
    missing,
  };
}
