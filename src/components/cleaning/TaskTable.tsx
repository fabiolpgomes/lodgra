'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/ui/button';
import { CleaningTask } from '@/app/[locale]/cleaning/manage/page';

interface CleanerOption {
  id: string;
  full_name: string;
}

interface TaskTableProps {
  tasks: CleaningTask[];
  onUpdate: (task: CleaningTask) => void;
  onDelete: (taskId: string) => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
  issue: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  done: 'Concluída',
  issue: 'Problema',
};

export default function TaskTable({
  tasks,
  onUpdate,
  onDelete,
}: TaskTableProps) {
  const t = useTranslations('cleaning.manage.table');
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cleaners, setCleaners] = useState<CleanerOption[]>([]);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [selectedCleanerId, setSelectedCleanerId] = useState<string>('');

  useEffect(() => {
    const fetchCleaners = async () => {
      try {
        const response = await fetch('/api/users?type=cleaner');
        if (response.ok) {
          const data = await response.json();
          setCleaners(data);
        }
      } catch (error) {
        console.error('Error fetching cleaners:', error);
      }
    };
    fetchCleaners();
  }, []);

  const handleDelete = async (taskId: string) => {
    if (!confirm(t('delete_confirm'))) return;

    try {
      const response = await fetch(`/api/cleaning/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      onDelete(taskId);
    } catch (error) {
      console.error('Delete error:', error);
      alert(t('delete_error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkDone = async (task: CleaningTask) => {
    if (!confirm(t('mark_done_confirm'))) return;

    try {
      const response = await fetch(`/api/cleaning/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'done',
          completed_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Update failed');

      const updated = await response.json();
      onUpdate(updated);
    } catch (error) {
      console.error('Update error:', error);
      alert(t('update_error'));
    }
  };

  const handleAssignCleaner = async (task: CleaningTask) => {
    if (!selectedCleanerId) {
      alert(t('select_cleaner'));
      return;
    }

    try {
      const response = await fetch(`/api/cleaning/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleaner_id: selectedCleanerId,
        }),
      });

      if (!response.ok) throw new Error('Assign failed');

      const updated = await response.json();
      onUpdate(updated);
      setAssigningTaskId(null);
      setSelectedCleanerId('');
    } catch (error) {
      console.error('Assign error:', error);
      alert(t('assign_error') || 'Error assigning cleaner');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="w-[200px] text-left px-4 py-2 font-semibold text-sm">
              {t('property')}
            </th>
            <th className="w-[150px] text-left px-4 py-2 font-semibold text-sm">
              {t('date')}
            </th>
            <th className="w-[150px] text-left px-4 py-2 font-semibold text-sm">
              {t('cleaner')}
            </th>
            <th className="w-[120px] text-left px-4 py-2 font-semibold text-sm">
              {t('status')}
            </th>
            <th className="w-[200px] text-left px-4 py-2 font-semibold text-sm">
              {t('actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-sm">{task.property_id}</td>
              <td className="px-4 py-3 text-sm">
                {new Date(task.scheduled_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm">
                {task.cleaner_id || t('unassigned')}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-block rounded-full px-2 py-1 text-sm font-medium ${
                    statusColors[task.status as keyof typeof statusColors]
                  }`}
                >
                  {statusLabels[task.status] || task.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/cleaning/tasks/${task.id}`)
                      }
                    >
                      {t('view')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/cleaning/manage/${task.id}/edit`)
                      }
                    >
                      {t('edit')}
                    </Button>
                    {task.status !== 'done' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkDone(task)}
                      >
                        {t('mark_done')}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
                      disabled={deletingId === task.id}
                    >
                      {t('delete')}
                    </Button>
                  </div>
                  {assigningTaskId === task.id && (
                    <div className="flex gap-2 bg-blue-50 p-2 rounded">
                      <select
                        value={selectedCleanerId}
                        onChange={(e) => setSelectedCleanerId(e.target.value)}
                        className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                      >
                        <option value="">{t('select_cleaner')}</option>
                        {cleaners.map((cleaner) => (
                          <option key={cleaner.id} value={cleaner.id}>
                            {cleaner.full_name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => handleAssignCleaner(task)}
                      >
                        {t('assign')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAssigningTaskId(null);
                          setSelectedCleanerId('');
                        }}
                      >
                        {t('cancel')}
                      </Button>
                    </div>
                  )}
                  {assigningTaskId !== task.id && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setAssigningTaskId(task.id)}
                    >
                      {t('assign_cleaner')}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
