'use client';

import { useState } from 'react';
import { Button } from '@/design-system/atoms/Button';
import { Input } from '@/design-system/atoms/Input';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface ChecklistItem {
  id?: string;
  label: string;
  category: string;
  is_required: boolean;
  order_index: number;
}

interface ChecklistBuilderProps {
  initialTemplate?: {
    id: string;
    name: string;
    description?: string;
    property_id?: string;
    items: ChecklistItem[];
  };
}

const CATEGORIES = ['Quarto', 'Banheiro', 'Cozinha', 'Sala', 'Geral'];

export function ChecklistBuilder({ initialTemplate }: ChecklistBuilderProps) {
  const [name, setName] = useState(initialTemplate?.name || '');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [items, setItems] = useState<ChecklistItem[]>(
    initialTemplate?.items || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addItem = () => {
    const newItem: ChecklistItem = {
      label: '',
      category: 'Geral',
      is_required: false,
      order_index: items.length
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ChecklistItem, value: string | boolean) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError('Nome do modelo é obrigatório');
      return;
    }

    if (items.some(item => !item.label.trim())) {
      setError('Todos os itens devem ter um label');
      return;
    }

    setLoading(true);

    try {
      const url = initialTemplate
        ? `/api/cleaning-checklists/${initialTemplate.id}`
        : '/api/cleaning-checklists';

      const method = initialTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          items
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar modelo');
      }

      setSuccess(true);
      if (!initialTemplate) {
        setName('');
        setDescription('');
        setItems([]);
      }
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar';
      setError(message);
      console.error('[ChecklistBuilder] Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            {initialTemplate ? 'Modelo atualizado com sucesso!' : 'Modelo criado com sucesso!'}
          </p>
        </div>
      )}

      {/* Template Info */}
      <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Modelo
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Limpeza Standard"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva quando usar este modelo"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            disabled={loading}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Itens do Checklist</h2>
          <Button
            type="button"
            onClick={addItem}
            variant="secondary"
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600">Nenhum item adicionado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg"
              >
                <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(index, 'label', e.target.value)}
                    placeholder="Descrição do item"
                    disabled={loading}
                  />

                  <select
                    value={item.category}
                    onChange={(e) => updateItem(index, 'category', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.is_required}
                      onChange={(e) => updateItem(index, 'is_required', e.target.checked)}
                      disabled={loading}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Obrigatório</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={loading}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Salvando...' : initialTemplate ? 'Atualizar Modelo' : 'Criar Modelo'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.history.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
