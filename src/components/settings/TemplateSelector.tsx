'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/design-system/atoms/Button';
import { Loader2 } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description?: string;
  property_id?: string;
  items?: any[];
}

interface TemplateSelectorProps {
  propertyId?: string;
  selectedTemplateId?: string;
  onSelect: (templateId: string) => void;
  label?: string;
}

export function TemplateSelector({
  propertyId,
  selectedTemplateId,
  onSelect,
  label = 'Selecione um modelo de checklist'
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const url = propertyId
          ? `/api/cleaning-checklists?property_id=${propertyId}`
          : '/api/cleaning-checklists';

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error('Failed to fetch templates');
        }

        const data = await res.json();
        setTemplates(data.data || []);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error loading templates';
        setError(message);
        console.error('[TemplateSelector] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600">Carregando modelos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          Nenhum modelo de checklist disponível. Crie um modelo primeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="grid gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={`p-4 text-left rounded-lg border-2 transition ${
              selectedTemplateId === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                {template.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {template.description}
                  </p>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  {template.items?.length || 0} itens
                  {template.property_id ? ' • Propriedade específica' : ' • Global'}
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 mt-1 ${
                  selectedTemplateId === template.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
