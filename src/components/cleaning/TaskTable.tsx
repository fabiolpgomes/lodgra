'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CleaningTask } from '@/app/[locale]/cleaning/manage/page';

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

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-gray-200 bg-gray-50">
            <TableHead className="w-[200px]">{t('property')}</TableHead>
            <TableHead className="w-[150px]">{t('date')}</TableHead>
            <TableHead className="w-[150px]">{t('cleaner')}</TableHead>
            <TableHead className="w-[120px]">{t('status')}</TableHead>
            <TableHead className="w-[200px]">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className="border-b border-gray-200">
              <TableCell className="font-medium">{task.property_id}</TableCell>
              <TableCell>
                {new Date(task.scheduled_date).toLocaleDateString()}
              </TableCell>
              <TableCell>{task.cleaner_id || t('unassigned')}</TableCell>
              <TableCell>
                <span
                  className={`inline-block rounded-full px-2 py-1 text-sm font-medium ${
                    statusColors[task.status as keyof typeof statusColors]
                  }`}
                >
                  {statusLabels[task.status] || task.status}
                </span>
              </TableCell>
              <TableCell>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
