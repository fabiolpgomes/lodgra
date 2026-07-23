"use client"

/**
 * Story 39.8 — Ícone de informação com tooltip explicativo, usado nos cards
 * do dashboard (`src/app/[locale]/dashboard/page.tsx`).
 *
 * Comportamento híbrido deliberado (não é o padrão default do Radix Tooltip,
 * que só abre no hover/foco):
 *   - Desktop: abre no hover (mouse enter) e no foco por teclado.
 *   - Touch/mobile: abre no tap (hover não existe em touch), fecha ao tocar
 *     fora ou tocar de novo no ícone.
 *   - Escape fecha em qualquer dispositivo.
 *
 * `Tooltip.Root` é usado controlado (`open`/`onOpenChange`) para poder somar
 * esses gatilhos sem reimplementar posicionamento/colisão/portal, que o
 * Radix já resolve.
 */

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { Info } from "lucide-react"

import { cn } from "@/lib/utils"

export interface InfoTooltipProps {
  /** Texto explicativo — 1-2 frases, sem jargão não explicado. */
  description: string
  /** Rótulo acessível do botão, ex. "O que é ADR/RevPAR". Default: "Mais informações". */
  label?: string
  className?: string
}

export function InfoTooltip({ description, label = "Mais informações", className }: InfoTooltipProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(
              // Área de toque de 24px mesmo com o ícone visual pequeno (14px) — 48px
              // (padrão do design.md para CTAs primários) inflaria demais o cabeçalho
              // dos cards, que já tem vários elementos lado a lado; 24px é um meio-termo
              // sem risco de sobrepor os vizinhos no flex (evita margin negativo).
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-brand-text-medium/60 outline-none transition-colors hover:text-brand-gold focus-visible:text-brand-gold",
              className
            )}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onClick={(e) => {
              // Não deixar o clique borbulhar para um <Link> ancestral (cards
              // clicáveis) nem navegar — o ícone só alterna o tooltip.
              e.preventDefault()
              e.stopPropagation()
              setOpen((v) => !v)
            }}
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            collisionPadding={12}
            className="z-50 max-w-64 rounded-lg bg-brand-text-dark px-3 py-2 text-[11px] font-medium leading-snug text-brand-white shadow-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
            onPointerDownOutside={() => setOpen(false)}
          >
            {description}
            <TooltipPrimitive.Arrow className="fill-brand-text-dark" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
