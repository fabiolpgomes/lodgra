'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/common/ui/button';
import { useAuth } from '@/hooks/useAuth';
import TaskTable from '@/components/cleaning/TaskTable';
import TaskForm from '@/components/cleaning/TaskForm';
import TaskFilters from '@/components/cleaning/TaskFilters';

// Local translations to avoid useTranslations hook issues
const t_keys = {
  title: 'Gerenciar Tarefas de Limpeza',
  subtitle: 'Crie, edite e acompanhe tarefas de limpeza para suas propriedades',
  create_button: 'Nova Tarefa',
  create_form_title: 'Criar Nova Tarefa de Limpeza',
  loading: 'Carregando tarefas...',
  no_tasks: 'Nenhuma tarefa de limpeza encontrada',
  page: 'Página',
  of: 'de',
  previous: 'Anterior',
  next: 'Próxima',
};

interface FilterState {
  property_id?: string;
  status?: string;
  cleaner_id?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
}

interface CleaningTask {
  id: string;
  property_id: string;
  scheduled_date: string;
  scheduled_time?: string;
  cleaner_id?: string;
  checklist_template_id?: string;
  notes?: string;
  status?: 'pending' | 'in_progress' | 'done' | 'issue';
  completed_at?: string;
}

export default function ManagerDashboardPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ page: 1 });
  const [totalPages, setTotalPages] = useState(1);

  // Fetch tasks
  useEffect(() => {
    if (!user) return;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.property_id) params.append('propertyId', filters.property_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.cleaner_id) params.append('cleanerId', filters.cleaner_id);
        if (filters.dateFrom) params.append('startDate', filters.dateFrom);
        if (filters.dateTo) params.append('endDate', filters.dateTo);
        params.append('page', filters.page.toString());
        params.append('limit', '20');

        const response = await fetch(`/api/cleaning/tasks?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch tasks');

        const data = await response.json();
        setTasks(data.tasks || []);
        const limit = 20;
        const total = data.total || 0;
        setTotalPages(Math.ceil(total / limit));
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [filters, user]);

  const handleCreateTask = (newTask: unknown) => {
    // Optimistic update
    setTasks([newTask, ...tasks]);
    setShowCreateForm(false);
  };

  const handleTaskUpdate = (updatedTask: unknown) => {
    const updatedId = (updatedTask as Record<string, unknown>).id;
    setTasks(tasks.map((t) => {
      const taskId = (t as Record<string, unknown>).id;
      return taskId === updatedId ? updatedTask : t;
    }));
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(tasks.filter((t) => (t as Record<string, unknown>).id !== taskId));
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t_keys.title}</h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">{t_keys.subtitle}</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          size="lg"
          className="w-full gap-2 md:w-auto"
        >
          <span>+</span>
          {t_keys.create_button}
        </Button>
      </div>

      {/* Filters */}
      <TaskFilters onFilterChange={handleFilterChange} />

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-4 text-xl font-semibold">{t_keys.create_form_title}</h2>
          <TaskForm
            onSuccess={handleCreateTask}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Tasks Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">{t_keys.loading}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">{t_keys.no_tasks}</p>
          </div>
        ) : (
          <>
            <TaskTable
              tasks={tasks as CleaningTask[]}
              onUpdate={handleTaskUpdate}
              onDelete={handleTaskDelete}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
                <div className="text-sm text-gray-600">
                  {t_keys.page} {filters.page} {t_keys.of} {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleFilterChange({ page: Math.max(1, filters.page - 1) })
                    }
                    disabled={filters.page === 1}
                  >
                    {t_keys.previous}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleFilterChange({
                        page: Math.min(totalPages, filters.page + 1),
                      })
                    }
                    disabled={filters.page === totalPages}
                  >
                    {t_keys.next}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
