'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/common/ui/button';
import { useAuth } from '@/hooks/useAuth';
import TaskTable from '@/components/cleaning/TaskTable';
import TaskForm from '@/components/cleaning/TaskForm';
import TaskFilters from '@/components/cleaning/TaskFilters';

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
  console.log('[DEBUG] ManagerDashboardPage rendering...');
  const t = useTranslations('cleaning.manage');
  const { user } = useAuth();
  console.log('[DEBUG] Auth user:', user?.id);

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
        console.log('[DEBUG] Fetching cleaning tasks...');
        const params = new URLSearchParams();
        if (filters.property_id) params.append('propertyId', filters.property_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.cleaner_id) params.append('cleanerId', filters.cleaner_id);
        if (filters.dateFrom) params.append('startDate', filters.dateFrom);
        if (filters.dateTo) params.append('endDate', filters.dateTo);
        params.append('page', filters.page.toString());
        params.append('limit', '20');

        const url = `/api/cleaning/tasks?${params.toString()}`;
        console.log('[DEBUG] Fetch URL:', url);
        const response = await fetch(url);
        console.log('[DEBUG] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[DEBUG] Response error:', errorText);
          throw new Error(`Failed to fetch tasks: ${response.status}`);
        }

        const data = await response.json();
        console.log('[DEBUG] Response data:', data);
        setTasks(data.tasks || []);
        const limit = 20;
        const total = data.total || 0;
        setTotalPages(Math.ceil(total / limit));
      } catch (error) {
        console.error('Error fetching tasks:', error);
        throw error;
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
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="mt-2 text-sm text-gray-600 md:text-base">{t('subtitle')}</p>
        </div>
      </div>

      {/* Status */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm">Usuário: {user?.id || 'não autenticado'}</p>
        <p className="text-sm">Tarefas carregadas: {tasks.length}</p>
        <p className="text-sm">Carregando: {loading ? 'sim' : 'não'}</p>
      </div>

      {/* Simplified Tasks Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {loading ? (
          <p className="text-gray-500">{t('loading')}</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500">{t('no_tasks')}</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const taskData = task as Record<string, unknown>;
              return (
                <li key={taskData.id as string} className="text-sm border-b pb-2">
                  {(taskData.property_name as string) || 'Imóvel'} - {taskData.scheduled_date as string} ({taskData.status as string})
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
