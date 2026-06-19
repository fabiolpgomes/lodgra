'use client'

import { useState } from 'react'
import { X, ChevronDown, Lightbulb, Info } from 'lucide-react'

interface WorkflowFlowModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WorkflowFlowModal({ isOpen, onClose }: WorkflowFlowModalProps) {
  const [expandedState, setExpandedState] = useState<string | null>('pending')

  if (!isOpen) return null

  const states = [
    {
      id: 'pending',
      number: 1,
      title: 'Pendente',
      color: 'from-yellow-500 to-orange-500',
      icon: '⏳',
      description: 'Tarefa criada e aguardando execução',
      actions: [
        '✏️ Editar (Status, Data, Responsável)',
        '❌ Deletar tarefa',
        '📱 Enviar notificação WhatsApp',
      ],
      tips: 'Você pode fazer qualquer alteração enquanto estiver em PENDENTE',
      details: [
        'Manager cria a tarefa',
        'Atribui um cleaner responsável',
        'Define data e hora da limpeza',
        'Cleaner recebe notificação automática',
      ],
    },
    {
      id: 'in_progress',
      number: 2,
      title: 'Executando',
      color: 'from-blue-500 to-cyan-500',
      icon: '🔄',
      description: 'Cleaner está executando a limpeza',
      actions: [
        '👁️ Ver progresso do checklist',
        '📝 Adicionar notas observações',
        '⛔ Cancelar se necessário',
      ],
      tips: 'Cleaner marca itens conforme completa a limpeza',
      details: [
        'Cleaner clica em "Iniciar"',
        'Marca itens do checklist ☑️',
        'Tira fotos de evidência 📸',
        'Adiciona notas sobre particularidades',
      ],
    },
    {
      id: 'completed',
      number: 3,
      title: 'Finalizado',
      color: 'from-green-500 to-emerald-500',
      icon: '✅',
      description: 'Limpeza concluída com sucesso',
      actions: [
        '📋 Ver relatório gerado',
        '🖼️ Download de fotos',
        '🗂️ Arquivar tarefa',
      ],
      tips: 'Todos os dados são mantidos para auditoria',
      details: [
        'Cleaner marca como "Finalizado"',
        'Relatório gerado automaticamente',
        'Manager revê evidências e fotos',
        'Tarefa arquivada para histórico',
      ],
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-lodgra-blue to-blue-600 p-6 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-black text-white">Fluxo de Limpeza</h2>
            <p className="text-blue-100 text-sm mt-1">Como funciona o ciclo de vida de uma tarefa</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* States Timeline */}
          <div className="space-y-4">
            {states.map((state, idx) => (
              <div key={state.id}>
                {/* State Card */}
                <button
                  onClick={() =>
                    setExpandedState(expandedState === state.id ? null : state.id)
                  }
                  className={`w-full bg-gradient-to-r ${state.color} rounded-2xl p-6 text-white transition-all hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{state.icon}</div>
                      <div className="text-left">
                        <div className="text-sm font-bold opacity-90">
                          Passo {state.number}
                        </div>
                        <div className="text-2xl font-black">{state.title}</div>
                        <div className="text-sm opacity-95 mt-1">
                          {state.description}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-6 w-6 transition-transform ${
                        expandedState === state.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedState === state.id && (
                  <div className="mt-4 ml-8 space-y-4 pb-4 border-l-4 border-gray-200 dark:border-zinc-700 pl-6">
                    {/* Checklist */}
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-sm uppercase tracking-wider">
                        O que acontece:
                      </h4>
                      <ul className="space-y-2">
                        {state.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="text-lodgra-blue font-bold mt-0.5">→</span>
                            <span className="text-gray-700 dark:text-gray-300 text-sm">
                              {detail}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-sm uppercase tracking-wider">
                        Ações disponíveis:
                      </h4>
                      <div className="space-y-2">
                        {state.actions.map((action, i) => (
                          <div
                            key={i}
                            className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300"
                          >
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tip */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
                      <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-900 dark:text-blue-200">
                        <span className="font-bold">Dica: </span>
                        {state.tips}
                      </p>
                    </div>
                  </div>
                )}

                {/* Arrow */}
                {idx < states.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className="text-2xl text-gray-400">↓</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex gap-3">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-100">
              <p className="font-bold mb-2">📋 Dados Persistem</p>
              <p>
                Todas as tarefas, fotos e relatórios são mantidos no sistema para auditoria e
                histórico, mesmo após conclusão.
              </p>
            </div>
          </div>

          {/* Example Flow */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 rounded-xl p-6">
            <h3 className="font-black text-gray-900 dark:text-white mb-4">📖 Exemplo Prático</h3>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <span className="font-bold">Segunda 09:00 -</span> Manager cria tarefa para limpeza
                da Propriedade X
              </p>
              <p>
                <span className="font-bold">Segunda 09:15 -</span> Cleaner João recebe notificação
                no WhatsApp
              </p>
              <p>
                <span className="font-bold">Segunda 10:00 -</span> João clica em &quot;Iniciar&quot;, status
                muda para EXECUTANDO
              </p>
              <p>
                <span className="font-bold">Segunda 11:30 -</span> João marca todos os itens do
                checklist ✅
              </p>
              <p>
                <span className="font-bold">Segunda 11:45 -</span> João tira 3 fotos e clica
                &quot;Finalizar&quot;
              </p>
              <p>
                <span className="font-bold">Segunda 12:00 -</span> Relatório gerado automaticamente,
                Manager revê
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-zinc-800 p-6 border-t border-gray-200 dark:border-zinc-700 rounded-b-3xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-lodgra-blue text-white rounded-xl font-bold hover:bg-lodgra-blue/90 transition"
          >
            Entendido!
          </button>
        </div>
      </div>
    </div>
  )
}
