'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/common/ui/button';
import { Input } from '@/components/common/ui/input';
import { Plus, Trash2 } from 'lucide-react';

export interface ChecklistItem {
  label: string;
  category: string;
  is_required: boolean;
}

export interface ChecklistTemplate {
  id?: string;
  name: string;
  items: ChecklistItem[];
}

interface Props {
  onSave: (template: ChecklistTemplate) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES = ['Quarto', 'Banheiro', 'Cozinha', 'Sala', 'Geral'];

export default function ChecklistBuilder({ onSave, onCancel }: Props) {
  const t = useTranslations('cleaning.checklists.builder');
  const [name, setName] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    if (label.trim()) {
      setItems([...items, { label, category, is_required: false }]);
      setLabel('');
    }
  };

  const removeItem = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!name.trim() || items.length === 0) {
      alert(t('name_required'));
      return;
    }
    setSaving(true);
    try {
      await onSave({ name, items });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('template_name')}
      />

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 p-2 bg-gray-50 rounded">
            <span className="flex-1">{item.label}</span>
            <span className="text-sm text-gray-500">{item.category}</span>
            <button onClick={() => removeItem(i)} className="text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t('item_label')}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border rounded px-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button onClick={addItem} size="sm">
          <Plus size={16} />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {t('save_template')}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}
