'use client'

import { useState } from 'react'
import { Play, RefreshCw, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CRON_JOBS = [
  {
    id: 'sync-ical',
    name: 'Sincronização iCal',
    description: 'Importa reservas automaticamente das plataformas',
    schedule: 'A cada hora',
    path: '/api/cron/sync-ical',
  },
  {
    id: 'daily-checkins',
    name: 'Check-ins Diários',
    description: 'Verifica check-ins e check-outs do dia',
    schedule: 'Diariamente às 8h',
    path: '/api/cron/daily-checkins',
  },
  {
    id: 'cleanup',
    name: 'Limpeza de Dados',
    description: 'Remove reservas canceladas antigas (>2 anos)',
    schedule: 'Semanalmente (Domingo às 2h)',
    path: '/api/cron/cleanup',
  },
]

export function CronJobsManager() {
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Record<string, { success: boolean; data?: unknown; error?: string; timestamp: string } | null>>({})

  const runJob = async (job: typeof CRON_JOBS[0]) => {
    setRunningJobs(prev => new Set(prev).add(job.id))
    setResults(prev => ({ ...prev, [job.id]: null }))

    try {
      const response = await fetch('/api/admin/run-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: job.path }),
      })

      const data = await response.json()

      setResults(prev => ({
        ...prev,
        [job.id]: {
          success: response.ok,
          data,
          timestamp: new Date().toISOString(),
        },
      }))
    } catch (error: unknown) {
      setResults(prev => ({
        ...prev,
        [job.id]: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      }))
    } finally {
      setRunningJobs(prev => {
        const newSet = new Set(prev)
        newSet.delete(job.id)
        return newSet
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Sobre Cron Jobs</h3>
            <p className="text-sm text-blue-800">
              Tarefas agendadas rodam automaticamente em produção (Vercel).
              Aqui você pode executá-las manualmente para testar.
            </p>
          </div>
        </div>
      </div>

      {/* Cron Jobs List */}
      {CRON_JOBS.map((job) => {
        const isRunning = runningJobs.has(job.id)
        const result = results[job.id]

        return (
          <div key={job.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {job.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4" />
                  <span>{job.schedule}</span>
                </div>
              </div>

              <Button
                onClick={() => runJob(job)}
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Executar Agora
                  </>
                )}
              </Button>
            </div>

            {/* Result */}
            {result && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        result.success ? 'text-green-900' : 'text-red-900'
                      }`}
                    >
                      {result.success ? 'Executado com sucesso!' : 'Erro na execução'}
                    </p>
                    <p
                      className={`text-sm mt-1 ${
                        result.success ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {new Date(result.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Result Details */}
                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                  <pre className="text-xs text-gray-700 overflow-auto max-h-40">
                    {JSON.stringify(result.data || result.error, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Configuration Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Configuração em Produção</h3>

        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>1. Deploy no Vercel:</strong> Os cron jobs funcionam automaticamente após deploy.
          </p>

          <p>
            <strong>2. Variável de Ambiente:</strong> Configure <code className="bg-gray-200 px-1 rounded">CRON_SECRET</code> no Vercel.
          </p>

          <p>
            <strong>3. Arquivo vercel.json:</strong> Já está configurado com os agendamentos.
          </p>

          <div className="mt-4 p-3 bg-gray-100 rounded">
            <p className="font-medium mb-2">Agendamentos configurados:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Sincronização iCal: A cada hora (0 * * * *)</li>
              <li>Check-ins Diários: Diariamente às 8h (0 8 * * *)</li>
              <li>Limpeza: Domingos às 2h (0 2 * * 0)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
