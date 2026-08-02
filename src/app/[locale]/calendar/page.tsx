'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Calendar index page
 * Redirects to dashboard since calendar requires a propertyId
 */
export default function CalendarIndexPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'pt'

  useEffect(() => {
    // Redirect to dashboard - user must select a property first
    router.push(`/${locale}`)
  }, [locale, router])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#fbfaf6',
      fontSize: '16px',
      color: '#4d5566',
    }}>
      Redirecionando para o dashboard...
    </div>
  )
}
