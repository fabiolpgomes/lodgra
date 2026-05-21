'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/common/ui/button';
import { Input } from '@/components/common/ui/input';
import { CleaningTask } from '@/app/[locale]/cleaning/manage/page';

interface PropertyOption {
  id: string;
  name: string;
}

interface CleanerOption {
  id: string;
  full_name: string;
}

interface TemplateOption {
  id: string;
  name: string;
}

const taskSchema = z.object({
  property_id: z.string().min(1, 'Property is required'),
  scheduled_date: z.string().refine(
    (date) => new Date(date) > new Date(),
    'Date cannot be in the past'
  ),
  scheduled_time: z.string().optional(),
  cleaner_id: z.string().optional(),
  checklist_template_id: z.string().optional(),
  notes: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: CleaningTask;
  onSuccess: (task: CleaningTask) => void;
  onCancel: () => void;
}

export default function TaskForm({
  task,
  onSuccess,
  onCancel,
}: TaskFormProps) {
  const t = useTranslations('cleaning.manage.form');
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [cleaners, setCleaners] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [templates, setTemplates] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: task
      ? {
          property_id: task.property_id,
          scheduled_date: task.scheduled_date,
          scheduled_time: task.scheduled_time || '',
          cleaner_id: task.cleaner_id || '',
          checklist_template_id: task.checklist_template_id || '',
          notes: task.notes || '',
        }
      : {
          property_id: '',
          scheduled_date: '',
          scheduled_time: '',
          cleaner_id: '',
          checklist_template_id: '',
          notes: '',
        },
  });

  // Fetch dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propsRes, cleanersRes, templatesRes] = await Promise.all([
          fetch('/api/properties'),
          fetch('/api/users?type=cleaner'),
          fetch('/api/cleaning/templates'),
        ]);

        if (propsRes.ok)
          setProperties(
            (await propsRes.json()).map((p: PropertyOption) => ({
              id: p.id,
              name: p.name,
            }))
          );
        if (cleanersRes.ok)
          setCleaners(
            (await cleanersRes.json()).map((u: CleanerOption) => ({
              id: u.id,
              name: u.full_name,
            }))
          );
        if (templatesRes.ok)
          setTemplates(
            (await templatesRes.json()).map((t: TemplateOption) => ({
              id: t.id,
              name: t.name,
            }))
          );
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: TaskFormData) => {
    setSubmitting(true);
    try {
      const method = task ? 'PATCH' : 'POST';
      const url = task ? `/api/cleaning/tasks/${task.id}` : '/api/cleaning/tasks';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Submit failed');

      const savedTask = await response.json();
      onSuccess(savedTask);
    } catch (error) {
      console.error('Submit error:', error);
      alert(t('submit_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Property */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('property')}
        </label>
        <select
          {...register('property_id')}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">{t('select_property')}</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {errors.property_id && (
          <p className="text-red-500 text-sm mt-1">
            {errors.property_id.message}
          </p>
        )}
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('date')}
        </label>
        <Input type="date" {...register('scheduled_date')} />
        {errors.scheduled_date && (
          <p className="text-red-500 text-sm mt-1">
            {errors.scheduled_date.message}
          </p>
        )}
      </div>

      {/* Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('time')}
        </label>
        <Input type="time" {...register('scheduled_time')} />
      </div>

      {/* Cleaner */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('cleaner')}
        </label>
        <select
          {...register('cleaner_id')}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">{t('select_cleaner')}</option>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Template */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('template')}
        </label>
        <select
          {...register('checklist_template_id')}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">{t('select_template')}</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('notes')}
        </label>
        <textarea
          {...register('notes')}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          rows={4}
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? t('submitting') : t('submit')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
