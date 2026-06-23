'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/ui/button';
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  items: string[];
  is_default: boolean;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', items: '' });
  const [submitting, setSubmitting] = useState(false);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cleaning/templates');
        if (response.ok) {
          const data = await response.json();
          setTemplates(Array.isArray(data) ? data : data.templates || []);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      const items = formData.items
        .split('\n')
        .map(item => item.trim())
        .filter(item => item);

      const response = await fetch('/api/cleaning/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          items: items,
        }),
      });

      if (response.ok) {
        const newTemplate = await response.json();
        setTemplates([...templates, newTemplate]);
        setFormData({ name: '', items: '' });
        setShowForm(false);
      } else {
        alert('Erro ao criar template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Erro ao criar template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const response = await fetch(`/api/cleaning/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== id));
      } else {
        alert('Erro ao excluir template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Erro ao excluir template');
    }
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </button>

        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Modelos de Checklist</h1>
            <p className="mt-2 text-sm text-gray-600 md:text-base">
              Crie e gerencie os modelos de checklist para suas tarefas de limpeza
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            size="lg"
            className="w-full gap-2 md:w-auto"
          >
            <Plus className="h-5 w-5" />
            Novo Modelo
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-4 text-xl font-semibold">Criar Novo Modelo</h2>
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Modelo
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Limpeza Padrão, Saída de Hóspede"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Items */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Itens do Checklist (um por linha)
              </label>
              <textarea
                value={formData.items}
                onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                placeholder="Varrer e aspirar&#10;Lavar pisos&#10;Limpeza de banheiro&#10;Verificação final"
                rows={6}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Digite cada item em uma linha separada
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar Modelo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', items: '' });
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-500 text-center py-8">Carregando modelos...</p>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">Nenhum modelo de checklist criado ainda</p>
            <Button onClick={() => setShowForm(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Criar Primeiro Modelo
            </Button>
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    {template.is_default && (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {template.items?.length || 0} itens
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      router.push(`/pt-BR/cleaning/templates/${template.id}/edit`)
                    }
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Items Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="space-y-2">
                  {template.items?.slice(0, 5).map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                      {item}
                    </li>
                  ))}
                  {template.items && template.items.length > 5 && (
                    <li className="text-sm text-gray-500 italic">
                      +{template.items.length - 5} mais itens
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
