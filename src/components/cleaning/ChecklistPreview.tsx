'use client';

import { useMemo } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ChecklistItem {
  id?: string;
  label: string;
  category?: string;
  is_required?: boolean;
}

interface ChecklistPreviewProps {
  items: ChecklistItem[];
  title?: string;
  compact?: boolean;
}

export default function ChecklistPreview({
  items,
  title = 'Checklist',
  compact = false,
}: ChecklistPreviewProps) {
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};

    items.forEach((item) => {
      const category = item.category || 'Sem Categoria';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    return groups;
  }, [items]);

  const categories = Object.entries(groupedByCategory);

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500 border border-gray-200">
        Nenhum item no checklist
      </div>
    );
  }

  return (
    <div className={`space-y-${compact ? '2' : '4'}`}>
      {!compact && <h3 className="font-semibold text-gray-900">{title}</h3>}

      <div className={`space-y-${compact ? '3' : '4'}`}>
        {categories.map(([category, categoryItems]) => (
          <div key={category}>
            {!compact && (
              <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                {category}
              </h4>
            )}

            <div className={`space-y-${compact ? '1.5' : '2'}`}>
              {categoryItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {item.is_required ? (
                      <AlertCircle className={`h-${compact ? '3.5' : '4'} w-${compact ? '3.5' : '4'} text-red-500`} />
                    ) : (
                      <CheckCircle2 className={`h-${compact ? '3.5' : '4'} w-${compact ? '3.5' : '4'} text-gray-300`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-${compact ? 'xs' : 'sm'} text-gray-700`}>{item.label}</p>
                    {item.is_required && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-red-50 text-red-700 text-xs rounded">
                        Obrigatório
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
        Total: {items.length} itens
        {Object.values(groupedByCategory).some((items) =>
          items.some((i) => i.is_required)
        ) && (
          <>
            {' '}
            •{' '}
            <span className="text-red-600 font-medium">
              {Object.values(groupedByCategory)
                .flat()
                .filter((i) => i.is_required).length}{' '}
              obrigatórios
            </span>
          </>
        )}
      </div>
    </div>
  );
}
