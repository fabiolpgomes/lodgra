'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/common/ui/button';
import { Input } from '@/components/common/ui/input';

const cleanerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().min(9, 'Invalid phone number'),
});

type CleanerFormData = z.infer<typeof cleanerSchema>;

interface Cleaner extends CleanerFormData {
  id: string;
  organization_id: string;
  role: string;
  guest_type: string;
  is_active: boolean;
}

interface CleanerFormProps {
  organizationId: string;
  onSuccess?: (cleaner: Cleaner) => void;
}

export default function CleanerForm({ organizationId, onSuccess }: CleanerFormProps) {
  const t = useTranslations('admin.cleaners.form');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CleanerFormData>({
    resolver: zodResolver(cleanerSchema),
  });

  const onSubmit = async (data: CleanerFormData) => {
    setSubmitting(true);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/cleaners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          organization_id: organizationId,
          role: 'guest',
          guest_type: 'cleaner',
        }),
      });

      if (!response.ok) throw new Error('Failed to create cleaner');

      const cleaner = await response.json();
      reset();
      setSuccessMessage(t('success_message'));
      onSuccess?.(cleaner);
    } catch (error) {
      alert(error instanceof Error ? error.message : t('error_message'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg border">
      <h2 className="text-xl font-semibold text-gray-800">{t('title')}</h2>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('full_name')}</label>
        <Input {...register('full_name')} placeholder="João Silva" />
        {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
        <Input type="email" {...register('email')} placeholder="joao@example.com" />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone_number')}</label>
        <Input type="tel" {...register('phone_number')} placeholder="+351 910 123 456" />
        {errors.phone_number && (
          <p className="text-red-500 text-sm mt-1">{errors.phone_number.message}</p>
        )}
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
