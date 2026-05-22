'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/common/ui/button';
import { Input } from '@/components/common/ui/input';

interface TaskFiltersProps {
  onFilterChange: (filters: Record<string, string | undefined>) => void;
}

export default function TaskFilters({ onFilterChange }: TaskFiltersProps) {
  const t = useTranslations('cleaning.manage.filters');

  const handleFilterChange = (field: string, value: string) => {
    onFilterChange({ [field]: value || undefined });
  };

  const handleReset = () => {
    onFilterChange({
      property_id: undefined,
      status: undefined,
      cleaner_id: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="grid gap-4 md:grid-cols-5">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('status')}
          </label>
          <select
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{t('all')}</option>
            <option value="pending">{t('pending')}</option>
            <option value="in_progress">{t('in_progress')}</option>
            <option value="done">{t('done')}</option>
            <option value="issue">{t('issue')}</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('date_from')}
          </label>
          <Input
            type="date"
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('date_to')}
          </label>
          <Input
            type="date"
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={handleReset}
            size="lg"
            className="w-full"
          >
            {t('reset')}
          </Button>
        </div>
      </div>
    </div>
  );
}
