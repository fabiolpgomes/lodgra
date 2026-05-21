'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/useAuth';
import TaskTable from '@/components/cleaning/TaskTable';
import TaskForm from '@/components/cleaning/TaskForm';
import TaskFilters from '@/components/cleaning/TaskFilters';

export interface CleaningTask {
  id: string;
  organization_id: string;
  property_id: string;
  cleaner_id?: string;
  checklist_template_id?: string;
  status: 'pending' | 'in_progress' | 'done' | 'issue';
  scheduled_date: string;
  scheduled_time?: string;
  notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface FilterState {
  property_id?: string;
  status?: string;
  cleaner_id?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
}

export default function ManagerDashboardPage() {
  const t = useTranslations('cleaning.manage');
  const { user } = useAuth();

  const [tasks, setTasks] = useState<CleaningTask[]>([]);
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
        if (filters.property_id) params.append('property_id', filters.property_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.cleaner_id) params.append('cleaner_id', filters.cleaner_id);
        if (filters.dateFrom) params.append('date_from', filters.dateFrom);
        if (filters.dateTo) params.append('date_to', filters.dateTo);
        params.append('page', filters.page.toString());
        params.append('limit', '20');

        const response = await fetch(`/api/cleaning/tasks?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch tasks');

        const data = await response.json();
        setTasks(data.tasks);
        setTotalPages(data.pagination.totalPages);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [filters, user]);

  const handleCreateTask = (newTask: CleaningTask) => {
    // Optimistic update
    setTasks([newTask, ...tasks]);
    setShowCreateForm(false);
  };

  const handleTaskUpdate = (updatedTask: CleaningTask) => {
    setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="mt-2 text-gray-600">{t('subtitle')}</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          size="lg"
          className="gap-2"
        >
          <span>+</span>
          {t('create_button')}
        </Button>
      </div>

      {/* Filters */}
      <TaskFilters onFilterChange={handleFilterChange} />

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-4 text-xl font-semibold">{t('create_form_title')}</h2>
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
            <p className="text-gray-500">{t('loading')}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">{t('no_tasks')}</p>
          </div>
        ) : (
          <>
            <TaskTable
              tasks={tasks}
              onUpdate={handleTaskUpdate}
              onDelete={handleTaskDelete}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
                <div className="text-sm text-gray-600">
                  {t('page')} {filters.page} {t('of')} {totalPages}
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
                    {t('previous')}
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
                    {t('next')}
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
