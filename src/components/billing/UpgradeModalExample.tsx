'use client'

import { useState } from 'react'
import { UpgradeModal } from './UpgradeModal'
import { useUpgradeModal } from '@/hooks/useUpgradeModal'

/**
 * Example usage of UpgradeModal with useUpgradeModal hook
 * Shows how to integrate into your application
 */
export function UpgradeModalExample() {
  const [currentPlan, setCurrentPlan] = useState<
    'essencial' | 'expansao' | 'premium'
  >('essencial')

  const modal = useUpgradeModal({ currentPlan })

  return (
    <div className="space-y-4 p-6">
      {/* Plan Selector (for testing) */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Current Plan (for testing):
        </label>
        <select
          value={currentPlan}
          onChange={(e) =>
            setCurrentPlan(
              e.target.value as 'essencial' | 'expansao' | 'premium'
            )
          }
          className="mt-2 block w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="essencial">Essencial</option>
          <option value="expansao">Expansão</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Test Buttons */}
      <div className="space-y-2">
        <button
          onClick={() => modal.openForFeature('cleaner_portal')}
          className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Test Feature Block: Cleaner Portal
        </button>
        <button
          onClick={() => modal.openForFeature('api_access')}
          className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Test Feature Block: API Access
        </button>
        <button
          onClick={() => modal.openForPropertyLimit()}
          className="w-full rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
        >
          Test Property Limit
        </button>
      </div>

      {/* Modal */}
      <UpgradeModal
        isOpen={modal.isOpen}
        feature={modal.blockedFeature || undefined}
        reason={modal.reason}
        currentPlan={currentPlan}
        onClose={modal.close}
        onAddExtra={() => {
          console.log('Add extra property clicked')
          modal.handleAddExtra()
        }}
        onUpgrade={(plan) => {
          console.log('Upgrade to', plan)
          modal.handleUpgrade(plan)
        }}
      />

      {/* Status Display */}
      <div className="rounded border border-gray-300 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-700">Modal State:</p>
        <pre className="mt-2 text-xs text-gray-600">
          {JSON.stringify(
            {
              isOpen: modal.isOpen,
              blockedFeature: modal.blockedFeature,
              reason: modal.reason,
              currentPlan: modal.currentPlan,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  )
}
