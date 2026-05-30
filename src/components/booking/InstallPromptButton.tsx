'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface Props {
  orgName: string | null
}

type Platform = 'android' | 'ios' | 'other'

const DISMISS_KEY = 'pwa_install_dismissed'

export function InstallPromptButton({ orgName }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [platform, setPlatform] = useState<Platform>('other')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const detected: Platform = /iPad|iPhone|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'other'

    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true

    if (standalone || sessionStorage.getItem(DISMISS_KEY)) return

    // Defer setState calls to next tick — avoids synchronous setState-in-effect lint warning
    const t = setTimeout(() => {
      setPlatform(detected)
      setVisible(true)
    }, 0)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      clearTimeout(t)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
    handleDismiss()
  }

  if (!visible) return null

  const platform = platformRef.current
  const appName = orgName || 'esta página'

  // Android: native install prompt
  if (platform === 'android' && deferredPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3 sm:hidden">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-900 leading-tight">Adicionar ao ecrã inicial</p>
          <p className="text-[11px] text-gray-600 mt-0.5">Acede a {appName} como uma app</p>
        </div>
        <button
          onClick={handleInstallAndroid}
          className="flex items-center gap-1.5 bg-brand-800 text-white text-[12px] font-bold uppercase tracking-wide px-4 min-h-[44px] rounded whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5" />
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="p-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // iOS: button that opens instructions modal
  if (platform === 'ios' && !showIOSHint) {
    return (
      <button
        onClick={() => setShowIOSHint(true)}
        className="flex items-center gap-1.5 text-[11px] font-bold text-brand-800 uppercase tracking-wide px-3 min-h-[44px] border border-brand-200 rounded hover:bg-brand-50 transition-colors whitespace-nowrap"
        title="Adicionar ao ecrã inicial"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    )
  }

  // iOS: step-by-step modal
  if (platform === 'ios' && showIOSHint) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
        onClick={() => setShowIOSHint(false)}
      >
        <div
          className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-[16px] font-bold text-gray-900">Adicionar ao Ecrã Inicial</h3>
            <button
              onClick={() => setShowIOSHint(false)}
              className="p-1 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-[14px] text-gray-600 mb-5">
            Guarda <strong>{appName}</strong> no teu iPhone para aceder rapidamente, sem abrir o browser.
          </p>
          <ol className="space-y-4 text-[14px] text-gray-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-800 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">1</span>
              <span>Toca no ícone <Share className="h-4 w-4 inline text-brand-800 mx-0.5" /> <strong>Partilhar</strong> na barra do Safari</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-800 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">2</span>
              <span>Selecciona <strong>Adicionar ao ecrã de início</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-800 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">3</span>
              <span>Toca em <strong>Adicionar</strong> no canto superior direito</span>
            </li>
          </ol>
          <button
            onClick={() => setShowIOSHint(false)}
            className="mt-6 w-full bg-brand-800 text-white font-bold text-[14px] min-h-[48px] rounded-lg"
          >
            Percebido
          </button>
        </div>
      </div>
    )
  }

  return null
}
