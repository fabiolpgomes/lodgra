'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface HelpButtonProps {
  title: string
  steps: Array<{
    number: number
    title: string
    description: string
  }>
}

export default function HelpButton({ title, steps }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition"
        title="Ajuda"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white">
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {steps.map(step => (
                <div key={step.number} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-semibold">
                      {step.number}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                    <p className="mt-2 text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex justify-end p-6 border-t bg-gray-50">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
