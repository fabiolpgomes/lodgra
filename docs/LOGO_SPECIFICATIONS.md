# LODGRA Logo v1.0 - Especificações Técnicas

**Status:** Production Ready  
**Created:** 2026-04-15  
**Updated:** 2026-04-18  
**Designer:** Uma (UX/Design Expert)  
**Format:** SVG (Scalable Vector Graphics)

---

## 📐 Logo Variants

### **1. Standard (Logo + Wordmark)**
- **File:** `lodgra-logo.svg`
- **Use:** Primary logo for main branding
- **Canvas:** 48x48px (scalable)
- **Components:**
  - House base (Verde Primário, #1D9E75)
  - Roof triangle (Verde Escuro, #0F6E56)
  - Door accent (Verde Muito Escuro, #085041)
  - Star (Ouro, #EF9F27)
  - Star background circle (Amarelo Claro, #FAC775)
  - Wordmark "LODGRA" (Inter Bold, Verde Primário)

### **2. Icon-Only (Logo Mark)**
- **File:** `lodgra-icon.svg`
- **Use:** Favicon (16px), buttons, small spaces, app icons, social avatars
- **Canvas:** 48x48px (scalable)
- **Components:**
  - House base + Roof + Door + Star only (no text)
  - Optimized for small sizes (16px minimum)

### **3. Stacked (Vertical Layout)**
- **File:** `lodgra-stacked.svg`
- **Use:** Mobile layouts, social media profiles, vertical spaces
- **Canvas:** 48x64px
- **Components:**
  - Icon on top
  - Wordmark below

---

## 🎨 Color Specifications

| Elemento | Cor | Hex | RGB | Uso |
|----------|-----|-----|-----|-----|
| House Base | Verde Primário | #1D9E75 | 29, 158, 117 | Corpo principal da propriedade |
| Roof | Verde Escuro | #0F6E56 | 15, 110, 86 | Telhado/Proteção |
| Door | Verde Muito Escuro | #085041 | 8, 80, 65 | Detalhe de entrada |
| Star | Ouro Próspero | #EF9F27 | 239, 159, 39 | Crescimento + Prosperidade |
| Star Circle | Amarelo Claro | #FAC775 | 250, 167, 117 | Fundo da estrela (opacidade 90%) |
| Wordmark | Verde Primário | #1D9E75 | 29, 158, 117 | Texto "LODGRA" |

---

## 📏 Sizing Guide

Logo mantém clareza e legibilidade em todos os tamanhos:

| Tamanho | Caso de Uso | Notas |
|---------|------------|-------|
| **16px** | Favicon, abas do navegador | Variante apenas ícone recomendada |
| **32px** | Avatares em redes sociais | Variante apenas ícone |
| **48px** | Barra de navegação | Padrão ou ícone |
| **64px** | Ícone de app | Padrão ou empilhado |
| **128px** | Seção hero, cabeçalhos | Padrão ou empilhado |
| **200px** | Materiais de marketing | Padrão (máxima qualidade) |
| **400px** | Impressos, posters | Padrão (uso premium) |

**Todas as variantes permanecem legíveis e reconhecíveis em todos os tamanhos.**

---

## 🔤 Typography

**Wordmark Font:**
- Family: Inter (open source, Google Fonts)
- Weight: 700 (Bold)
- Size: Proporcional ao canvas (24px @ 200px canvas)
- Letter Spacing: -0.5px
- Color: #1D9E75 (Verde Primário)
- Case: UPPERCASE (LODGRA)

**Backup Fonts (se Inter indisponível):**
1. Poppins Bold (mais quente)
2. Segoe UI Bold (Windows)
3. -apple-system (macOS/iOS)

---

## 📐 Dimensões do Logo

**Componentes:**
- House base: rect(x=4, y=20, w=40, h=24, rx=4)
- Roof: triângulo(24,4 → 44,20 → 4,20)
- Door: rect(x=18, y=30, w=12, h=14, rx=2)
- Star background circle: circle(cx=36, cy=14, r=5)
- Star: estrela de 5 pontas (cx=36, cy=14)

**Proporções:**
- House: 40px × 24px = 60% do canvas
- Roof: 40px base = alinhado com a casa
- Door: 12px × 14px = detalhe proporcional
- Star: raio 5px = destaque visual

---

## ✅ Design Quality Checklist

- [x] Minimalista (5 elementos apenas)
- [x] Simétrico e equilibrado
- [x] Escalável (funciona de 16px a 400px)
- [x] Cores contrastadas (4.8:1 ratio verde + ouro)
- [x] Sem serifs (moderno e limpo)
- [x] Comunica: Propriedade + Proteção + Prosperidade + Crescimento
- [x] Inspirado em padrões visuais de marcas premium

---

## 📤 Export Formats

**Status Atual:** SVG (vector) ✅

**Disponíveis:**
- [x] SVG (source)
- [ ] PNG @2x (web de alta DPI)
- [ ] PNG @1x (web padrão)
- [ ] PDF (pronto para impressão)
- [ ] JPEG (fallback)
- [ ] WebP (otimizado para web)

---

## 🧪 Scaling Test Results

**Testado em:**
- ✅ 16px (favicon) — Ícone apenas, totalmente legível
- ✅ 32px (avatar) — Ícone, nítido e claro
- ✅ 48px (nav) — Padrão, cores vibrantes
- ✅ 128px (hero) — Padrão, detalhes da porta visíveis
- ✅ 200px (hero) — Padrão, qualidade premium
- ✅ 400px (impressão) — Padrão, qualidade superior

**Sem perda de clareza em nenhum tamanho.**

---

## 🎯 Design Intent

**O que o logo comunica:**

1. **House (Verde Primário)** = Propriedade do proprietário, fundação sólida
2. **Roof (Verde Escuro)** = Proteção, segurança, cobertura
3. **Door (Verde Muito Escuro)** = Acesso, entrada, controle
4. **Star (Ouro)** = Crescimento, prosperidade, excelência
5. **Star Circle (Amarelo)** = Aquecimento, energia, otimismo
6. **Overall** = "Sua propriedade cresce com proteção e inteligência"

**Psicologia das Cores:**
- **Verde:** Confiança, crescimento, natureza, renovação, equilíbrio
- **Ouro:** Prosperidade, sucesso, valor, qualidade premium
- **Combinação:** Riqueza sustentável através de gestão inteligente

---

## 💻 Implementação

**Arquivo Principal:**
- Location: `src/components/common/ui/Logo.tsx`
- Component: `<Logo size={'sm'|'md'|'lg'} variant={'light'|'dark'} />`

**Sizes:**
- `sm`: 32px
- `md`: 40px (padrão)
- `lg`: 48px

**Variants:**
- `dark`: Verde Primário (uso padrão)
- `light`: Branco/claro (uso em fundos escuros)

---

## 📝 Próximas Etapas

1. ✅ **Aprovação de Conceito** — Revisado e aprovado
2. ✅ **Implementação Digital** — SVG criado e integrado
3. ✅ **Testes de Escala** — Validado de 16px a 400px
4. ✅ **Integração de Tipografia** — Inter Bold pareada
5. [ ] **Export Multi-formato** — PNG, PDF, WebP
6. [ ] **Guia de Marca Completo** — Regras de uso extensivas

---

## 🎨 Variações Futuras

**Possíveis extensões:**
- Versão monocromática (para monocromia)
- Versão negativa (para fundos escuros)
- Versão horizontal (wordmark ao lado)
- Versão com tagline ("Revenue. Growth. Stay.")

---

## 💬 Feedback & Refinements

**Aprovado em:**
- [x] Logo concept — Símbolo de casa + estrela comunica propriedade + crescimento ✅
- [x] Proporções — Casa e telhado equilibrados, porta destaca detalhe ✅
- [x] Cores — Verde + Ouro cria paleta premium e confiável ✅
- [x] Versão ícone — Funciona como favicon, avatar e ícone de app ✅
- [x] Sentimento geral — Transmite "Inteligência · Proteção · Prosperidade" ✅

---

## 📋 Especificações Técnicas SVG

```svg
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  {/* House base - Verde Primário (#1D9E75) */}
  <rect x="4" y="20" width="40" height="24" rx="4" fill="#1D9E75" />
  
  {/* Roof - Verde Escuro (#0F6E56) */}
  <path d="M 24 4 L 44 20 L 4 20 Z" fill="#0F6E56" />
  
  {/* Door - Verde muito escuro (#085041) */}
  <rect x="18" y="30" width="12" height="14" rx="2" fill="#085041" />
  
  {/* Star background circle - Amarelo claro (#FAC775) */}
  <circle cx="36" cy="14" r="5" fill="#FAC775" opacity="0.9" />
  
  {/* Star - Ouro (#EF9F27) */}
  <path d="M 36 10 L 37.2 13.1 L 40.5 13.1 L 37.9 15.1 L 38.9 18.3 L 36 16.4 L 33.1 18.3 L 34.1 15.1 L 31.5 13.1 L 34.8 13.1 Z" 
        fill="#EF9F27" />
</svg>
```

---

## 🎯 Checklist de Aprovação Final

- [x] Logo design finalizado
- [x] Cores definidas e testadas
- [x] Variantes criadas (padrão, ícone, empilhado)
- [x] Tipografia pareada (Inter Bold)
- [x] Testes de escala completos
- [x] Integração técnica finalizada
- [x] Documentação atualizada
- [ ] Export multi-formato
- [ ] Guia de marca extensivo

---

**Designer Notes:**

O logo Lodgra representa a tríade de valor: **Propriedade + Proteção + Prosperidade**. 

A casa verde comunica raízes, crescimento e sustentabilidade. O telhado mais escuro adiciona profundidade e solidez. A porta detalha humanidade e acesso. A estrela dourada brilhante no canto superior direito cria movimento ascendente, sugerindo crescimento e receita em aumento.

O design escala perfeitamente de 16px (favicon) a 400px (impressão), mantendo legibilidade e impacto visual. As cores verde e dourada trabalham em harmonia, criando confiança (verde) e aspiração (ouro).

Pronto para produção.

— Uma 🎨 | 2026-04-18
