'use client'

import { CalendarWithSettings } from '@/components/calendar/CalendarWithSettings'
import { SimpleCalendarAdapter } from '@/components/calendar/SimpleCalendarAdapter'

/**
 * DEMO PAGE - Epic 43 Calendar Preview
 * No login required - Direct testing
 *
 * URL: /demo/calendar
 * Purpose: Quick preview of Epic 43 features
 * Data: Mock/demo data only
 */
export default function DemoCalendarPage() {
  // Mock property ID for demo
  const demoPropertyId = 'demo-epic43-preview'

  return (
    <div className="w-full h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold">Epic 43 - Calendar Preview 🚀</h1>
        <p className="text-blue-100 text-sm mt-1">
          Clique em um dia para definir preço, bloquear datas ou ajustar configurações
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 text-sm text-gray-700">
        <strong>Como testar:</strong> Clique em qualquer dia do calendário → Defina preço → Clique "Salvar" → Veja 5 cards de settings no sidebar
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-auto">
        <CalendarWithSettings
          propertyId={demoPropertyId}
          calendarComponent={SimpleCalendarAdapter}
        />
      </div>

      {/* Footer */}
      <div className="bg-gray-100 border-t border-gray-200 px-4 py-3 text-xs text-gray-600">
        <p>
          💡 Esta é uma preview de demonstração. Nenhum dado será salvo.{' '}
          <a
            href="https://github.com/fabiolpgomes/lodgra/pull/17"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Ver PR →
          </a>
        </p>
      </div>
    </div>
  )
}
