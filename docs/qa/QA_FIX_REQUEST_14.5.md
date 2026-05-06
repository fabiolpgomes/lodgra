# QA Fix Request — Story 14.5 Landing Page Redesign

**Gate:** CONCERNS (82/100)
**Reviewer:** Quinn
**Data:** 2026-05-06

---

## Contexto

A paleta Lodgra é **Azul (#1E3A8A) + Ouro (#D4AF37)** — sem coral. O Dev Notes da story mencionava "coral" porque foi escrito quando o produto era "Home Stay". A implementação usa correctamente `lodgra-cta-bg` (gold). Isso **não é um bug**.

Os problemas reais são tokens CSS referenciados no componente mas não declarados no `@theme inline` de `globals.css`.

---

## Fix 1 — `text-lodgra-primary` indefinido (MEDIUM)

**Ficheiro:** `src/components/landing/LandingPage.tsx`

`text-lodgra-primary` é usado em múltiplos locais mas não existe no design system:
- Linha 692: ícones de feature cards
- Linha 744: ícones de segment cards  
- Linha 782: coluna Home Stay na tabela comparativa
- Linha 828, 838, 841: ícones da secção PWA
- Linha 940: CTA de pricing não-highlighted (`text-lodgra-primary`)
- Linha 982: botão branco do CTA final (`text-lodgra-primary`)

**Opção A** (preferida — consistência com design system):
```css
/* Em globals.css, no @theme inline (após linha 79) */
--color-lodgra-primary: var(--lodgra-brand-600);
```

**Opção B** (substituição directa):
Substituir todas as ocorrências de `text-lodgra-primary` por `text-lodgra-brand-600`.

---

## Fix 2 — `lodgra-accent-50` e `lodgra-accent-200` indefinidos (MEDIUM)

**Ficheiro:** `src/components/landing/LandingPage.tsx` linhas 650, 657

Pain section usa `bg-lodgra-accent-50` (background) e `border-lodgra-accent-200` (card borders) — tokens não existentes.

```css
/* Em globals.css, no @theme inline */
--color-lodgra-accent-50: oklch(0.97 0.04 62);    /* Very light gold */
--color-lodgra-accent-200: oklch(0.92 0.08 62);   /* Light gold border */
```

---

## Fix 3 — `lodgra-neutral-400`, `lodgra-neutral-800`, `lodgra-neutral-950` indefinidos (LOW)

**Ficheiro:** `src/components/landing/LandingPage.tsx` linhas 997-1008, 992

Footer usa estas variantes que não estão no `@theme inline`. Opções:

**Opção A** — Adicionar ao globals.css:
```css
--color-lodgra-neutral-400: oklch(0.700 0.006 75);  /* Between 300 and 500 */
--color-lodgra-neutral-800: oklch(0.260 0.005 75);  /* Between 700 and 900 */
--color-lodgra-neutral-950: oklch(0.080 0.003 75);  /* Near black */
```

**Opção B** — Substituir no componente:
- `lodgra-neutral-400` → `lodgra-neutral-500`
- `lodgra-neutral-800` → `lodgra-neutral-900`  
- `lodgra-neutral-950` → `lodgra-neutral-900`

---

## Fix 4 — Copyright "Home Stay" no footer (LOW)

**Ficheiro:** `src/components/landing/LandingPage.tsx` linha 1010

```tsx
// ANTES:
© {new Date().getFullYear()} Home Stay. {c.footerRights}

// DEPOIS:
© {new Date().getFullYear()} Lodgra. {c.footerRights}
```

---

## Verificação após fixes

1. Build PASS (`npm run build`)
2. Lint PASS (`npm run lint`)
3. Confirmar visualmente que:
   - Ícones de features/segments têm cor azul (brand-600)
   - Pain section tem fundo dourado claro (accent-50)
   - Footer renderiza correctamente (gradient neutral-900 → 950)
   - Copyright diz "Lodgra"

Após fixes: reportar a Quinn para re-review e gate PASS.
