'use client'

import { useState } from 'react'
import { Globe, Check, Copy } from 'lucide-react'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { Switch } from '@/components/common/ui/switch'

interface PublicUrlBadgeProps {
  propertyId: string
  slug: string | null
  isPublic: boolean
  canEdit: boolean
  onToggle?: (isPublic: boolean) => void
}

export function PublicUrlBadge({ propertyId, slug, isPublic, canEdit, onToggle }: PublicUrlBadgeProps) {
  const [toggling, setToggling] = useState(false)
  const [optimisticPublic, setOptimisticPublic] = useState(isPublic)
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.lodgra.pt'
  const publicUrl = slug ? `${baseUrl}/p/${slug}` : null

  async function handleToggle() {
    if (!canEdit || toggling) return

    const newValue = !optimisticPublic
    setOptimisticPublic(newValue)
    setToggling(true)

    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: newValue }),
      })

      if (!res.ok) {
        setOptimisticPublic(!newValue) // rollback
      } else {
        onToggle?.(newValue)
      }
    } catch {
      setOptimisticPublic(!newValue) // rollback
    } finally {
      setToggling(false)
    }
  }

  async function handleShare() {
    if (!publicUrl) return

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Lodgra', url: publicUrl })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    await handleCopy()
  }

  async function handleCopy() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <div className="flex items-center gap-2.5 py-2 px-3 bg-gradient-to-r from-lodgra-brand-50 to-white rounded-lg border border-lodgra-brand-100" onClick={e => e.preventDefault()}>
      {optimisticPublic ? (
        <Badge className="bg-lodgra-brand-100 text-lodgra-brand-700 hover:bg-lodgra-brand-200 gap-1 shadow-sm">
          <Globe className="h-3.5 w-3.5" />
          Pública
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1 text-lodgra-neutral-500 border-lodgra-border-subtle">
          <Globe className="h-3.5 w-3.5 text-lodgra-neutral-400" />
          Privada
        </Badge>
      )}

      {canEdit && (
        <Switch
          checked={optimisticPublic}
          onCheckedChange={handleToggle}
          disabled={toggling || !slug}
          className="scale-90"
        />
      )}

      {optimisticPublic && publicUrl && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1.5 text-lodgra-brand-600 hover:bg-lodgra-brand-100 hover:text-lodgra-brand-700 transition-colors ml-auto"
          onClick={handleShare}
        >
          {copied ? (
            <><Check className="h-3.5 w-3.5 text-lodgra-brand-600" /> Copiado</>
          ) : (
            <><Copy className="h-3.5 w-3.5" /> URL</>
          )}
        </Button>
      )}
    </div>
  )
}
