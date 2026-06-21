'use client';

import { useState } from 'react';
import { X, ChevronRight, CheckCircle, Lightbulb } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  details: string[];
  icon: React.ReactNode;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'O que são Templates?',
    description: 'Templates de limpeza são checklists pré-configurados que definem exatamente o que precisa ser feito em cada tarefa.',
    details: [
      'Economize tempo criando tarefas rapidamente',
      'Garanta consistência em todas as limpezas',
      'Customize por propriedade ou use globalmente',
      'Reutilize e adapte templates existentes',
    ],
    icon: '📋',
  },
  {
    title: 'Tipos de Templates',
    description: 'Você pode criar dois tipos de templates:',
    details: [
      '🌍 Templates Globais: Usados em toda a organização por padrão',
      '🏠 Templates por Propriedade: Customizados para cada imóvel específico',
      'Marque um como "Padrão" para auto-selecionar ao criar tarefas',
      'Cada propriedade pode ter múltiplos templates',
    ],
    icon: '🎯',
  },
  {
    title: 'Como Criar um Template',
    description: 'Siga estes passos simples:',
    details: [
      '1. Clique em "+ Novo Template"',
      '2. Escolha o escopo (Global ou Propriedade)',
      '3. Adicione um nome e descrição',
      '4. Configure os itens do checklist com categorias',
      '5. Marque itens obrigatórios se necessário',
      '6. Salve e pronto!',
    ],
    icon: '➕',
  },
  {
    title: 'Usando Templates em Tarefas',
    description: 'Quando você cria uma nova tarefa de limpeza:',
    details: [
      '1. Selecione a propriedade',
      '2. O template padrão é carregado automaticamente',
      '3. Você pode trocar para outro template da mesma propriedade',
      '4. Ou criar a tarefa sem template (checklist em branco)',
      'O cleaner verá o checklist e marca itens conforme termina',
    ],
    icon: '✅',
  },
  {
    title: 'Dicas Úteis',
    description: 'Maximize o uso do sistema:',
    details: [
      '💡 Organize itens por categoria (Quarto, Cozinha, etc)',
      '💡 Marque itens críticos como "Obrigatório"',
      '💡 Crie variações: "Limpeza Padrão" e "Limpeza Profunda"',
      '💡 Use "Duplicar" para criar customizações baseadas em templates existentes',
      '💡 Revise templates regularmente baseado no feedback dos cleaners',
    ],
    icon: '💡',
  },
];

export default function TemplateOnboarding() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const step = ONBOARDING_STEPS[currentStep];
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 rounded-full bg-blue-500 text-white p-4 shadow-lg hover:bg-blue-600 transition-all hover:shadow-xl z-40 flex items-center justify-center"
        title="Ver tutorial"
        aria-label="Ver tutorial"
      >
        <span className="text-2xl">?</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-6 flex justify-between items-start">
              <div className="flex-1">
                <div className="text-4xl mb-2">{step.icon}</div>
                <h2 className="text-2xl font-bold text-white">{step.title}</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-blue-100 p-2 rounded-lg hover:bg-blue-500 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              <p className="text-gray-700 text-lg">{step.description}</p>

              {/* Details */}
              <div className="space-y-3">
                {step.details.map((detail, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 mt-1">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-gray-700">{detail}</p>
                  </div>
                ))}
              </div>

              {/* Visual Hint */}
              {currentStep === 2 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    Você pode organizar itens arrastando (↑ ↓), marcar como obrigatório, ou criar categorias personalizadas.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Passo {currentStep + 1} de {ONBOARDING_STEPS.length}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
                  disabled={currentStep === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>

                {isLast ? (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Entendi!
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep((p) => Math.min(ONBOARDING_STEPS.length - 1, p + 1))}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
