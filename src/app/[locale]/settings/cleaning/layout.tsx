import { ReactNode } from 'react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/requireRole';
import { redirect } from 'next/navigation';
import { Sparkles, FileText } from 'lucide-react';

export const metadata = {
  title: 'Cleaning Settings | Lodgra',
  description: 'Manage cleaning templates and settings',
};

export default async function CleaningSettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const auth = await requireRole(['admin', 'gestor']);
  if (!auth.authorized) redirect('/login');

  const { locale } = await params;

  const navigationItems = [
    {
      label: 'Tarefas',
      href: `/${locale}/settings/cleaning`,
      icon: Broom,
      description: 'Dashboard de tarefas de limpeza',
    },
    {
      label: 'Templates',
      href: `/${locale}/settings/cleaning/templates`,
      icon: FileText,
      description: 'Crie e gerencie templates de checklists',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Broom className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Limpeza</h1>
              <p className="text-gray-600 mt-1">Gerencie tarefas de limpeza e templates</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-0">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-6 py-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors flex items-start gap-3"
                >
                  <Icon className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.label}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">{children}</div>
      </div>
    </div>
  );
}
