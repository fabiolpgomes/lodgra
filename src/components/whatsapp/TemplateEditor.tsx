'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/common/ui/button';
import { Input } from '@/components/common/ui/input';
import { AlertCircle, Eye } from 'lucide-react';
import { validateRequiredVariables, extractVariables } from '@/lib/whatsapp/default-templates';

interface TemplateEditorProps {
  templateKey: string;
  language: string;
  initialBody: string;
  onSave: (body: string) => Promise<void>;
  onRestore?: () => Promise<void>;
}

const VARIABLE_EXAMPLES: Record<string, string> = {
  'property_name': 'Refúgio Perfeito',
  'property_address': 'Rua da Praia 123, Lagoa 8135-068',
  'guest_name': 'Maria Silva',
  'checkin_date': '15 de Junho de 2026',
  'checkout_date': '18 de Junho de 2026',
  'checkin_code': 'Caixa cinza, código 4521',
  'cleaner_name': 'João Santos',
  'task_date': '15 de Junho de 2026',
  'task_time': '10:00',
  'manager_phone': '+351 91 123 4567',
  'checkin_instructions': 'Deixe a chave embaixo da porta',
};

export default function TemplateEditor({
  templateKey,
  language,
  initialBody,
  onSave,
  onRestore,
}: TemplateEditorProps) {
  const t = useTranslations('whatsapp.templates');
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const validation = useMemo(() => validateRequiredVariables(body), [body]);
  const variables = useMemo(() => extractVariables(body), [body]);

  const preview = useMemo(() => {
    let result = body;
    for (const variable of variables) {
      const key = variable.replace(/[\{\}]/g, '').toLowerCase();
      const example = VARIABLE_EXAMPLES[key] || `[${key}]`;
      result = result.replace(new RegExp(`\\${variable}`, 'gi'), example);
    }
    return result;
  }, [body, variables]);

  const handleSave = async () => {
    if (!validation.valid) {
      alert(t('required_variables_missing'));
      return;
    }

    setSaving(true);
    try {
      await onSave(body);
      alert(t('template_saved'));
    } catch (error) {
      alert(t('save_error'));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!onRestore) return;
    if (!confirm(t('restore_confirm'))) return;

    setRestoring(true);
    try {
      await onRestore();
      alert(t('template_restored'));
    } catch (error) {
      alert(t('restore_error'));
      console.error(error);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Validation warning */}
      {!validation.valid && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-800">
          <AlertCircle size={20} className="flex-shrink-0" />
          <div>
            <p className="font-medium">{t('validation_error')}</p>
            <p className="text-sm">{validation.missing.join(', ')}</p>
          </div>
        </div>
      )}

      {/* Editor */}
      <div>
        <label className="block text-sm font-medium mb-2">{t('message_body')}</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full h-64 p-3 border rounded font-mono text-sm"
          placeholder={t('enter_message')}
        />
      </div>

      {/* Variables reference */}
      <div className="bg-blue-50 p-3 rounded text-sm">
        <p className="font-medium mb-2">{t('available_variables')}:</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(VARIABLE_EXAMPLES).map((key) => (
            <code key={key} className="text-xs bg-blue-100 px-2 py-1 rounded">
              {`{{${key}}}`}
            </code>
          ))}
        </div>
      </div>

      {/* Preview toggle */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
      >
        <Eye size={16} />
        {showPreview ? t('hide_preview') : t('show_preview')}
      </button>

      {/* Preview */}
      {showPreview && (
        <div className="bg-gray-100 p-4 rounded whitespace-pre-wrap text-sm">
          {preview}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || !validation.valid}
          className="flex-1"
        >
          {saving ? t('saving') : t('save_template')}
        </Button>
        {onRestore && (
          <Button
            onClick={handleRestore}
            disabled={restoring}
            variant="outline"
          >
            {restoring ? t('restoring') : t('restore_default')}
          </Button>
        )}
      </div>
    </div>
  );
}
