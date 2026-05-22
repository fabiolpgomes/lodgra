'use client'

import { createContext, useContext, ReactNode } from 'react'

export interface BrandingData {
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
}

interface BrandingContextType {
  branding: BrandingData
  isLoaded: boolean
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

export function BrandingProvider({
  children,
  branding,
}: {
  children: ReactNode
  branding: BrandingData
}) {
  return (
    <BrandingContext.Provider value={{ branding, isLoaded: true }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = useContext(BrandingContext)
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider')
  }
  return context.branding
}
