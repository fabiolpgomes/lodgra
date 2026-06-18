'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import CreateTaskModal from './CreateTaskModal';
import TaskHistory from './TaskHistory';

interface Task {
  id: string;
  property: { name: string; address: string; city: string };
  cleaner: { full_name: string; phone: string; email: string };
  reservation: { guest_id: string; guests: { full_name: string; phone: string } };
  status: 'pending' | 'in_progress' | 'done' | 'issue';
  scheduled_date: string;
  scheduled_time: string;
  photo_count: number;
  checklist_completion: number;
  notes: string;
  completed_at: string;
}

interface Property {
  id: string;
  name: string;
}

interface Cleaner {
  id: string;
  full_name: string;
  phone: string;
}

export default function CleaningManagerDashboard() {
  const t = useTranslations('cleaning.manager');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [regeneratingTaskId, setRegeneratingTaskId] = useState<string | null>(null);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const url = new URL('/api/cleaning/tasks', window.location.origin);
        if (statusFilter) url.searchParams.append('status', statusFilter);
        if (dateFilter) {
          url.searchParams.append('startDate', dateFilter);
          url.searchParams.append('endDate', dateFilter);
        }

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [statusFilter, dateFilter]);

  // Fetch properties and cleaners on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propsRes, cleanersRes] = await Promise.all([
          fetch('/api/properties'),
          fetch('/api/users?role=cleaner'),
        ]);

        if (propsRes.ok) {
          const propsData = await propsRes.json();
          setProperties(propsData);
        }

        if (cleanersRes.ok) {
          const cleanersData = await cleanersRes.json();
          setCleaners(cleanersData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'done':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'issue':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'in_progress':
        return 'Em Progresso';
      case 'done':
        return 'Concluída';
      case 'issue':
        return 'Problema';
      default:
        return status;
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string): Promise<void> => {
    try {
      const res = await fetch('/api/cleaning/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update task');

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t))
      );
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Erro ao atualizar tarefa');
    }
  };

  const handleRegenerateLink = async (taskId: string): Promise<void> => {
    setRegeneratingTaskId(taskId);
    try {
      const res = await fetch('/api/cleaning/regenerate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });

      if (!res.ok) throw new Error('Failed to regenerate token');
      const data: { accessLink: string } = await res.json();

      const fullLink = `${window.location.origin}${data.accessLink}`;
      await navigator.clipboard.writeText(fullLink);
      alert('✅ Novo link copiado ao clipboard!\n\n' + fullLink);
    } catch (error) {
      console.error('Error regenerating link:', error);
      alert('Erro ao regenerar link');
    } finally {
      setRegeneratingTaskId(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestão de Limpezas</h1>
        <div className="flex gap-4">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em Progresso</option>
            <option value="done">Concluída</option>
            <option value="issue">Problema</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
          >
            + Criar Tarefa
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        properties={properties}
        cleaners={cleaners}
        onTaskCreated={() => {
          setShowCreateModal(false);
          // Refetch tasks
          window.location.reload();
        }}
      />

      <TaskHistory
        taskId={selectedTaskForHistory || ''}
        isOpen={!!selectedTaskForHistory}
        onClose={() => setSelectedTaskForHistory(null)}
      />

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Nenhuma tarefa encontrada</div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white border rounded-lg p-6 hover:shadow-lg transition">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start mb-4">
                {/* Property Info */}
                <div>
                  <h3 className="font-bold text-lg">{task.property.name}</h3>
                  <p className="text-sm text-gray-600">
                    📍 {task.property.address}, {task.property.city}
                  </p>
                  <p className="text-sm text-gray-600">👤 {task.reservation.guests.full_name}</p>
                </div>

                {/* Cleaner Info */}
                <div>
                  <p className="font-semibold">Cleaner</p>
                  <p className="text-sm">{task.cleaner?.full_name || 'Não atribuído'}</p>
                  <p className="text-xs text-gray-600">
                    📞 {task.cleaner?.phone || '-'}
                  </p>
                  <p className="text-xs text-blue-600 hover:underline cursor-pointer">
                    {task.cleaner?.email}
                  </p>
                </div>

                {/* Task Info */}
                <div>
                  <p className="font-semibold">Agendado</p>
                  <p className="text-sm">
                    📅 {new Date(task.scheduled_date).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-sm">🕐 {task.scheduled_time || '-'}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {task.photo_count} foto(s) • {task.checklist_completion}% checklist
                  </p>
                </div>

                {/* Status & Regenerate */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Status</label>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className={`w-full px-3 py-2 rounded border ${getStatusColor(task.status)}`}
                  >
                    <option value="pending">Pendente</option>
                    <option value="in_progress">Em Progresso</option>
                    <option value="done">Concluída</option>
                    <option value="issue">Problema</option>
                  </select>
                  
                  {task.cleaner && (
                    <div className="mt-2 space-y-2">
                      <button
                        onClick={() => handleRegenerateLink(task.id)}
                        disabled={regeneratingTaskId === task.id}
                        className="w-full px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        {regeneratingTaskId === task.id ? '🔄 Gerando...' : '🔗 Novo Link'}
                      </button>
                      <button
                        onClick={() => setSelectedTaskForHistory(task.id)}
                        className="w-full px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        📜 Ver Histórico
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {task.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded border-l-4 border-blue-400">
                  <p className="text-sm text-gray-700">
                    <strong>Notas:</strong> {task.notes}
                  </p>
                </div>
              )}

              {/* Completion Time */}
              {task.completed_at && (
                <div className="mt-2 text-xs text-gray-500">
                  ✅ Concluída em{' '}
                  {new Date(task.completed_at).toLocaleDateString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mt-8">
        <SummaryCard label="Total" value={tasks.length} color="bg-gray-100" />
        <SummaryCard
          label="Pendentes"
          value={tasks.filter((t) => t.status === 'pending').length}
          color="bg-yellow-100"
        />
        <SummaryCard
          label="Em Progresso"
          value={tasks.filter((t) => t.status === 'in_progress').length}
          color="bg-blue-100"
        />
        <SummaryCard
          label="Concluídas"
          value={tasks.filter((t) => t.status === 'done').length}
          color="bg-green-100"
        />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`${color} rounded-lg p-4 text-center`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
