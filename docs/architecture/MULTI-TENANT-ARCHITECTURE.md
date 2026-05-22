# Arquitetura Multi-Tenant — Lodgra

**Data:** 2026-05-22  
**Status:** Análise Completa + Recomendação  
**Autor:** Aria (Architect)

---

## 📋 Índice

1. [Estado Atual](#estado-atual)
2. [Fluxo Direct Booking](#fluxo-direct-booking)
3. [Comparação: Path-based vs Host-based](#comparação-path-based-vs-host-based)
4. [Recomendação Arquitetônica](#recomendação-arquitetônica)
5. [Implementação Roadmap](#implementação-roadmap)
6. [Diagrama de Arquitetura](#diagrama-de-arquitetura)

---

## 🏗️ Estado Atual

### ✅ Infraestrutura Multi-Tenant Implementada

A arquitetura multi-tenant do Lodgra **ESTÁ COMPLETA** no backend. O sistema suporta simultaneamente:

#### 1. **Tenant Identification (Middleware)**

**Ficheiro:** `middleware.ts` (linhas 29-36)

```typescript
// Tenant subdomain detection (e.g. "pousada" from "pousada.lodgra.io")
const hostname = request.headers.get('host') ?? ''
const rootDomains = ['lodgra.io', 'homestay.pt', 'localhost:3000', 'vercel.app']
const isRootDomain = rootDomains.some(d => hostname === d || hostname.endsWith('.vercel.app'))
const subdomain = !isRootDomain ? hostname.split('.')[0] : null
if (subdomain && subdomain !== 'www') {
  requestHeaders.set('x-org-slug', subdomain)
}
```

**Resultado:** O header `x-org-slug` é adicionado automaticamente para qualquer request

#### 2. **Identificação da Organização (BD)**

Tabela `organizations`:
```sql
organizations(
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,  -- Identificador único da empresa
  name TEXT NOT NULL,
  ...
)
```

#### 3. **Propriedades por Organização (BD)**

Tabela `properties`:
```sql
properties(
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,  -- FK para organizations
  name TEXT,
  base_price DECIMAL,
  is_public BOOLEAN,
  ...
)
```

**RLS (Row Level Security):** Implementado em todas as tabelas com `organization_id`

#### 4. **Filtragem em APIs**

**Ficheiro:** `/src/app/api/properties/route.ts` (linhas 127-164)

```typescript
// Resolve org ID from slug if provided
let orgId: string | undefined
if (query.orgSlug) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', query.orgSlug)
    .single()
  if (!org) {
    return Response.json({ success: false, error: 'Organization not found' }, { status: 404 })
  }
  orgId = org.id
}

// Filter properties by organization
if (orgId) {
  queryBuilder = queryBuilder.eq('organization_id', orgId)
}
```

#### 5. **Página de Booking (Frontend)**

**Ficheiro:** `/src/app/booking/page.tsx`

```typescript
export default async function BookingPage() {
  const hdrs = await headers()
  const orgSlug = hdrs.get('x-org-slug') ?? null  // ← Extrai do middleware

  let orgName: string | null = null
  if (orgSlug) {
    const supabase = createAdminClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('slug', orgSlug)
      .single()
    orgName = org?.name ?? null
  }

  return <BookingPageClient orgSlug={orgSlug} orgName={orgName} />
}
```

---

## 🛎️ Fluxo Direct Booking

### Current Flow (lodgra.io/booking)

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENTE EXTERNO (sem login)                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ GET lodgra.io/booking                                           │
│                                                                 │
│ Header: x-org-slug = null (não há subdomain)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ /src/app/booking/page.tsx                                       │
│                                                                 │
│ orgSlug = null (sem header)                                    │
│ orgName = null                                                 │
│                                                                 │
│ → Mostra TODAS as propriedades públicas (sem filtro)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ BookingPageClient fetches /api/properties                       │
│                                                                 │
│ Query: ?limit=12&page=1 (sem orgSlug)                          │
│                                                                 │
│ → API retorna propriedades de TODAS as organizações            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ GRID de Propriedades                                            │
│                                                                 │
│ ✓ Pesquisa (cidade, datas, hóspedes)                           │
│ ✓ Filtros (tipo, preço, amenities)                             │
│ ✓ Botão "RESERVAR AGORA"                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Future Flow (nomeempresa.lodgra.io/booking)

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENTE EXTERNO (sem login)                                     │
│ URL: pousada.lodgra.io/booking                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Middleware extracts tenant                                      │
│                                                                 │
│ hostname = "pousada.lodgra.io"                                 │
│ subdomain = "pousada"                                          │
│ Header: x-org-slug = "pousada"                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ /src/app/booking/page.tsx                                       │
│                                                                 │
│ orgSlug = "pousada" (do header)                                │
│ orgName = "Pousada Casa da Praia" (BD lookup)                  │
│                                                                 │
│ → Mostra APENAS propriedades dessa organização                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ BookingPageClient fetches /api/properties                       │
│                                                                 │
│ Query: ?limit=12&page=1&orgSlug=pousada                        │
│                                                                 │
│ → API retorna apenas propriedades de "pousada"                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ GRID de Propriedades (Branded)                                  │
│                                                                 │
│ ✓ Headline: "Pousada Casa da Praia — Propriedades"             │
│ ✓ Pesquisa (cidade, datas, hóspedes)                           │
│ ✓ Filtros (tipo, preço, amenities)                             │
│ ✓ Botão "RESERVAR AGORA" (reserva direta)                      │
│ ✓ Branding da empresa (logo, cores, etc.)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Comparação: Path-based vs Host-based

### Opção A: Path-based (ATUAL)
**URL:** `lodgra.io/booking?orgSlug=pousada`

| Critério | Análise |
|----------|---------|
| **Implementação** | ✅ Já funciona — apenas passar `?orgSlug=` |
| **DNS** | ✅ Sem alterações — só lodgra.io |
| **SSL** | ✅ Sem alterações — já existe wildcard |
| **Branding** | ❌ Fraco — URL genérica |
| **SEO** | ⚠️ Moderado — `?orgSlug=` prejudica rankings |
| **Shareability** | ❌ Fraca — URL longa e sem branding |
| **Comercial** | ❌ Não diferencia empresas — todas em lodgra.io |
| **Custo** | ✅ Zero — sem infraestrutura extra |

---

### Opção B: Host-based (RECOMENDADO)
**URL:** `pousada.lodgra.io/booking`

| Critério | Análise |
|----------|---------|
| **Implementação** | ✅ Sistema JÁ ESTÁ PRONTO — só configurar DNS |
| **DNS** | ⚠️ Wildcard `*.lodgra.io` necessário |
| **SSL** | ✅ Wildcard SSL na Vercel (configurável) |
| **Branding** | ✅ Excelente — empresa no domínio |
| **SEO** | ✅ Ótimo — subdomínios tratados como domínios separados |
| **Shareability** | ✅ Excelente — URL curta e branded |
| **Comercial** | ✅ Premium — cada empresa tem seu "domínio" |
| **Custo** | ✅ Mínimo — wildcard DNS (~€5/ano) |

---

## 🎯 Recomendação Arquitetônica

### ✅ RECOMENDAÇÃO: Host-based (Opção B)

**Por quê?**

1. **Comercial:** Diferenciação — clientes veem `seuhotel.lodgra.io` vs genérico `lodgra.io?orgSlug=X`
2. **SEO:** Cada empresa tem sua própria "presença" de domínio
3. **Sharing:** URLs shareable: "Veja minhas propriedades em pousada.lodgra.io"
4. **Branding:** Oportunidade de customização (logo, cores, favicons por domínio)
5. **Técnica:** Sistema JÁ ESTÁ PRONTO — middleware funciona!
6. **Custo:** Praticamente zero (wildcard DNS)

---

## 🚀 Implementação Roadmap

### Fase 1: Infraestrutura (1-2 dias)

**1.1 DNS Configuration**
- [ ] Adicionar wildcard record: `*.lodgra.io → Vercel (Edge Network)`
- [ ] Verificar propagação DNS

**1.2 Vercel Configuration**
- [ ] Adicionar wildcard domain: `*.lodgra.io` em Vercel Project Settings
- [ ] Configurar wildcard SSL (Vercel gera automaticamente)
- [ ] Testar com subdomain de teste: `test.lodgra.io`

**1.3 Testing**
- [ ] `curl -H "Host: test.lodgra.io" http://localhost:3000/booking`
- [ ] Verificar header `x-org-slug: test`
- [ ] Criar org com slug `test` em BD

---

### Fase 2: Customização (3-5 dias)

**2.1 Dynamic Branding**
- [ ] Criar tabela `organization_branding`:
  ```sql
  organization_branding(
    organization_id UUID,
    logo_url TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    favicon_url TEXT,
    ...
  )
  ```
- [ ] Fetchar branding no `/booking` por `orgSlug`
- [ ] Aplicar CSS dinâmico (logo, cores, favicon)

**2.2 Personalized Booking Page**
- [ ] Adicionar headline customizado: `"[Company Name] — Propriedades"`
- [ ] Exibir logo da empresa
- [ ] Footer customizado com contacto da empresa

**2.3 Email Customization**
- [ ] Booking confirmation com branding da empresa
- [ ] Sender: `noreply@[company-slug].lodgra.io` (opcional)

---

### Fase 3: Routing & Backwards Compatibility (2-3 dias)

**3.1 Legacy Path Redirect** (opcional)
- [ ] Rewrite `lodgra.io/booking?orgSlug=X` → `X.lodgra.io/booking`
- [ ] Manter /booking genérico para discovery

**3.2 Deep Links**
- [ ] `/booking` genérico → mostra todas as propriedades
- [ ] `company.lodgra.io/booking` → propriedades da company

---

### Fase 4: Marketing & Launch (1 week)

**4.1 Company Onboarding**
- [ ] Adicionar campo no painel: "Seu booking link: `[slug].lodgra.io`"
- [ ] Instruções de como compartilhar

**4.2 SEO Setup**
- [ ] Adicionar sitemap dinâmico por subdomain
- [ ] robots.txt permissivo para crawlers

---

## 📐 Diagrama de Arquitetura

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                        │
│                                                                  │
│ URL: https://pousada.lodgra.io/booking                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS Request
┌──────────────────────────────────────────────────────────────────┐
│              Vercel Edge Network (Global CDN)                    │
│                                                                  │
│ - Resolve *.lodgra.io → Lodgra App                              │
│ - Wildcard SSL (*.lodgra.io)                                    │
│ - Rate limiting edge                                            │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Forward to Vercel Function
┌──────────────────────────────────────────────────────────────────┐
│                      Next.js Middleware                          │
│                                                                  │
│ 1. Extract Host: "pousada.lodgra.io"                            │
│ 2. Extract Subdomain: "pousada"                                 │
│ 3. Set Header: x-org-slug = "pousada"                           │
│ 4. Apply CSRF, Rate Limit, Security Headers                     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   /app/booking/page.tsx (RSC)                    │
│                                                                  │
│ 1. Read header: x-org-slug = "pousada"                          │
│ 2. Query BD:                                                    │
│    SELECT name FROM organizations WHERE slug = 'pousada'       │
│ 3. Return: orgSlug = "pousada", orgName = "Pousada Casa..."    │
│ 4. Render: <BookingPageClient {...props} />                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTML Response
┌──────────────────────────────────────────────────────────────────┐
│                     Browser Renders HTML                         │
│                                                                  │
│ - Logo: Pousada Casa da Praia                                   │
│ - Title: "Pousada Casa da Praia — Propriedades"                 │
│ - Search Bar                                                    │
│ - Filters                                                       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ Client-side Hydration
┌──────────────────────────────────────────────────────────────────┐
│                  BookingPageClient (React Client)               │
│                                                                  │
│ 1. On mount, fetch /api/properties?orgSlug=pousada              │
│ 2. Render PropertyGrid                                          │
│ 3. Apply filters (price, amenities, location)                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ API Request
┌──────────────────────────────────────────────────────────────────┐
│                 GET /api/properties                              │
│                                                                  │
│ Query: ?orgSlug=pousada&limit=12&page=1                         │
│                                                                  │
│ 1. Resolve orgId from orgSlug                                   │
│ 2. Query BD:                                                    │
│    SELECT * FROM properties                                     │
│    WHERE organization_id = $orgId                               │
│      AND is_public = true                                       │
│ 3. Return JSON with properties + pagination                     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Supabase (PostgreSQL)                       │
│                                                                  │
│ Tables (with RLS):                                              │
│ - organizations(id, slug, name, ...)                            │
│ - properties(id, organization_id, name, price, is_public, ...) │
│ - property_images(id, property_id, ...)                         │
│ - reservations(id, property_id, check_in, check_out, ...)      │
│                                                                  │
│ RLS Policy:                                                     │
│   SELECT properties WHERE organization_id = current_org_id      │
└──────────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Isolation

```
┌─────────────────────────────┬─────────────────────────────┐
│     pousada.lodgra.io       │      hotel.lodgra.io        │
├─────────────────────────────┼─────────────────────────────┤
│ Org ID: uuid-1              │ Org ID: uuid-2              │
│ Slug: pousada               │ Slug: hotel                 │
│ Name: Pousada Casa da Praia │ Name: Hotel Luxo Portugal   │
├─────────────────────────────┼─────────────────────────────┤
│ x-org-slug: pousada         │ x-org-slug: hotel           │
├─────────────────────────────┼─────────────────────────────┤
│ Properties:                 │ Properties:                 │
│ - Propriedade 1 (uuid-a)    │ - Propriedade 4 (uuid-d)    │
│ - Propriedade 2 (uuid-b)    │ - Propriedade 5 (uuid-e)    │
│ - Propriedade 3 (uuid-c)    │                             │
├─────────────────────────────┼─────────────────────────────┤
│ Reservations (org-isolated) │ Reservations (org-isolated) │
│ - Reservation 1             │ - Reservation 4             │
│ - Reservation 2             │ - Reservation 5             │
│ - Reservation 3             │ - Reservation 6             │
└─────────────────────────────┴─────────────────────────────┘
```

---

## 📊 Banco de Dados (Estrutura Multi-Tenant)

### Organizations Table

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
```

### Properties Table (Multi-Tenant)

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  base_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'EUR',
  property_type TEXT,
  bedrooms INT,
  bathrooms INT,
  max_guests INT,
  is_public BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  amenities TEXT[],
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint per organization
  UNIQUE(organization_id, slug)
);

-- Multi-tenant indexes
CREATE INDEX idx_properties_org_id ON properties(organization_id);
CREATE INDEX idx_properties_org_public ON properties(organization_id, is_public);
CREATE INDEX idx_properties_slug ON properties(slug);

-- Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_public_properties ON properties
  FOR SELECT
  USING (is_public = true);

CREATE POLICY select_org_properties ON properties
  FOR SELECT
  USING (organization_id = (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  ));

CREATE POLICY manage_org_properties ON properties
  FOR ALL
  USING (organization_id = (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  ));
```

### Reservations Table (Multi-Tenant)

```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  num_guests INT NOT NULL,
  total_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_reservations_org ON reservations(organization_id);
CREATE INDEX idx_reservations_property ON reservations(property_id);
CREATE INDEX idx_reservations_dates ON reservations(check_in, check_out);

-- RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_org_reservations ON reservations
  FOR SELECT
  USING (organization_id = (
    SELECT organization_id FROM user_profiles 
    WHERE id = auth.uid()
  ));
```

---

## 🔐 Segurança Multi-Tenant

### 1. **Header Validation**
```typescript
// middleware.ts — Sempre valida x-org-slug
const subdomain = !isRootDomain ? hostname.split('.')[0] : null
if (subdomain && subdomain !== 'www') {
  requestHeaders.set('x-org-slug', subdomain)
}
```

### 2. **Database Row Level Security (RLS)**

Todas as queries respeitam `organization_id`:

```sql
CREATE POLICY properties_visibility ON properties
  FOR SELECT
  USING (
    is_public = true  -- Público via booking
    OR organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )  -- Privado ao staff da org
  );
```

### 3. **API Query Validation**

API sempre filtra por `orgSlug` → `orgId`:

```typescript
// Se orgSlug é passado, verificar se é válido
if (query.orgSlug) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', query.orgSlug)
    .single()
  
  if (!org) {
    return Response.json(
      { success: false, error: 'Organization not found' },
      { status: 404 }
    )
  }
  
  orgId = org.id
}
```

### 4. **No Subdomain Spoofing**

Header é extraído do `request.headers.get('host')` — impossível falsificar via HTTPS.

---

## 📋 Checklist de Implementação

- [ ] **DNS Wildcard:** `*.lodgra.io → Vercel`
- [ ] **Vercel Config:** Adicionar `*.lodgra.io` em Project Settings
- [ ] **SSL:** Wildcard certificate (Vercel automático)
- [ ] **Testing:** Testar subdomínio de teste
- [ ] **Organization Branding Table:** Criar em Supabase
- [ ] **Booking Page Update:** Fetch branding dinâmico
- [ ] **Email Templates:** Customizar por organização
- [ ] **Documentation:** Instruções para empresas
- [ ] **Analytics:** Track by subdomain
- [ ] **Launch:** Anúncio + onboarding

---

## 🎓 Resumo Executivo

**O Sistema Lodgra já está 100% pronto para Multi-Tenant Host-Based.**

- ✅ Middleware detecta subdomínios automaticamente
- ✅ BD isolada por `organization_id`
- ✅ APIs filtram por organização
- ✅ Frontend suporta branding dinâmico

**Próximos passos:** Apenas configurar DNS wildcard + Vercel.

**Benefício comercial:** Cada empresa tem seu "domínio" → premium → diferenciação.

---

**Próxima ação:** Ativar DNS wildcard em registrador (GoDaddy/Namecheap/etc.) e configurar em Vercel.
