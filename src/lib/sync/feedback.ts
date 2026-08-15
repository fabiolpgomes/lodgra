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
        title: 'Feed consultado com sucesso',
        detail: 'Esta execução é anterior ao registro detalhado de contadores. Não há confirmação de quantos registros foram processados.',
        action: null,
        severity: 'info',
      }
    }

    const created = recordsCreated || 0
    const updated = recordsUpdated || 0
    if (created === 0 && updated === 0) {
      return {
        title: 'Feed atualizado, sem novidades',
        detail: `O calendário da ${platform} respondeu corretamente, mas não trouxe reservas novas ou alteradas.`,
        action: null,
        severity: 'success',
      }
    }

    return {
      title: 'Reservas sincronizadas',
      detail: `${created} nova(s), ${updated} atualizada(s)${recordsFailed ? ` e ${recordsFailed} com erro` : ''}.`,
      action: recordsFailed ? 'Abra o anúncio e revise os registros que falharam.' : null,
      severity: recordsFailed ? 'warning' : 'success',
    }
  }

  const normalizedError = (errorMessage || '').toLowerCase()
  if (normalizedError.includes('400 bad request')) {
    return {
      title: 'URL iCal recusada pela plataforma',
      detail: `A ${platform} respondeu com erro 400. Normalmente o link expirou, foi copiado incompleto ou deixou de ser válido.`,
      action: `Exporte um novo URL iCal na ${platform} e substitua o URL de importação no anúncio desta propriedade.`,
      severity: 'error',
    }
  }

  if (normalizedError.includes('401') || normalizedError.includes('403')) {
    return {
      title: 'Acesso ao calendário negado',
      detail: `A ${platform} recusou a credencial presente no URL iCal.`,
      action: `Gere um novo URL iCal na ${platform} e atualize o anúncio no Lodgra.`,
      severity: 'error',
    }
  }

  if (normalizedError.includes('timeout') || normalizedError.includes('timed out')) {
    return {
      title: 'A plataforma demorou para responder',
      detail: `O Lodgra não recebeu resposta da ${platform} dentro do tempo esperado.`,
      action: 'Aguarde o próximo ciclo. Se repetir por mais de uma hora, gere um novo URL iCal.',
      severity: 'warning',
    }
  }

  return {
    title: 'Sincronização não concluída',
    detail: errorMessage || 'A execução terminou sem uma resposta válida.',
    action: 'Abra o anúncio, confirme o URL iCal e execute uma sincronização manual. Se persistir, substitua o URL.',
    severity: 'error',
  }
}
