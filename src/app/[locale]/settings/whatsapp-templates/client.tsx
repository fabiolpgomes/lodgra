'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import TemplateEditor from '@/components/whatsapp/TemplateEditor';
import { getDefaultTemplate, DEFAULT_TEMPLATES_PT_BR, DEFAULT_TEMPLATES_ES } from '@/lib/whatsapp/default-templates';

interface Template {
  id: string;
  template_key: string;
  language: string;
  body: string;
  is_custom: boolean;
}

interface WhatsAppTemplatesClientProps {
  organizationId: string;
  initialTemplates: Template[];
}

export default function WhatsAppTemplatesClient({
  organizationId,
  initialTemplates,
}: WhatsAppTemplatesClientProps) {
  const t = useTranslations('whatsapp.settings');
  const [templates, setTemplates] = useState<Record<string, Template | null>>(
    initialTemplates.reduce(
      (acc, template) => {
        acc[`${template.template_key}-${template.language}`] = template;
        return acc;
      },
      {} as Record<string, Template | null>
    )
  );

  const handleSaveTemplate = async (
    templateKey: string,
    language: string,
    body: string
  ) => {
    const response = await fetch('/api/whatsapp-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_key: templateKey, language, body }),
    });

    if (!response.ok) throw new Error('Failed to save template');

    const data = await response.json();
    setTemplates((prev) => ({
      ...prev,
      [`${templateKey}-${language}`]: data.template,
    }));
  };

  const handleRestoreTemplate = async (
    templateKey: string,
    language: string
  ) => {
    const response = await fetch('/api/whatsapp-templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_key: templateKey, language }),
    });

    if (!response.ok) throw new Error('Failed to restore template');

    setTemplates((prev) => ({
      ...prev,
      [`${templateKey}-${language}`]: null,
    }));
  };

  const getTemplateBody = (key: string, language: string): string => {
    const stored = templates[`${key}-${language}`];
    if (stored) return stored.body;
    const defaultBody = getDefaultTemplate(key, language);
    return defaultBody || '';
  };

  const TEMPLATE_KEYS = Object.keys(DEFAULT_TEMPLATES_PT_BR);

  const [language, setLanguage] = useState('pt-BR');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('description')}</p>
      </div>

      <div className="flex gap-2 border-b">
        {['pt-BR', 'es'].map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-4 py-2 font-medium ${
              language === lang
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            {lang === 'pt-BR' ? 'Português (Brasil)' : 'Español'}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {TEMPLATE_KEYS.map((key) => (
          <div key={key} className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{key}</h3>
            <TemplateEditor
              templateKey={key}
              language={language}
              initialBody={getTemplateBody(key, language)}
              onSave={(body) => handleSaveTemplate(key, language, body)}
              onRestore={() => handleRestoreTemplate(key, language)}
            />
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
        <p className="font-medium">{t('meta_approval_notice')}</p>
        <p className="text-gray-700 mt-2">{t('meta_approval_text')}</p>
      </div>
    </div>
  );
}
