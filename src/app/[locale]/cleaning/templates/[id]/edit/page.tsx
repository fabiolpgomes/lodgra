'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/common/ui/button';
import { Input } from '@/components/common/ui/input';

interface ChecklistItem {
  id?: string;
  label: string;
  category?: string;
  is_required?: boolean;
  order_index?: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  items: ChecklistItem[];
}

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/cleaning/templates/${templateId}`);
        if (!res.ok) throw new Error('Template não encontrado');
        const data = await res.json();
        setTemplate(data.template);
      } catch (err) {
        setError('Erro ao carregar template');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  const handleAddItem = () => {
    if (!template) return;
    setTemplate({
      ...template,
      items: [
        ...template.items,
        { label: '', category: '', is_required: false, order_index: template.items.length },
      ],
    });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    if (!template) return;
    const newItems = [...template.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setTemplate({ ...template, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    if (!template) return;
    const newItems = template.items.filter((_, i) => i !== index);
    setTemplate({ ...template, items: newItems });
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cleaning/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          is_active: template.is_active,
          items: template.items.map((item, idx) => ({
            label: item.label,
            category: item.category || null,
            is_required: item.is_required || false,
            order_index: idx,
          })),
        }),
      });

      if (!res.ok) throw new Error('Erro ao salvar');
      alert('Template salvo com sucesso!');
      router.push('/pt-BR/cleaning/templates');
    } catch (err) {
      setError('Erro ao salvar template');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Carregando...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!template) return <div className="p-4">Template não encontrado</div>;

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-4">Editar Template</h1>
      </div>

      <div className="space-y-4 bg-white p-4 rounded-lg border">
        <div>
          <label className="block text-sm font-medium mb-1">Nome do Template</label>
          <Input
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            placeholder="Ex: T1/T2 - Apartamento"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descrição</label>
          <textarea
            value={template.description}
            onChange={(e) => setTemplate({ ...template, description: e.target.value })}
            className="w-full border rounded p-2"
            rows={3}
            placeholder="Descrição do template..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={template.is_active}
            onChange={(e) => setTemplate({ ...template, is_active: e.target.checked })}
            className="mr-2"
          />
          <label className="text-sm font-medium">Ativo</label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Itens do Checklist</h2>
          <Button size="sm" onClick={handleAddItem}>
            + Adicionar Item
          </Button>
        </div>

        <div className="space-y-2">
          {template.items.map((item, idx) => (
            <div key={idx} className="flex gap-2 bg-white p-3 rounded-lg border">
              <div className="flex-1">
                <Input
                  value={item.label}
                  onChange={(e) => handleUpdateItem(idx, 'label', e.target.value)}
                  placeholder="Descrição da atividade"
                />
              </div>
              <div>
                <Input
                  value={item.category || ''}
                  onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)}
                  placeholder="Categoria"
                  className="w-32"
                />
              </div>
              <label className="flex items-center gap-1 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={item.is_required || false}
                  onChange={(e) => handleUpdateItem(idx, 'is_required', e.target.checked)}
                />
                <span className="text-sm">Obrigatório</span>
              </label>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRemoveItem(idx)}
              >
                Remover
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Template'}
        </Button>
      </div>
    </div>
  );
}
