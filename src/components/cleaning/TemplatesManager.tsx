'use client';

import { useState } from 'react';
import TemplateModal from './TemplateModal';

interface Template {
  id: string;
  name: string;
  description?: string;
  property_id?: string;
  is_global?: boolean;
  is_default?: boolean;
  created_at?: string;
}

interface Property {
  id: string;
  name: string;
}

interface TemplatesManagerProps {
  initialTemplates: Template[];
  properties: Property[];
}

export default function TemplatesManager({
  initialTemplates,
  properties,
}: TemplatesManagerProps) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editPropertyId, setEditPropertyId] = useState<string | null>(null);

  const refreshTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cleaning/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');

      const { templates: data } = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Tem a certeza que deseja deletar este template?')) return;

    try {
      const response = await fetch(`/api/cleaning/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete template');
      }

      setTemplates(templates.filter((t) => t.id !== templateId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar template');
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      const response = await fetch(`/api/cleaning/templates/${templateId}/set-default`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to set default');

      await refreshTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao definir como padrão');
    }
  };

  const handleDuplicate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    try {
      const response = await fetch(`/api/cleaning/templates/${templateId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Cópia)`,
          property_id: template.property_id,
        }),
      });

      if (!response.ok) throw new Error('Failed to duplicate template');

      await refreshTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao duplicar template');
    }
  };

  const groupedTemplates = {
    global: templates.filter((t) => t.is_global),
    properties: properties.map((prop) => ({
      property: prop,
      templates: templates.filter((t) => t.property_id === prop.id),
    })),
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-900 underline">
            Fechar
          </button>
        </div>
      )}

      {/* Create Button */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setSelectedTemplate(null);
            setEditPropertyId(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
        >
          + Novo Template
        </button>
      </div>

      {/* Global Templates */}
      {groupedTemplates.global.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b font-semibold text-gray-900">
            Templates Globais
          </div>

          <div className="divide-y">
            {groupedTemplates.global.map((template) => (
              <div key={template.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  )}
                  {template.is_default && (
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      ✓ Padrão
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {!template.is_default && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Definir como Padrão
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicate(template.id)}
                    className="px-3 py-2 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg"
                  >
                    Duplicar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setEditPropertyId(null);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="px-3 py-2 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property Templates */}
      {groupedTemplates.properties.map(({ property, templates: propertyTemplates }) => (
        <div key={property.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b font-semibold text-gray-900">
            {property.name}
          </div>

          {propertyTemplates.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              Nenhum template específico para esta propriedade
            </div>
          ) : (
            <div className="divide-y">
              {propertyTemplates.map((template) => (
                <div key={template.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    )}
                    {template.is_default && (
                      <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        ✓ Padrão
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!template.is_default && (
                      <button
                        onClick={() => handleSetDefault(template.id)}
                        className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        Definir como Padrão
                      </button>
                    )}
                    <button
                      onClick={() => handleDuplicate(template.id)}
                      className="px-3 py-2 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg"
                    >
                      Duplicar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        setEditPropertyId(property.id);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="px-3 py-2 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Modal */}
      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTemplate(null);
        }}
        templateId={selectedTemplate || undefined}
        propertyId={editPropertyId || undefined}
        onSaved={refreshTemplates}
        properties={properties}
      />

      {templates.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-900">
            Nenhum template criado ainda. Clique em &quot;Novo Template&quot; para começar!
          </p>
        </div>
      )}
    </div>
  );
}
