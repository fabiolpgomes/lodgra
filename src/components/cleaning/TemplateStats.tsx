'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface CleaningTask {
  checklist_template_id?: string;
}

interface Stats {
  totalTemplates: number;
  templatesUsed: number;
  tasksCreated: number;
  averageItemsPerTemplate: number;
}

export default function TemplateStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/cleaning/templates');
      if (!response.ok) throw new Error('Failed to fetch');

      const { templates } = await response.json();

      const tasksResponse = await fetch('/api/cleaning/tasks');
      const tasksData = tasksResponse.ok ? await tasksResponse.json() : { tasks: [] };

      const templatesUsed = new Set(
        tasksData.tasks
          ?.filter((t: CleaningTask) => t.checklist_template_id)
          .map((t: CleaningTask) => t.checklist_template_id)
      ).size;

      setStats({
        totalTemplates: templates.length,
        templatesUsed,
        tasksCreated: tasksData.tasks?.length || 0,
        averageItemsPerTemplate: 15, // Placeholder
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return null;
  }

  const statCards = [
    {
      icon: BarChart3,
      label: 'Templates Criados',
      value: stats.totalTemplates,
      color: 'blue',
    },
    {
      icon: TrendingUp,
      label: 'Reutilizados',
      value: stats.templatesUsed,
      color: 'green',
    },
    {
      icon: CheckCircle,
      label: 'Tarefas Criadas',
      value: stats.tasksCreated,
      color: 'purple',
    },
    {
      icon: Clock,
      label: 'Itens Médios',
      value: stats.averageItemsPerTemplate,
      color: 'orange',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statCards.map((card) => {
        const Icon = card.icon;
        const bgColor = {
          blue: 'bg-blue-50',
          green: 'bg-green-50',
          purple: 'bg-purple-50',
          orange: 'bg-orange-50',
        }[card.color];

        const textColor = {
          blue: 'text-blue-600',
          green: 'text-green-600',
          purple: 'text-purple-600',
          orange: 'text-orange-600',
        }[card.color];

        return (
          <div key={card.label} className={`${bgColor} rounded-lg p-4 border-l-4 border-${card.color}-400`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">{card.label}</p>
                <p className={`text-2xl font-bold ${textColor} mt-1`}>{card.value}</p>
              </div>
              <Icon className={`h-8 w-8 ${textColor} opacity-50`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
