'use client';

import { useState } from 'react';

interface TemplateItem {
  id?: string;
  label: string;
  category?: string;
  is_required?: boolean;
  order_index?: number;
}

interface TemplateBuilderProps {
  name: string;
  description?: string;
  items: TemplateItem[];
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onItemsChange: (items: TemplateItem[]) => void;
  categories?: string[];
}

const DEFAULT_CATEGORIES = ['Sala de estar', 'Quarto', 'Cozinha', 'Casa de Banho', 'Varanda', 'Geral'];

export default function TemplateBuilder({
  name,
  description,
  items,
  onNameChange,
  onDescriptionChange,
  onItemsChange,
  categories = DEFAULT_CATEGORIES,
}: TemplateBuilderProps) {
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');

  const addItem = () => {
    if (!newItemLabel.trim()) return;

    const newItem: TemplateItem = {
      label: newItemLabel,
      category: newItemCategory || null,
      is_required: false,
      order_index: items.length,
    };

    onItemsChange([...items, newItem]);
    setNewItemLabel('');
    setNewItemCategory('');
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | boolean | null) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value, order_index: index };
    onItemsChange(updated);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const updated = [...items];
    [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
    onItemsChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Template Info */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-semibold text-lg mb-4">Informações do Template</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Template *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Limpeza Padrão"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={description || ''}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Template para limpezas regulares após checkout"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="font-semibold text-lg mb-4">Itens do Checklist</h3>

        {items.length > 0 && (
          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(index, 'label', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    placeholder="Item"
                  />
                  <select
                    value={item.category || ''}
                    onChange={(e) => updateItem(index, 'category', e.target.value || null)}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={item.is_required || false}
                    onChange={(e) => updateItem(index, 'is_required', e.target.checked)}
                  />
                  <span className="text-xs text-gray-600">Obrigatório</span>
                </label>

                <div className="flex gap-1">
                  <button
                    onClick={() => moveItem(index, index - 1)}
                    disabled={index === 0}
                    className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(index, index + 1)}
                    disabled={index === items.length - 1}
                    className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-50"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeItem(index)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Item */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Adicionar Item</h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Descrição do item"
            />
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Categoria</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              onClick={addItem}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        {items.length} itens no checklist
      </div>
    </div>
  );
}
