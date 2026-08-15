export type SyncFeedbackSeverity = 'success' | 'warning' | 'error' | 'info'

export interface SyncFeedback {
  title: string
  detail: string
  action: string | null
  severity: SyncFeedbackSeverity
}

interface SyncFeedbackInput {
  status: 'success' | 'failed'
  errorMessage?: string | null
  recordsCreated?: number | null
  recordsUpdated?: number | null
  recordsFailed?: number | null
  platformName?: string | null
}

export function getSyncFeedback({
  status,
  errorMessage,
  recordsCreated,
  recordsUpdated,
  recordsFailed,
  platformName,
}: SyncFeedbackInput): SyncFeedback {
  const countersKnown = recordsCreated !== null && recordsCreated !== undefined
    && recordsUpdated !== null && recordsUpdated !== undefined
    && recordsFailed !== null && recordsFailed !== undefined
  const platform = platformName || 'plataforma'

  if (status === 'success') {
    if (!countersKnown) {
      return {
        title: 'Calendário verificado',
        detail: 'A verificação terminou normalmente. Os detalhes desta verificação antiga não estão disponíveis.',
        action: null,
        severity: 'info',
      }
    }

    const created = recordsCreated || 0
    const updated = recordsUpdated || 0
    if (created === 0 && updated === 0) {
      return {
        title: 'Tudo certo, sem novas reservas',
        detail: `O calendário da ${platform} está funcionando. Não havia nada novo para adicionar.`,
        action: null,
        severity: 'success',
      }
    }

    return {
      title: 'Reservas sincronizadas',
      detail: `${created} reserva(s) nova(s) e ${updated} reserva(s) atualizada(s)${recordsFailed ? `. ${recordsFailed} não puderam ser atualizadas` : ''}.`,
      action: recordsFailed ? 'Abra a propriedade e confira os calendários conectados.' : null,
      severity: recordsFailed ? 'warning' : 'success',
    }
  }

  const normalizedError = (errorMessage || '').toLowerCase()
  if (normalizedError.includes('400 bad request')) {
    return {
      title: 'O link do calendário não funciona mais',
      detail: `O Lodgra não conseguiu abrir o calendário da ${platform}. O link pode estar antigo ou incompleto.`,
      action: `Copie um novo link de calendário na ${platform} e cole-o nesta propriedade.`,
      severity: 'error',
    }
  }

  if (normalizedError.includes('401') || normalizedError.includes('403')) {
    return {
      title: 'O calendário não permitiu o acesso',
      detail: `O link da ${platform} não permite mais que o Lodgra veja as reservas.`,
      action: `Copie um novo link de calendário na ${platform} e cole-o nesta propriedade.`,
      severity: 'error',
    }
  }

  if (normalizedError.includes('timeout') || normalizedError.includes('timed out')) {
    return {
      title: 'O calendário demorou para responder',
      detail: `A ${platform} demorou mais que o normal. Isso costuma ser temporário.`,
      action: 'Espere a próxima atualização. Se continuar assim por uma hora, troque o link do calendário.',
      severity: 'warning',
    }
  }

  return {
    title: 'Não foi possível atualizar este calendário',
    detail: 'O Lodgra tentou buscar as reservas, mas não conseguiu terminar.',
    action: 'Abra a propriedade e confira se o link do calendário está correto. Se precisar, copie um link novo.',
    severity: 'error',
  }
}
