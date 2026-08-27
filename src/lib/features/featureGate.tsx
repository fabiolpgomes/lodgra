'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FeatureName } from './hasFeature'

interface FeatureGateProps {
  feature: FeatureName
  orgId: string
  fallback?: React.ReactNode
  onBlocked?: (feature: FeatureName, plan: string) => void
  children: React.ReactNode
}

/**
 * Client-side component to gate access to features
 * Shows children if org has access, otherwise shows fallback
 * @param feature Feature to gate
 * @param orgId Organization ID
 * @param fallback What to show if feature is not accessible
 * @param onBlocked Callback when feature is blocked
 * @param children Content to show if feature is accessible
 */
export function FeatureGate({
  feature,
  orgId,
  fallback = null,
  onBlocked,
  children,
}: FeatureGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkFeatureAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature, orgId])

  async function checkFeatureAccess() {
    try {
      const response = await fetch(
        `/api/features/check?feature=${feature}&org_id=${orgId}`
      )
      const data = await response.json()

      if (response.ok) {
        setHasAccess(data.hasAccess)

        if (!data.hasAccess && data.plan) {
          onBlocked?.(feature, data.plan)

          // Redireciona para a página de upgrade com contexto da funcionalidade
          // (Opcional: só redireciona se ainda não estiver na página de upgrade)
          const currentPath = window.location.pathname
          if (!currentPath.includes('/upgrade')) {
            router.push(`/upgrade?feature=${feature}&plan=${data.plan}`)
          }
        }
      } else {
        console.error('Falha na verificação da funcionalidade:', data.error)
        setHasAccess(false)
      }
    } catch (error) {
      console.error('Erro ao verificar acesso à funcionalidade:', error)
      setHasAccess(false)
    }
  }

  // Show loading state while checking
  if (hasAccess === null) {
    return <div className="animate-pulse">A carregar...</div>
  }

  // Show children if access granted, fallback otherwise
  if (!hasAccess) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        {fallback || (
          <div className="text-sm text-yellow-800">
            <p className="font-semibold">Funcionalidade indisponível</p>
            <p className="text-xs">
              Faça upgrade do seu plano para aceder a {feature.replace(/_/g, ' ')}.
            </p>
          </div>
        )}
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Hook to check feature access programmatically
 * @param feature Feature to check
 * @param orgId Organization ID
 * @returns { hasAccess, loading, plan, error }
 */
export function useFeatureAccess(feature: FeatureName, orgId?: string | null) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<string>('essencial')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) {
      setHasAccess(false)
      setLoading(false)
      setPlan('essencial')
      setError(null)
      return
    }

    const checkAccess = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/features/check?feature=${feature}&org_id=${orgId}`
        )
        const data = await response.json()

        if (response.ok) {
          setHasAccess(data.hasAccess)
          setPlan(data.plan)
        } else {
          setError(data.error)
          setHasAccess(false)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
        setError(errorMessage)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [feature, orgId])

  return { hasAccess, loading, plan, error }
}
