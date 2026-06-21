'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, Zap } from 'lucide-react';

interface CleaningTask {
  checklist_template_id?: string;
}

interface Template {
  id: string;
  name: string;
}

interface TemplateUsage {
  template_id: string;
  template_name: string;
  usage_count: number;
}

export default function TemplateInsights() {
  const [insights, setInsights] = useState<{
    mostUsed: TemplateUsage[];
    unusedCount: number;
    totalUsage: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const templatesRes = await fetch('/api/cleaning/templates');
      const tasksRes = await fetch('/api/cleaning/tasks');

      if (!templatesRes.ok || !tasksRes.ok) throw new Error('Failed to fetch');

      const { templates } = await templatesRes.json();
      const { tasks } = await tasksRes.json();

      const usageMap = new Map<string, number>();
      tasks?.forEach((task: CleaningTask) => {
        if (task.checklist_template_id) {
          usageMap.set(
            task.checklist_template_id,
            (usageMap.get(task.checklist_template_id) || 0) + 1
          );
        }
      });

      const mostUsed = Array.from(usageMap.entries())
        .map(([id, count]) => ({
          template_id: id,
          template_name: templates.find((t: Template) => t.id === id)?.name || 'Unknown',
          usage_count: count,
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 3);

      const unusedCount = templates.filter(
        (t: Template) => !usageMap.has(t.id)
      ).length;

      const totalUsage = Array.from(usageMap.values()).reduce((a, b) => a + b, 0);

      setInsights({ mostUsed, unusedCount, totalUsage });
    } catch (err) {
      console.error('Error loading insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !insights) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        Insights de Uso
      </h3>

      <div className="space-y-4">
        {insights.mostUsed.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Templates Mais Usados</p>
            <div className="space-y-2">
              {insights.mostUsed.map((item, idx) => (
                <div key={item.template_id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">#{idx + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.template_name}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Zap className="h-3 w-3" />
                    {item.usage_count} usadas
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.unusedCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-900">
                {insights.unusedCount} template{insights.unusedCount !== 1 ? 's' : ''} não usados
              </p>
              <p className="text-yellow-800 text-xs mt-1">
                Considere deletar templates não utilizados para manter a organização limpa.
              </p>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3">
          <div className="text-sm">
            <p className="text-gray-600">
              <span className="font-semibold">{insights.totalUsage}</span> tarefas criadas usando templates
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
