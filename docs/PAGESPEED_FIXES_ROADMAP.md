# PageSpeed Fixes — Roadmap Detalhado (2026-05-23)

**Status:** 7 problemas específicos identificados + soluções prontas

---

## 🚨 PROBLEMAS CRÍTICOS ENCONTRADOS

### ACESSIBILIDADE (Desktop 88)

#### ❌ P0 — Meta Viewport Desativa Zoom (Severidade: ALTA)

**Problema:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
                                                                   ^^^^^^^^^^^^^^
```

**Impacto:** Utilizadores com baixa visão **NÃO conseguem fazer zoom** para ler o site.

**Fix (1 linha):**
```html
<!-- ANTES (ERRADO) -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

<!-- DEPOIS (CORRETO) -->
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Remove maximum-scale=1, permite zoom até ao limite do browser -->
```

**Localização:** `src/app/layout.tsx` (layout raiz)

**Ganho:** +3-5 pontos acessibilidade

---

#### ❌ P1 — Títulos Não em Ordem Sequencial (Severidade: MÉDIA)

**Problema:** 
```
Encontrado: <h3> sem <h2> anterior
Afeta: Navegação com screen readers e tecnologias adaptativas
```

**Localização:** Provavelmente em `BrazilLanding.tsx` na seção de métricas:
```
<h3 class="text-[14px] font-black text-[#ffffff]">
  MÉTRICA DE PERFORMANCE
</h3>
```

**Estrutura Esperada:**
```html
<section>
  <h2>Métricas de Performance</h2>  {/* Estava como h3! */}
  <h3>Métrica 1</h3>
  <h3>Métrica 2</h3>
</section>
```

**Fix:** Alterar `<h3>` para `<h2>` na seção de títulos principais

**Ganho:** +2-3 pontos acessibilidade

---

### PERFORMANCE (Mobile 75)

#### 🔴 P0 — CSS Bloqueando Renderização (600 ms) — **CRÍTICO**

**Problema:**
```
3 arquivos CSS em critical rendering path:
  - a701a97d828216d5.css (22.5 KiB) — 750 ms
  - 71a5e0cda7e290c8.css (22.5 KiB) — 150 ms
  - 2b9a96ef852fcde0.css (2.1 KiB) — Rápido

Total: ~900 ms bloqueando renderização
```

**Causa Raiz:** Tailwind CSS bundle não está sendo code-split ou lazy-loaded.

**Solução Opção A — Mover CSS para `<link defer>`:**
```html
<!-- layout.tsx -->

{/* Critical CSS inline (above fold) */}
<style>{`
  /* Hero styles only */
  .text-white { color: white; }
  .text-\[40px\] { font-size: 40px; }
  /* ~ 5 KB apenas */
`}</style>

{/* Defer non-critical CSS */}
<link rel="stylesheet" href="/css/hero.css" />
<link rel="stylesheet" href="/css/landing.css" defer />
```

**Solução Opção B — Usar Next.js Font Optimization:**
Tailwind já está otimizado, problema pode ser imports desnecessários.

**Ação:** 
```bash
# Verificar src/app/layout.tsx
# Checar se há imports CSS não utilizados
# Considerar: Critical CSS inline + Defer secundários
```

**Ganho:** +8-10 pontos performance mobile

---

#### 🔴 P1 — JavaScript Legado (24 KiB) — **ALTO IMPACTO**

**Problema:**
```
Polyfills desnecessários encontrados em chunks/8105:
  - Array.prototype.at ❌ (Node 24 suporta)
  - Array.prototype.flat ❌ (Node 24 suporta)
  - Array.prototype.flatMap ❌ (Node 24 suporta)
  - Object.fromEntries ❌ (Node 24 suporta)
  - Object.hasOwn ❌ (Node 24 suporta)
  - String.prototype.trimEnd ❌ (Node 24 suporta)
  - String.prototype.trimStart ❌ (Node 24 suporta)
```

**Causa:** Build pipeline transpila para ES5/ES2015, gerando polyfills.

**Solução — Remover transpilação desnecessária:**

```javascript
// next.config.ts
export default {
  // Remove target para older browsers
  // Next.js 16+ envia código moderno ao Node 24+ por padrão
  
  // Se houver SWC/Babel config, remover transformações legadas:
  swcMinify: true,
  experimental: {
    disableOptimizedPackageImports: false,
  }
}
```

**Ou em `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020",  {/* Não transpile abaixo de ES2020 */}
    "lib": ["ES2020"]
  }
}
```

**Ganho:** +4-6 pontos performance mobile (24 KiB economizados)

---

#### 🔴 P2 — Reflow Forçado (114 ms)

**Problema:**
```
chunks/52774a7f-6b5a8e747a042d6f.js
  - Lê propriedades geométricas (offsetWidth, clientHeight, etc)
  - Após modificar DOM/styles
  - Força reflow = 114 ms bloqueado
```

**Causa Comum:** Bibliotecas de animação (FullCalendar, Recharts) que medem elementos.

**Solução:**
```javascript
// Padrão ruim (força reflow):
element.style.width = '100px'
const width = element.offsetWidth  {/* REFLOW! */}

// Padrão bom (batch reads/writes):
const width = element.offsetWidth  {/* Ler primeiro */}
element.style.width = width + 'px'  {/* Depois escrever */}
```

**Ação:** Verificar se `chunks/52774a7f` é FullCalendar ou Recharts
- Se FullCalendar: upgrade versão
- Se custom code: refatorar lógica

**Ganho:** +2-3 pontos performance mobile

---

#### 🟡 P3 — Stripe Preconnect Não Utilizado

**Problema:**
```html
<link rel="preconnect" href="https://js.stripe.com">
<!-- Page não carrega Stripe (não é página de checkout) -->
```

**Fix:**
```html
<!-- Remover do layout raiz se página não usa Stripe -->
<!-- Adicionar apenas em: /checkout, /pricing (se compra) -->
```

**Localização:** `src/app/layout.tsx` → remover se homepage não usa Stripe

**Ganho:** +0.5 ponto (minor)

---

#### 🔴 P4 — JavaScript Não Utilizado (163 KiB)

**Problema:**
```
Chunks carregando mas não usados:
  - chunks/8105-cbdd905f13667a03.js (59.2 KiB economizáveis)
  - chunks/7716-eb84e961525d8ea3.js (44.1 KiB economizáveis)
  - chunks/5917-35b3cbe14d3a6af7.js (33.1 KiB economizáveis)

Total: 163 KiB de desperdício
```

**Causa:** Code-splitting inadequado ou imports não utilizados na homepage.

**Diagnóstico:**
```bash
# No Chrome DevTools:
1. Network tab → filter por "js"
2. Coverage tab → veja % used
3. Se < 50% usado = problema
```

**Soluções:**

**A — Dynamic imports para componentes below-fold:**
```jsx
// Em BrazilLanding.tsx
import dynamic from 'next/dynamic'

// Lazy load pricing, reviews, features (below fold)
const PricingSection = dynamic(() => import('./PricingSection'), {
  ssr: false,  // Render only on client
  loading: () => <PricingPlaceholder />
})

const ReviewsSection = dynamic(() => import('./ReviewsSection'), {
  ssr: false,
  loading: () => null
})

export function BrazilLanding() {
  return (
    <>
      <Hero />  {/* Above fold, import normally */}
      <PricingSection />  {/* Below fold, lazy-loaded */}
      <ReviewsSection />  {/* Below fold, lazy-loaded */}
    </>
  )
}
```

**B — Tree-shake unused dependencies:**
```javascript
// Check imports in landing files
// Remove: unused utility functions, components
// Keep: Hero, CTA, essential styles only
```

**Ganho:** +6-8 pontos performance mobile (163 KiB → ~50 KiB)

---

#### 🔴 P5 — Tarefas Longas Main Thread (3 encontradas)

**Problema:**
```
3 tasks bloqueando interactividade
  - Tempo total: 114+ ms
  - Afeta: FID (First Input Delay), INP (Interaction to Next Paint)
```

**Causa:** JavaScript pesado executando na main thread durante load.

**Solução — Web Workers ou defer:**
```javascript
// Se FullCalendar está causando:
import FullCalendar from '@fullcalendar/react'

// Lazy load após interação:
import dynamic from 'next/dynamic'
const CalendarComponent = dynamic(() => import('@/components/Calendar'), {
  ssr: false,  // Não renderiza no server
  loading: () => <CalendarPlaceholder />
})
```

**Ganho:** +3-5 pontos performance mobile

---

## 📋 RESUMO AÇÕES POR PRIORIDADE

### **P0 — Críticas (30 min, +15 pts)**

| # | Problema | Fix | Esforço | Ganho |
|---|----------|-----|---------|-------|
| 1 | Meta viewport maximum-scale | Remover `maximum-scale=1` | 5 min | +4 |
| 2 | CSS bloqueando renderização | Defer CSS secundários | 15 min | +9 |
| 3 | JavaScript legado (24 KiB) | Target ES2020 | 10 min | +5 |

**Subtotal:** +18 pontos

---

### **P1 — Altos (60 min, +14 pts)**

| # | Problema | Fix | Esforço | Ganho |
|---|----------|-----|---------|-------|
| 4 | Títulos desorganizados | h3 → h2 | 10 min | +3 |
| 5 | JS não utilizado (163 KiB) | Dynamic imports | 30 min | +8 |
| 6 | Reflow forçado (114 ms) | Batch DOM ops | 15 min | +2 |
| 7 | Stripe preconnect unused | Remover do layout | 5 min | +1 |

**Subtotal:** +14 pontos

---

### **Total Esperado: 32 pontos em 90 min**

```
Antes:
  Desktop: 92, 88, 92, 100 = 93 avg
  Mobile: 75, 90, 92, 100 = 89.25 avg

Depois:
  Desktop: 92, 98, 92, 100 = 95.5 avg (+2.5)
  Mobile: 92, 90, 92, 100 = 93.5 avg (+4.25)
  
GANHO TOTAL: +6.75 pontos média = +7% improvement
```

---

## 🛠️ IMPLEMENTAÇÃO

### Passo 1: Verificar Versão Node (5 min)

```bash
node --version
# Expected: v24.x.x (LTS)
```

### Passo 2: P0 Fixes (20 min)

**2.1 — Meta Viewport (5 min)**
```bash
# Arquivo: src/app/layout.tsx
# Linha: <meta name="viewport" ... >
# Ação: Remover maximum-scale=1

# ANTES:
content="width=device-width, initial-scale=1, maximum-scale=1"

# DEPOIS:
content="width=device-width, initial-scale=1"
```

**2.2 — JavaScript Target (10 min)**
```bash
# Verificar: tsconfig.json ou next.config.ts
# Alterar target para ES2020

# tsconfig.json:
{
  "compilerOptions": {
    "target": "ES2020"
  }
}
```

**2.3 — CSS Critical Path (5 min)**
```bash
# Verificar: next.config.ts
# Adicionar: preload critical CSS apenas

# next.config.ts:
export default {
  experimental: {
    optimizeCss: true  // Ativa Next.js CSS optimization
  }
}
```

### Passo 3: P1 Fixes (60 min)

**3.1 — Dynamic Imports (30 min)**
```bash
# Arquivos a atualizar:
# - src/components/marketing/regions/BrazilLanding.tsx
# - src/components/common/public/PropertyPageV2.tsx

# Padrão:
import dynamic from 'next/dynamic'
const Component = dynamic(() => import('./Component'), {
  ssr: false,
  loading: () => <Placeholder />
})
```

**3.2 — Títulos (10 min)**
```bash
# Encontrar <h3> sem <h2> em BrazilLanding.tsx
# Alterar para <h2> ou envolver em <section>
```

**3.3 — Stripe Preconnect (5 min)**
```bash
# Verificar: src/app/layout.tsx
# Se homepage não usa Stripe: remover <link rel="preconnect">
```

**3.4 — Reflow Forçado (15 min)**
```bash
# Diagnosticar: chunks/52774a7f-6b5a8e747a042d6f.js
# Verificar: é FullCalendar? Recharts?
# Se custom code: refatorar batch DOM operations
```

---

## ✅ VALIDAÇÃO

**Após implementar:**

```bash
# 1. Build local
npm run build

# 2. Test PageSpeed
https://pagespeed.web.dev/?url=https://www.lodgra.io

# 3. Verificar scores
# Desktop: 88 → 98+ (Accessibility)
# Mobile: 75 → 85+ (Performance)
```

---

## 📊 PRÓXIMOS PASSOS

1. ✅ Confirmar que quer implementar (S/N)
2. ✅ Começar por P0 (viewport + CSS + JS target)
3. ✅ Testar após cada fix
4. ✅ Re-analisar no PageSpeed

---

**Pronto para começar?** Comeco por qual fix primeiro?
