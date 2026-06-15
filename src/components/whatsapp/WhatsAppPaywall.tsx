'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface WhatsAppPaywallProps {
  currentPlan?: string;
  locale?: string;
}

export default function WhatsAppPaywall({ currentPlan = 'essential', locale = 'pt-BR' }: WhatsAppPaywallProps) {
  const router = useRouter();
  const t = useTranslations('whatsapp.paywall');

  const handleUpgrade = () => {
    router.push(`/${locale}/settings/billing?tab=upgrade`);
  };

  const handleAddOn = () => {
    router.push(`/${locale}/settings/billing?tab=addons&addon=whatsapp_automation`);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('title')}
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          {t('description')}
        </p>
      </div>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Essential */}
        <div className={`p-4 rounded-lg border ${
          currentPlan === 'essential'
            ? 'border-blue-600 bg-blue-50'
            : 'border-gray-200 bg-white'
        }`}>
          <h3 className="font-semibold text-gray-900 mb-3">Essential</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center text-gray-600">
              <span className="mr-2">❌</span> WhatsApp Automation
            </li>
            <li className="flex items-center text-gray-600">
              <span className="mr-2">✅</span> Basic Features
            </li>
            <li className="flex items-center text-gray-600">
              <span className="mr-2">✅</span> 1 Property
            </li>
          </ul>
        </div>

        {/* Expansão */}
        <div className="p-4 rounded-lg border border-green-200 bg-green-50">
          <h3 className="font-semibold text-gray-900 mb-3">Expansão</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center text-gray-700">
              <span className="mr-2">✅</span>
              <span className="font-semibold text-green-600">WhatsApp Automation</span>
            </li>
            <li className="flex items-center text-gray-600">
              <span className="mr-2">✅</span> Advanced Features
            </li>
            <li className="flex items-center text-gray-600">
              <span className="mr-2">✅</span> 5 Properties
            </li>
          </ul>
        </div>

        {/* Premium */}
        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
          <h3 className="font-semibold text-gray-900 mb-3">Premium</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center text-gray-700">
              <span className="mr-2">✅</span>
              <span className="font-semibold text-purple-600">WhatsApp Automation</span>
            </li>
            <li className="flex items-center text-gray-600">
              <span className="mr-2">✅</span> Premium Support
            </li>
            <li className="flex items-center text-gray-600">
              <span className="mr-2">✅</span> Unlimited Properties
            </li>
          </ul>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {currentPlan === 'essential' && (
          <>
            <button
              onClick={handleUpgrade}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              {t('upgrade_button')}
            </button>
            <button
              onClick={handleAddOn}
              className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
            >
              {t('addon_button')}
            </button>
          </>
        )}

        {currentPlan !== 'essential' && (
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
          >
            {t('back_button')}
          </button>
        )}
      </div>

      {/* Help Text */}
      <p className="text-center text-sm text-gray-600 mt-8">
        {t('help_text')}
      </p>
    </div>
  );
}
