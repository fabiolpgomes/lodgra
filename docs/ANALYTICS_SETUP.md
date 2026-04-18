# Analytics Setup - Estrutura Modular

**Status:** Pronto para Produção  
**Modo:** Dormindo (Teste) → Ativo (Produção)  
**Implementado:** 2026-04-18

---

## 📊 Visão Geral

Sistema de analytics **dormindo em teste**, **ativo em produção**.

- ✅ Infraestrutura completa implementada
- ✅ Eventos predefinidos mapeados
- ✅ Integração em componentes-chave
- ⏸️ Desativado por padrão (NEXT_PUBLIC_ENABLE_ANALYTICS=false)

---

## 🔧 Arquivos Principais

### **1. `/src/lib/analytics/client.ts`**
Cliente analytics com suporte para:
- Google Analytics
- Segment (ready)
- Custom tracking

**Principais funções:**
```typescript
trackEvent(eventName, eventData)        // Track custom event
trackCTA(buttonName, location)          // Track CTA clicks
trackPricingAction(planId, action)      // Track pricing interactions
trackFAQInteraction(index, action)      // Track FAQ opens/closes
trackPageView(pageName, pageData)       // Track page views
```

### **2. `/src/lib/analytics/events.ts`**
Constantes de eventos predefinidos:
```typescript
ANALYTICS_EVENTS.CTA_HERO_PRIMARY       // Hero primary CTA
ANALYTICS_EVENTS.CTA_PRICING_PRO        // Pricing plan selection
ANALYTICS_EVENTS.FAQ_OPEN               // FAQ accordion open
// ... mais 20+ eventos
```

### **3. Componentes Integrados**
- ✅ **Hero.tsx** — Track CTA clicks
- ✅ **FAQItem.tsx** — Track open/close
- ⏳ **Pricing.tsx** — (próximo)
- ⏳ **Navbar.tsx** — (próximo)

---

## 🚀 Ativar em Produção

### **Passo 1: Configurar Google Analytics**

```bash
# .env.production
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX  # Seu Google Analytics ID
```

### **Passo 2: Adicionar Script GA ao Layout**

```tsx
// src/app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `}
        </Script>
      </head>
      {children}
    </html>
  )
}
```

### **Passo 3: Rebuild & Deploy**

```bash
npm run build
npm run deploy  # ou seu comando de deploy
```

---

## 📋 Eventos Mapeados

### **Landing Page**
| Evento | Localização | Ação |
|--------|------------|------|
| `CTA_HERO_PRIMARY` | Hero Section | Click "Começar" |
| `CTA_HERO_SECONDARY` | Hero Section | Click "Ver Demo" |
| `CTA_PRICING_*` | Pricing Section | Click em plano |
| `CTA_FINAL_CTA` | Final CTA | Click no CTA final |
| `CTA_NAVBAR_SIGNUP` | Navbar | Click "Get Started" |
| `CTA_NAVBAR_LOGIN` | Navbar | Click "Login" |

### **Navegação**
| Evento | Ação |
|--------|------|
| `NAV_FEATURE_LINK` | Click em "Features" |
| `NAV_PRICING_LINK` | Click em "Pricing" |
| `NAV_FAQ_LINK` | Click em "FAQ" |
| `NAV_LANGUAGE_CHANGE` | Mudar idioma |

### **Interação**
| Evento | Ação |
|--------|------|
| `FAQ_OPEN` | Expandir FAQ item |
| `FAQ_CLOSE` | Fechar FAQ item |
| `PRICING_PLAN_SELECT` | Selecionar plano |
| `FORM_EMAIL_SIGNUP` | Submit email signup |

---

## 🧪 Testar em Desenvolvimento

### **Ver Logs Locais**
```typescript
// Funciona mesmo com ENABLE_ANALYTICS=false
// Mostra no console em development mode
console.log('[Analytics] event_name', { data })
```

### **Verificar com React DevTools**
1. Abra Chrome DevTools
2. Vá para Application → Cookies
3. Procure por `_ga` (Google Analytics cookie)
4. Deve estar vazio em teste

---

## 🎯 Dados Coletados (Exemplo)

```json
{
  "event_name": "cta_hero_primary_click",
  "data": {
    "button": "hero_primary",
    "location": "hero"
  },
  "timestamp": 1713453600000
}
```

---

## 📈 Métricas Recomendadas em Produção

Configurar no Google Analytics:

**Goals:**
- CTA clicks (Hero, Pricing, Final)
- Email signups
- Language changes

**Custom Dashboards:**
- Conversion by locale (pt-BR vs en-US vs es)
- CTA performance by location
- FAQ engagement rate
- Pricing plan selection rate

**Events to Track:**
- Scroll depth (features, pricing, faq sections)
- Time on page
- Bounce rate
- Device type (mobile vs desktop)

---

## 🔒 Privacidade & GDPR

**Já Implementado:**
- ✅ Sem dados pessoais coletados
- ✅ Modo dormindo em teste (sem tracking)
- ✅ Consentimento pode ser adicionado via banner
- ✅ Pode desativar via `NEXT_PUBLIC_ENABLE_ANALYTICS=false`

**A Implementar (Produção):**
- [ ] Cookie consent banner (se necessário por GDPR)
- [ ] Privacy policy update
- [ ] Data retention settings no GA
- [ ] User anonymization se necessário

---

## 📚 Recursos

- [Google Analytics 4 Docs](https://support.google.com/analytics/answer/10089681)
- [Segment Documentation](https://segment.com/docs/)
- [Next.js Analytics Guide](https://nextjs.org/learn/seo/web-vitals)

---

## ✅ Checklist de Deploy

- [ ] Google Analytics conta criada
- [ ] GA ID adicionado a `.env.production`
- [ ] Script GA adicionado ao layout
- [ ] `NEXT_PUBLIC_ENABLE_ANALYTICS=true` em produção
- [ ] Testar eventos após deploy
- [ ] Verificar dados no GA dashboard após 24h
- [ ] Setup goals & dashboards customizados
- [ ] Cookie consent (se GDPR aplicável)
- [ ] Privacy policy atualizada

---

**Infraestrutura Pronta! Basta ligar o switch em produção.** ✨

— Analytics Team | 2026-04-18
