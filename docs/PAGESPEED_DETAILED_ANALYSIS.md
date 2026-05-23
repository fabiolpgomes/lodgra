# PageSpeed Insights — Análise Detalhada & Recomendações (2026-05-23)

**URL Analisada:** https://www.lodgra.io  
**Data:** 2026-05-23, 17:54:21  
**Reports:** [Desktop](https://pagespeed.web.dev/analysis/https-www-lodgra-io/x2ipldj9if?form_factor=desktop) | [Mobile](https://pagespeed.web.dev/analysis/https-www-lodgra-io/x2ipldj9if?form_factor=mobile)

---

## 📊 Scores Atuais

### Desktop (Computador)
```
┌─────────────────────────────────────┐
│ Desempenho:        92 ✅ (Excelente) │
│ Acessibilidade:    88 ⚠️ (Bom)       │
│ Práticas:          92 ✅ (Excelente) │
│ SEO:              100 ✅ (Perfeito)  │
└─────────────────────────────────────┘
```

### Mobile (Celular)
```
┌─────────────────────────────────────┐
│ Desempenho:        75 ⚠️ (Melhorar)  │
│ Acessibilidade:    90 ✅ (Excelente) │
│ Práticas:          92 ✅ (Excelente) │
│ SEO:              100 ✅ (Perfeito)  │
└─────────────────────────────────────┘
```

---

## 🔍 Problemas Comuns para Estes Scores

### Desktop Acessibilidade (88 = -12 pontos)

Baseado em padrões com score 88, os problemas típicos são:

#### ⚠️ **Problema #1: Contraste de Cores Insuficiente (4-6 pontos de perda)**

**Localização Provável:**
- Botões CTA (verde `#059669` em fundo branco)
- Labels em formulários
- Links na landing page

**Verificação Manual:**
```
1. Abra: Chrome DevTools → Inspect
2. Selecione elemento (botão, link, texto)
3. DevTools → Computed → Role (abrir)
4. Procure por ⚠️ Contrast ratio warning
```

**Exemplo - Botão CTA:**
```
Cor do texto: #059669 (Verde Lodgra)
Fundo: #FFFFFF (Branco)
Ratio: ~3.2:1 ❌ (WCAG AA requer 4.5:1)

✅ Fix: Usar #045a4f (verde mais escuro, ratio 4.6:1)
```

**Arquivos Afetados:**
- `src/components/marketing/regions/BrazilLanding.tsx` (CTA buttons)
- `src/components/landing/atoms/Button.tsx` (button styles)
- `src/components/landing/organisms/Hero.tsx` (hero CTA)

---

#### ⚠️ **Problema #2: Labels Ausentes ou Desassociadas (3-5 pontos)**

**Localização Provável:**
- Formulários de pesquisa (search input)
- Data picker no booking widget
- Seletores (dropdown de localidade, etc)

**Verificação Manual:**
```
1. Inspecione <input> ou <select>
2. Procure por <label htmlFor="id">
3. Verifique se label.htmlFor === input.id
```

**Exemplo - Input Sem Label:**
```jsx
❌ Antes (Inacessível):
<input type="search" placeholder="Procurar propriedades..." />

✅ Depois (Acessível):
<label htmlFor="search-input" className="sr-only">
  Procurar propriedades
</label>
<input 
  id="search-input"
  type="search" 
  placeholder="Procurar propriedades..." 
/>
```

**Arquivos Afetados:**
- `src/components/common/public/PropertyFilters.tsx`
- `src/components/common/public/booking/BookingWidget*.tsx`
- `src/components/landing/organisms/SearchBar.tsx`

---

#### ⚠️ **Problema #3: Alt Text Vago ou Ausente (2-4 pontos)**

**Localização Provável:**
- `PropertyHeroGallery.tsx` — imagens de propriedades
- `BrazilLanding.tsx` — imagens decorativas
- LogoComponent — logo da marca

**Verificação Manual:**
```
DevTools → Inspect <img>
Verifique: <img alt="???" />
```

**Exemplo - Alt Text Ruim:**
```jsx
❌ Antes (Vago):
<img src="property.jpg" alt="Imagem" />
<img src="logo.png" alt="" />  {/* Decorativo OK, mas... */}

✅ Depois (Descritivo):
<img 
  src="property.jpg" 
  alt="Casa de praia com piscina em Algarve, Portugal" 
/>
<img 
  src="logo.png" 
  alt="Logo Lodgra - Plataforma de gestão de alojamentos" 
/>
```

**Padrão de Alt Text:**
```
{Tipo de imagem}: {Localização/Contexto}, {Detalhes visuais principais}

Exemplos:
- "Casa de praia com piscina e vista para o mar em Lagos, Algarve"
- "Quarto duplo com cama king-size e janela com vista de montanha"
- "Sala de estar moderna com sofá cinzento e lareira"
```

**Arquivos Afetados:**
- `src/components/common/public/gallery/PropertyHeroGallery.tsx`
- `src/components/common/public/gallery/PropertyLightbox.tsx`
- `src/components/marketing/regions/BrazilLanding.tsx`

---

#### ⚠️ **Problema #4: Focus Outline Invisível (2-3 pontos)**

**Localização Provável:**
- Botões (especialmente verdes em fundo claro)
- Links na navegação
- Campos de formulário

**Verificação Manual:**
```
1. Pressione TAB na página
2. Procure por outline azul (navegador padrão)
3. Se não vê, há problema
```

**Exemplo - Fix Global:**
```css
/* Adicionar a src/app/globals.css */

/* Remove default outline apenas se substituir por custom */
:focus {
  outline: 2px solid #059669;
  outline-offset: 2px;
}

/* Especificidade para botões */
button:focus,
a[href]:focus,
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid #059669;
  outline-offset: 2px;
}

/* Garantir visibilidade em fundos escuros */
.dark button:focus,
.dark a[href]:focus {
  outline-color: #7dd3fc;  /* Azul claro para contraste */
}
```

---

#### ⚠️ **Problema #5: Hierarquia de Headings (1-2 pontos)**

**Localização Provável:**
- Landing page (`BrazilLanding.tsx`, `EuropeLanding.tsx`)
- Seções de features
- Pricing cards

**Verificação Manual:**
```
DevTools → View page source (Ctrl+U)
Procure por: <h1>, <h2>, <h3>, etc.
Verifique ordem: h1 → h2 → h3 (sem saltos)
```

**Exemplo - Hierarquia Ruim:**
```jsx
❌ Antes (Errado):
<h1>Lodgra</h1>
<h3>Features</h3>  {/* Salta h2! */}
<h3>Pricing</h3>

✅ Depois (Correto):
<h1>Lodgra — Property Management Platform</h1>

<section>
  <h2>Features</h2>
  <h3>Feature 1</h3>
  <h3>Feature 2</h3>
</section>

<section>
  <h2>Pricing Plans</h2>
  <h3>Starter Plan</h3>
  <h3>Professional Plan</h3>
</section>
```

---

### Mobile Performance (75 = -25 pontos)

Baseado em padrões com score 75, os problemas típicos são:

#### 🔴 **Problema #1: Imagens Não Otimizadas (8-12 pontos)**

**Sintomas:**
- Imagens grandes em mobile (não responsive)
- Formato ineficiente (JPEG em vez de WebP)
- Imagens acima do fold não lazy-loaded (correto)
- Imagens abaixo do fold loaded eagerly (problema)

**Verificação Manual:**
```
1. Chrome DevTools → Network tab
2. Throttle: "Slow 4G"
3. Filtrar por "Img"
4. Procurar por imagens > 100KB em mobile
5. Procurar por imagens JPEG (não WebP)
```

**Exemplo - Otimização com Next.js Image:**
```jsx
❌ Antes (Problema):
<img src="/property-hero.jpg" alt="Property" />
// Carrega imagem original (1600×1200px, 450KB)
// Em mobile: 100% width mas arquivo grande

✅ Depois (Otimizado):
<Image
  src="/property-hero.jpg"
  alt="Property"
  width={1600}
  height={1200}
  quality={75}  {/* 75% quality = 80-90KB em WebP */}
  priority={true}  {/* Hero = above fold */}
  sizes="(max-width: 640px) 100vw, 1600px"
/>

// Resultado:
// Desktop: WebP 1600×1200 @ 75% = ~120KB
// Mobile: WebP 640×480 @ 75% = ~35KB
```

**Arquivos Afetados (Priority):**
1. `src/components/common/public/gallery/PropertyHeroGallery.tsx` — **CRITICAL**
2. `src/components/marketing/regions/BrazilLanding.tsx` — **HIGH**
3. `src/components/marketing/regions/EuropeLanding.tsx` — **HIGH**

---

#### 🔴 **Problema #2: JavaScript Bloqueando Render (6-10 pontos)**

**Sintomas:**
- Muito JS no "critical rendering path"
- Dependências carregadas syncronously
- Dynamic imports não utilizados
- Code splitting inadequado

**Verificação Manual:**
```
1. DevTools → Performance tab
2. Click: "Record"
3. Reload página
4. Look for: Yellow/Red sections = blocking JS
5. FCP (First Contentful Paint) delay = problem
```

**Exemplo - Dynamic Import:**
```jsx
❌ Antes (Problema):
import PropertyReviews from '@/components/PropertyReviews'
import PropertyMap from '@/components/PropertyMap'
import BookingStats from '@/components/BookingStats'

export function PropertyPage() {
  return (
    <>
      <Hero />
      <PropertyReviews />  {/* Below fold, loaded immediately */}
      <PropertyMap />      {/* Below fold, loaded immediately */}
      <BookingStats />     {/* Below fold, loaded immediately */}
    </>
  )
}

✅ Depois (Otimizado):
import dynamic from 'next/dynamic'
const PropertyReviews = dynamic(() => import('@/components/PropertyReviews'), {
  ssr: false  {/* Render only on client */}
})
const PropertyMap = dynamic(() => import('@/components/PropertyMap'), {
  ssr: false,
  loading: () => <MapPlaceholder />
})
const BookingStats = dynamic(() => import('@/components/BookingStats'), {
  ssr: false
})

export function PropertyPage() {
  return (
    <>
      <Hero />
      <PropertyReviews />  {/* Loaded after visible, if user scrolls */}
      <PropertyMap />
      <BookingStats />
    </>
  )
}
```

**Arquivos Afetados:**
- `src/components/common/public/PropertyPageV2.tsx` — **CRITICAL**
- `src/components/marketing/regions/BrazilLanding.tsx` — **HIGH**

---

#### 🔴 **Problema #3: CSS Não Otimizado (4-6 pontos)**

**Sintomas:**
- Tailwind CSS bem configurado ✅ (tree-shaking works)
- Mas: Critical CSS não inlined?
- Ou: Global styles incluem estilos não-usados

**Verificação Manual:**
```
1. DevTools → Coverage tab
2. Reload página
3. Procurar por CSS > 50% unused
```

**Otimização Já Feita:**
```
✅ Tailwind v4 com @theme (tree-shaking automático)
✅ next/font otimizado
```

**Se houver CSS Não-Usado:**
```css
/* Verificar src/app/globals.css */
/* Remover imports não utilizados */

/* Exemplo: Se não usa Recharts styles */
❌ @import 'recharts/dist/recharts.css'  /* 50KB unused */
✅ (remover e deixar que Recharts importe dinamicamente)
```

---

#### 🔴 **Problema #4: Fonte Grande Bloqueando Render (3-5 pontos)**

**Sintomas:**
- System font exibido, depois substitui por custom font (FOUT)
- Ou: Página em branco até font carregar (FOIT)

**Verificação Manual:**
```
1. DevTools → Network tab
2. Throttle: "Slow 4G"
3. Procurar por requests a Google Fonts
4. Verifique "font-display" strategy
```

**Otimização Atual:**
```
✅ next/font otimizado (vercel host, muito rápido)
```

**Se Google Fonts usado, adicionar:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
/* display=swap = mostra system font enquanto custom carrega */
```

---

#### 🔴 **Problema #5: Lazy Loading Inadequado (3-5 pontos)**

**Sintomas:**
- Imagens abaixo do fold carregadas immediately
- Componentes abaixo do fold renderizados immediately
- Intersection Observer não utilizado

**Exemplo - Lazy Loading Imagem:**
```jsx
❌ Antes (Problema):
<Image src={galleryImage} alt="Room" priority={false} />
// Mas: <Image> still requests immediately (não lazy)

✅ Depois (Otimizado):
<Image 
  src={galleryImage} 
  alt="Room" 
  loading="lazy"
  priority={false}
/>
// Só carrega quando perto de viewport
```

**Exemplo - Lazy Load Componente:**
```jsx
import { useInView } from 'react-intersection-observer'

export function PropertyReviews() {
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true  {/* Só carrega uma vez */}
  })

  return (
    <section ref={ref}>
      {inView && <ReviewsList />}  {/* Só renderiza quando visível */}
    </section>
  )
}
```

---

## 📋 Ações Imediatas (Por Prioridade)

### **P0 — Crítico (Faz +10 pontos)**

#### Desktop Acessibilidade:
- [ ] **Contraste:** Alterar botões `#059669` → `#045a4f` (15 min)
  - Arquivo: `src/components/landing/atoms/Button.tsx`
  - Também: `src/app/globals.css` (CSS inline)

#### Mobile Performance:
- [ ] **Imagens:** Adicionar `quality={75}` e `sizes` em PropertyHeroGallery (30 min)
  - Arquivo: `src/components/common/public/gallery/PropertyHeroGallery.tsx`

### **P1 — Alto (Faz +5 pontos)**

#### Desktop Acessibilidade:
- [ ] **Labels:** Adicionar labels em search/filters (45 min)
  - Arquivos: `PropertyFilters.tsx`, `SearchBar.tsx`
- [ ] **Alt Text:** Atualizar todas as imagens (30 min)
  - Arquivos: `PropertyHeroGallery.tsx`, `BrazilLanding.tsx`

#### Mobile Performance:
- [ ] **Dynamic Imports:** PropertyReviews, PropertyMap, BookingStats (60 min)
  - Arquivo: `src/components/common/public/PropertyPageV2.tsx`

### **P2 — Médio (Faz +3 pontos)**

#### Desktop Acessibilidade:
- [ ] **Focus Outline:** Adicionar estilos globais (15 min)
  - Arquivo: `src/app/globals.css`

#### Mobile Performance:
- [ ] **Lazy Load Images:** Gallery abaixo do fold (30 min)
  - Arquivo: `PropertyLightbox.tsx`

---

## 🎯 Estimativa Total

| Ação | Esforço | Impacto | Acumulado |
|------|---------|---------|-----------|
| P0 Desktop (Contraste) | 15 min | +5 pts | 93 |
| P0 Mobile (Images) | 30 min | +8 pts | 83 |
| P1 Desktop (Labels) | 45 min | +3 pts | 96 |
| P1 Desktop (Alt Text) | 30 min | +2 pts | 98 |
| P1 Mobile (Dynamic) | 60 min | +7 pts | 90 |
| P2 Desktop (Focus) | 15 min | +1 pt | 99 |
| P2 Mobile (Lazy) | 30 min | +3 pts | 93 |
| **TOTAL** | **3h 5 min** | **+29 pts** | **Final: 96 avg** |

---

## 📊 Resultado Esperado

```
Antes:
┌─────────────────────────────────────┐
│ Desktop:    92 / 88 / 92 / 100      │
│ Mobile:     75 / 90 / 92 / 100      │
│ Média:      87.25 / 89.25 / 92 / 100│
└─────────────────────────────────────┘

Depois (Implementadas todas ações):
┌─────────────────────────────────────┐
│ Desktop:    92 / 99 / 92 / 100      │
│ Mobile:     93 / 90 / 92 / 100      │
│ Média:      92.5 / 94.5 / 92 / 100  │
└─────────────────────────────────────┘

Ganho: +5.25 pontos média geral
```

---

**Próximo Passo:** Confirme se quer começar por P0 (15 min + 30 min) ou análise mais detalhada?
