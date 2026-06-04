import { ChecklistFiller } from '@/components/settings/ChecklistFiller';
import { Button } from '@/design-system/atoms/Button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// Mock data for demo
const mockTask = {
  id: 'task-123',
  property: { name: 'Refúgio da Montanha' },
  scheduled_date: '2026-06-03',
  status: 'in_progress',
  checklist: {
    template_id: 'template-1',
    items: [
      {
        id: 'item-1',
        label: 'Trocar roupa de cama',
        category: 'Quarto',
        is_required: true,
        order_index: 0
      },
      {
        id: 'item-2',
        label: 'Aspirar carpete',
        category: 'Quarto',
        is_required: true,
        order_index: 1
      },
      {
        id: 'item-3',
        label: 'Limpar espelho',
        category: 'Quarto',
        is_required: false,
        order_index: 2
      },
      {
        id: 'item-4',
        label: 'Limpar sanita',
        category: 'Banheiro',
        is_required: true,
        order_index: 3
      },
      {
        id: 'item-5',
        label: 'Trocar toalhas',
        category: 'Banheiro',
        is_required: true,
        order_index: 4
      },
      {
        id: 'item-6',
        label: 'Repor papel higiénico',
        category: 'Banheiro',
        is_required: false,
        order_index: 5
      }
    ]
  }
};

export default function CleanerTaskPage({
  params
}: {
  params: { id: string }
}) {
  // TODO: Fetch real task data
  const task = mockTask;

  const handleTaskComplete = async () => {
    // Mark task as complete via API
    try {
      const res = await fetch(`/api/cleaning-tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' })
      });

      if (res.ok) {
        // Redirect to task list
        window.location.href = '/cleaner/tasks';
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/cleaner/tasks"
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {task.property.name}
              </h1>
              <p className="text-sm text-gray-600">
                {new Date(task.scheduled_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ChecklistFiller
          taskId={task.id}
          items={task.checklist.items}
          onComplete={handleTaskComplete}
        />

        {/* Task Info */}
        <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Instruções</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ Marque cada item conforme concluir</li>
            <li>✓ Itens com ⚠ "Obrigatório" não podem ser saltados</li>
            <li>✓ Adicione notas se precisar relatar algo</li>
            <li>✓ As mudanças são salvas automaticamente</li>
            <li>✓ Clique "Concluir Limpeza" quando terminar</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
