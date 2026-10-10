/**
 * Tarefas agendadas que o operador da plataforma pode disparar à mão.
 * Fonte única para o console (UI) e para a rota que as executa.
 * Cada `path` tem de existir em vercel.json (há um teste que garante isso).
 */
export const PLATFORM_CRON_JOBS = [
  {
    id: 'sync-ical',
    name: 'Sincronização iCal',
    description: 'Importa reservas automaticamente das plataformas, para todas as organizações',
    schedule: 'Diariamente às 3h (UTC)',
    path: '/api/cron/sync-ical',
  },
  {
    id: 'cleanup',
    name: 'Limpeza de Dados',
    description: 'Cancela tentativas de reserva direta abandonadas e limpa registos de envio de email antigos (>90 dias)',
    schedule: 'Diariamente às 4h (UTC)',
    path: '/api/cron/cleanup',
  },
] as const

export type PlatformCronJob = (typeof PLATFORM_CRON_JOBS)[number]

export function isPlatformCronPath(path: unknown): path is PlatformCronJob['path'] {
  return PLATFORM_CRON_JOBS.some(job => job.path === path)
}
