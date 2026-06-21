'use client';

import { useEffect, useState } from 'react';
import { Star, HistoryIcon } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  is_default?: boolean;
}

interface QuickTemplateSelectorProps {
  propertyId: string;
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
}

export default function QuickTemplateSelector({
  propertyId,
  selectedTemplateId,
  onSelectTemplate,
}: QuickTemplateSelectorProps) {
  const [suggestedTemplates, setSuggestedTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propertyId) {
      loadSuggested();
    }
  }, [propertyId]);

  const loadSuggested = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cleaning/templates/suggested?propertyId=${propertyId}`);
      if (response.ok) {
        const { templates } = await response.json();
        setSuggestedTemplates(templates.slice(0, 3));
      }
    } catch (err) {
      console.error('Error loading suggested templates:', err);
    } finally {
      setLoading(false);
    }
  };

  if (suggestedTemplates.length === 0 || loading) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <HistoryIcon className="h-4 w-4 text-gray-600" />
        <p className="text-sm font-medium text-gray-700">Usados Recentemente</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {suggestedTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-all ${
              selectedTemplateId === template.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {template.is_default && <Star className="h-3 w-3 inline mr-1" />}
            {template.name}
          </button>
        ))}
      </div>
    </div>
  );
}
