# LODGRA Typography System v1.0

**Status:** Production Ready  
**Version:** 1.0  
**Created:** 2026-04-15  
**Updated:** 2026-04-18  
**Brand:** Lodgra

---

## 🔤 Font Family Selection

### **Headings: Poppins**
- **Name:** Poppins
- **Weight:** 700 (Bold)
- **Style:** Normal
- **Source:** Google Fonts
- **URL:** https://fonts.google.com/specimen/Poppins
- **Rationale:** Moderno, amigável, com personalidade. Perfeito para transmitir confiança e crescimento.

**Uso:**
- Títulos de página
- Cabeçalhos de seção
- Wordmark do logo
- Botões call-to-action
- Títulos de cards
- Itens de navegação

### **Body: Inter**
- **Name:** Inter
- **Weights:** 400 (Regular), 500 (Medium), 600 (Semibold)
- **Style:** Normal
- **Source:** Google Fonts
- **URL:** https://fonts.google.com/specimen/Inter

**Uso:**
- Texto de parágrafo
- Descrições
- Labels de navegação
- Inputs de formulário
- Texto pequeno de UI

---

## 📏 Escala Tipográfica - Desktop

| Nível | Font | Tamanho | Weight | Line Height | Letter Spacing | Uso |
|-------|------|---------|--------|-------------|----------------|-----|
| **H1** | Poppins | 48px | 700 | 1.2 | -1px | Título principal da página |
| **H2** | Poppins | 36px | 700 | 1.3 | -0.5px | Título de seção |
| **H3** | Poppins | 28px | 700 | 1.4 | 0px | Título de subseção |
| **H4** | Poppins | 24px | 700 | 1.5 | 0px | Título de card |
| **Body** | Inter | 16px | 400 | 1.6 | 0px | Texto de parágrafo |
| **Small** | Inter | 14px | 400 | 1.5 | 0px | Caption, label |
| **Tiny** | Inter | 12px | 500 | 1.4 | 0.5px | Badge, tag |

---

## 📱 Escala Tipográfica - Mobile

| Nível | Font | Tamanho | Weight | Line Height | Uso |
|-------|------|---------|--------|-------------|-----|
| **H1** | Poppins | 32px | 700 | 1.25 | Título principal (mobile) |
| **H2** | Poppins | 24px | 700 | 1.3 | Título de seção (mobile) |
| **H3** | Poppins | 20px | 700 | 1.4 | Título de subseção (mobile) |
| **Body** | Inter | 16px | 400 | 1.6 | Texto de parágrafo (mobile) |
| **Small** | Inter | 14px | 400 | 1.5 | Caption (mobile) |

---

## 📋 Regras de Tipografia

### **Headings**
- ✅ Sempre use Poppins Bold (700)
- ✗ Nunca use weights mais leves para headings
- ✅ Máximo 60 caracteres por linha para legibilidade
- ✅ Use hierarquia consistente (H1 > H2 > H3 > H4)
- ✅ Mantenha proporção de escala 1.25 - 1.33 entre níveis

### **Body Text**
- ✅ Sempre use Inter Regular (400) para body text
- ✅ Mínimo 16px na web para acessibilidade
- ✅ Line-height mínimo 1.5 para legibilidade
- ✅ Máximo 80 caracteres por linha (ótimo)
- ✅ Use Inter Medium (500) para destaques leves
- ✗ Nunca use tamanho menor que 16px para body text

### **Ênfase & Destaques**
- ✅ Use Inter Medium (500) ou Semibold (600)
- ✗ Nunca use itálicos (difícil de ler em telas)
- ✅ Use Poppins Bold para ênfase forte
- ✅ Use cor ou peso para destaque, não itálico
- ✅ Limite ênfase a 10-15% do texto

### **Acessibilidade**
- ✅ Body text ≥ 16px (mobile-friendly)
- ✅ Line-height ≥ 1.5
- ✅ Font weights: 400, 500, 600, 700 apenas
- ✅ Teste contraste (WCAG AA mínimo)
- ✅ Mantenha ratios de cor 4.5:1 para texto
- ✅ Evite todas capitalizações em body text

---

## 🎨 Uso Específico por Componente

### **Hero Section**
```
H1 (Poppins Bold, 48px/1.2)
Headline: "Gestão inteligente de hospedagem..."

P (Inter Regular, 16px/1.6)
Subheadline: "Completo controle do ROI..."

P (Inter Medium, 14px)
CTA Button: "Começar agora"
```

### **Card Titles**
```
H4 (Poppins Bold, 24px/1.5)
Card Title: "Preços Inteligentes"

P (Inter Regular, 16px/1.6)
Card Description: "Algoritmo de precificação dinâmica..."
```

### **Navigation**
```
Nav Item (Inter Medium, 16px)
"Produtos" | "Empresa" | "Suporte"
```

### **Forms**
```
Label (Inter Medium, 14px)
"Email address"

Input (Inter Regular, 16px)
Placeholder: "seu@email.com"

Helper Text (Inter Regular, 12px, color: gray-500)
"Nunca compartilharemos seu email"
```

### **Footer**
```
H4 (Poppins Bold, 14px)
"Produto"

A (Inter Regular, 12px)
"Features" | "Pricing" | "Integrations"

Copyright (Inter Regular, 12px, color: gray-500)
"© 2026 Lodgra. Todos os direitos reservados."
```

---

## 💻 Configuração Tailwind CSS

```javascript
// tailwind.config.js
export const config = {
  theme: {
    fontFamily: {
      'lodgra-heading': ['Poppins', 'sans-serif'],
      'lodgra-body': ['Inter', 'sans-serif'],
      'sans': ['Inter', 'sans-serif'],
    },
    fontSize: {
      'xs': ['12px', { lineHeight: '1.4' }],
      'sm': ['14px', { lineHeight: '1.5' }],
      'base': ['16px', { lineHeight: '1.6' }],
      'lg': ['24px', { lineHeight: '1.5' }],
      'xl': ['28px', { lineHeight: '1.4' }],
      '2xl': ['36px', { lineHeight: '1.3' }],
      '3xl': ['48px', { lineHeight: '1.2' }],
    },
    fontWeight: {
      'normal': 400,
      'medium': 500,
      'semibold': 600,
      'bold': 700,
    },
    letterSpacing: {
      'tight': '-1px',
      'normal': '0px',
      'wide': '0.5px',
    },
  },
}
```

---

## 🔗 Google Fonts Import

### **URL Import**
```
https://fonts.googleapis.com/css2?family=Poppins:wght@700&family=Inter:wght@400;500;600;700&display=swap
```

### **HTML Link (Head)**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### **CSS Import**
```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700&family=Inter:wght@400;500;600;700&display=swap');
```

---

## 🧪 Exemplos de Uso

### **Hero Section**
```jsx
<section className="py-20">
  <h1 className="font-lodgra-heading text-3xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
    Gestão inteligente de hospedagem
  </h1>
  <p className="font-lodgra-body text-base md:text-lg text-gray-600 mt-6 leading-relaxed max-w-2xl">
    Transforme suas propriedades em ativos financeiros de alto desempenho.
  </p>
</section>
```

### **Card Component**
```jsx
<div className="p-6 rounded-lg border border-gray-200">
  <h3 className="font-lodgra-heading text-lg font-bold text-gray-900">
    Preços Inteligentes
  </h3>
  <p className="font-lodgra-body text-sm text-gray-600 mt-2">
    Algoritmo de precificação dinâmica ajusta tarifas em tempo real.
  </p>
</div>
```

### **Button**
```jsx
<button className="font-lodgra-heading font-bold text-base px-6 py-3 rounded-lg">
  Começar agora
</button>
```

### **Form Label**
```jsx
<label className="font-lodgra-body font-medium text-sm text-gray-700">
  Email address
</label>
<input className="font-lodgra-body text-base w-full" type="email" />
```

---

## ✅ Checklist de Qualidade Tipográfica

- [x] Dois fonts apenas (Poppins + Inter)
- [x] Weights limitadas (400, 500, 600, 700)
- [x] Escala consistente (1.2 - 1.6)
- [x] Line-heights otimizadas (1.2 - 1.6)
- [x] Contrast testado (WCAG AA)
- [x] Mobile responsivo
- [x] Acessibilidade garantida
- [x] Performance otimizada (Google Fonts)
- [x] Fallback stack definido
- [x] Documentação completa

---

## 📱 Responsive Behavior

### **Breakpoints**
- **Mobile:** < 640px (sm) - Escala reduzida
- **Tablet:** 640px - 1024px (md/lg) - Escala média
- **Desktop:** > 1024px (xl) - Escala completa

### **Scaling Example**
```jsx
// H1 responsivo
<h1 className="text-2xl md:text-4xl lg:text-6xl font-bold">
  Título Principal
</h1>
```

---

## 🎯 Design Principles

1. **Legibilidade Primeiro** — Sempre priorize a legibilidade sobre a estética
2. **Hierarquia Clara** — A escala deve guiar o olho do usuário
3. **Consistência** — Mantenha os mesmos fonts e pesos em contextos semelhantes
4. **Acessibilidade** — Mínimo 16px body, contraste 4.5:1
5. **Performance** — Use apenas weights necessários
6. **Responsividade** — Adapte escala para mobile, tablet, desktop

---

## 🔄 Migration Path (se vindo de outro sistema)

Se você tem um sistema de tipografia anterior:

1. ✅ Substitua headings com Poppins Bold 700
2. ✅ Substitua body com Inter Regular 400/500
3. ✅ Atualize tamanhos para match da escala acima
4. ✅ Aumente line-heights para 1.5-1.6 (legibilidade)
5. ✅ Remova todos itálicos
6. ✅ Teste acessibilidade (contrast, tamanhos)
7. ✅ Valide em mobile e desktop

---

## 📝 Fallback Stack

Se as fontes do Google não carregarem:

```css
font-family: 'Poppins', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
font-family: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
```

---

## 💬 Support & Questions

Para questões sobre tipografia:
- Revise a escala acima
- Mantenha consistência com Poppins (headings) + Inter (body)
- Nunca desvie dos weights definidos (400, 500, 600, 700)
- Sempre teste acessibilidade antes de deploy

---

**Sistema de Tipografia Lodgra — Production Ready ✅**

Criado com foco em legibilidade, acessibilidade e performance.

— Design System Team | 2026-04-18
