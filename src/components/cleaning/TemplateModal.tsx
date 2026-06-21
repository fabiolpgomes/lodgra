'use client';

import { useState, useEffect } from 'react';
import TemplateBuilder from './TemplateBuilder';

interface TemplateItem {
  id?: string;
  label: string;
  category?: string;
  is_required?: boolean;
}

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId?: string;
  propertyId?: string;
  isGlobal?: boolean;
  onSaved?: () => void;
  properties?: Array<{ id: string; name: string }>;
}

export default function TemplateModal({
  isOpen,
  onClose,
  templateId,
  propertyId: initialPropertyId,
  isGlobal: initialIsGlobal,
  onSaved,
  properties = [],
}: TemplateModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [propertyId, setPropertyId] = useState(initialPropertyId || '');
  const [isGlobal, setIsGlobal] = useState(initialIsGlobal || false);

  useEffect(() => {
    if (templateId && isOpen) {
      loadTemplate();
    } else if (isOpen) {
      setName('');
      setDescription('');
      setItems([]);
      setPropertyId(initialPropertyId || '');
      setIsGlobal(initialIsGlobal || false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, isOpen]);

  const loadTemplate = async () => {
    try {
      const response = await fetch(`/api/cleaning/templates/${templateId}`);
      if (!response.ok) throw new Error('Failed to load template');

      const { template } = await response.json();
      setName(template.name);
      setDescription(template.description || '');
      setItems(template.items || []);
      setPropertyId(template.property_id || '');
      setIsGlobal(template.is_global || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar template');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    if (items.length === 0) {
      setError('Add at least one item to the checklist');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        description: description || null,
        property_id: propertyId || null,
        is_global: isGlobal,
        items,
      };

      const response = await fetch(
        templateId ? `/api/cleaning/templates/${templateId}` : '/api/cleaning/templates',
        {
          method: templateId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar template');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {templateId ? 'Editar Template' : 'Novo Template de Limpeza'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Scope Selection */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Escopo do Template</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!isGlobal}
                  onChange={() => {
                    setIsGlobal(false);
                    if (propertyId) setPropertyId('');
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Propriedade Específica</span>
              </label>

              {!isGlobal && (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3 py-2 ml-6 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Selecionar propriedade</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name}
                    </option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={isGlobal}
                  onChange={() => {
                    setIsGlobal(true);
                    setPropertyId('');
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Template Global (Organização)</span>
              </label>
            </div>
          </div>

          {/* Template Builder */}
          <TemplateBuilder
            name={name}
            description={description}
            items={items}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onItemsChange={setItems}
          />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
          >
            {loading ? 'Salvando...' : templateId ? 'Atualizar' : 'Criar Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
