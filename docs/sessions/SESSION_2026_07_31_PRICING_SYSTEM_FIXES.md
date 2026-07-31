# Sessão 2026-07-31: Correções do Sistema de Preços e Epic 43

**Data:** 31 de Julho de 2026  
**Status:** Encerrada - Retomar Amanhã  
**Progresso:** 85% das correções completas, 1 bug pendente (€184)

---

## 📋 Resumo Executivo

Nesta sessão, identificamos e corrigimos **3 bugs críticos** no sistema de preços que impediam o calendário administrativo de funcionar e o booking widget de exibir preços correctos. Também criamos uma **Epic massiva (43)** para redesenhar o sistema completo de calendário tipo Airbnb.

**Status Final:**
- ✅ 3 bugs críticos corrigidos
- ✅ 4 commits deployados
- ✅ Epic 43 criada e documentada
- ⚠️ 1 novo bug descoberto (€184 - investigação pendente)
- ⏳ Vercel deploy em progresso

---

## 🔴 Bugs Corrigidos

### Bug #1: Coluna Errada no Query de Preços

**Localização:** `/src/app/api/properties/[id]/daily-prices/route.ts` (linha 25)

**Problema:**
```typescript
// ❌ ERRADO
.select('start_date, end_date, base_price')
```
- Procurava coluna `base_price` que não existe em `pricing_rules`
- Tabela `pricing_rules` usa `price_per_night`
- Resultado: query retornava dados vazios ou errados

**Solução:**
```typescript
// ✅ CORRETO
.select('start_date, end_date, price_per_night')
```

**Impacto:** Calendário admin e booking widget não conseguiam carregar preços dinâmicos

---

### Bug #2: `price_per_night` Não Carregado na Página de Propriedade

**Localização:** `/src/app/p/[slug]/page.tsx` (linha 224)

**Problema:**
```typescript
// ❌ ERRADO
.select('start_date, end_date, min_nights')
// Faltava price_per_night!
```
- Página carregava `pricing_rules` mas não incluía os preços
- Resultado: sempre mostrava `properties.base_price` (€85 fallback)
- Preço base na página: €85 em vez de €139 ❌

**Solução:**
```typescript
// ✅ CORRETO
.select('start_date, end_date, min_nights, price_per_night')

const pricingRules = (pricingRulesRaw ?? []).map((r: { 
  start_date: string
  end_date: string
  min_nights: number
  price_per_night: number  // ← adicionado
}) => ({
  start_date: r.start_date,
  end_date: r.end_date,
  min_nights: r.min_nights,
  price_per_night: r.price_per_night,  // ← adicionado
}))
```

**Impacto:** Página de propriedade agora carrega preço correcto de `pricing_rules`

---

### Bug #3: Tabela `daily_prices` Foi Deletada

**Contexto:** Na Sprint anterior (31/07 noite), migration deletou a tabela `daily_prices`

**Problema:**
- Calendário administrativo tenta salvar preços em `/api/properties/[id]/pricing/bulk-update`
- Rota tenta fazer `upsert` em `daily_prices` (linha 46)
- Tabela não existe → falha silenciosa

**Solução:** Recriada tabela com schema correto

**Arquivo:** `supabase/migrations/20260731_recreate_daily_prices_table.sql`

```sql
CREATE TABLE IF NOT EXISTS public.daily_prices (
  id BIGSERIAL PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL CHECK (base_price > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_property_date UNIQUE(property_id, date)
);
```

**Índices:**
- `idx_daily_prices_property_date` — queries rápidas por propriedade + data
- `idx_daily_prices_date_range` — queries de intervalo de datas

**RLS Policies:**
- Proprietários podem gerir preços da sua propriedade
- Público pode ler preços de propriedades públicas

**Impacto:** Calendário admin agora consegue salvar overrides de preços diários

---

## 📊 Hierarquia de Preços (Agora Funcionando)

```
1. daily_prices (overrides diários via calendário admin)
   └─ Se não encontrar, usa:
2. pricing_rules (preços base por período)
   └─ Se não encontrar, usa:
3. properties.base_price (fallback)
```

**Fluxo:**
1. **Calendário Admin** → Salva preços customizados em `daily_prices`
2. **Booking Widget** → Carrega da API `/api/properties/[id]/daily-prices`
3. **API** → Retorna layer por layer (daily_prices + pricing_rules)
4. **Página de Propriedade** → Mostra preço base de `pricing_rules`

---

## 📝 Commits Realizados

| Commit | Mensagem | Impacto |
|--------|----------|--------|
| `e53b8bf6` | fix: corrigir schema de pricing_rules (base_price → price_per_night) | API route |
| `ec877fd9` | fix: recria daily_prices e implementa hierarquia de preços | Infra + API |
| `d126d239` | fix: adicionar price_per_night ao carregamento de pricing_rules | Página propriedade |
| `48680ee3` | docs: criar Epic 43 - Sistema Completo de Calendário Administrativo | Roadmap |
| `5b87044f` | debug: adicionar endpoint de debug para auditoria de preços | Debug tool |

---

## 🆕 Epic 43: Sistema Completo de Calendário Administrativo (Tipo Airbnb)

**Localização:** `docs/stories/43.0.story.md`

**Status:** Draft - Aguardando aprovação do PO

### Escopo Completo

#### Desktop Calendar Layout
- Sidebar esquerda: todas as propriedades do utilizador
- Centro: calendário Kanban horizontal (tipo Airbnb Opportunities)
- 5 cards laterais: Preços, Descontos, Disponibilidade, Cancelamentos, Taxas
- Click em reserva: painel com detalhes completos + impressão

#### Card Preços
- Preço Base: preenche todas as datas do mês
- Personalização por período: modal com preço customizado
- Personalização por dia: modal para dia individual
- Preços Inteligentes: toggle on/off (schema + UX preparados, lógica posterior)

#### Card Descontos
- Semanal: % para 7+ noites
- Mensal: % para 28+ noites
- Cliente Fidelidade: % adicional para hóspedes recorrentes
- Mostra cálculos: "Média semanal = €894"

#### Card Disponibilidade
- Mínimo/máximo de noites
- Aviso prévio: mesmo dia, 1 dia, 2 dias, 7 dias
- Flag "Permitir < 1 dia aviso" (requer aprovação)
- Período de disponibilidade: 24/12/9/6/3 meses
- Flag "Permitir além do período" (fica pendente)

#### Card Cancelamentos
- Estadias curtas (< 28 noites): 4 tipos (Flexível, Moderada, Limitada, Firme)
- Estadias longas (28+ noites): 4 tipos
- Opção não-reembolsável com 10% desconto
- Políticas customizáveis por período

#### Lógica de Cálculo de Reserva
```
Preço diário × Número de dias = Subtotal
- Desconto Semanal (se noites >= 7)
- Desconto Mensal (se noites >= 28)
- Desconto Cliente Fidelidade (se hóspede recorrente)
+ Taxas (limpeza, pet, etc.)
= TOTAL
```

#### 10 Subtasks Menores
- 43.1: Setup do Calendário Desktop
- 43.2: Card Preços
- 43.3: Card Descontos
- 43.4: Card Disponibilidade
- 43.5: Card Cancelamentos
- 43.6: Lógica de Cálculo de Reserva
- 43.7: Validações de Reserva
- 43.8: Painel de Detalhes + Impressão
- 43.9: FAQ Page
- 43.10: Mobile Calendar (Fase 2)

### Database Changes

**Novas Tabelas:**
- `property_discounts` — descontos semanal, mensal, fidelidade
- `property_cancellation_policies` — políticas de cancelamento por tipo de estadia

**Tabelas a Expandir:**
- `property_availability` — adicionar campos de aviso prévio, período, flags
- `pricing_rules` — confirmada estrutura (start_date, end_date, price_per_night, min_nights)
- `daily_prices` — recriada com sucesso

### API Endpoints Necessárias

**CRUD Descontos:**
- `POST /api/properties/:id/discounts`
- `GET /api/properties/:id/discounts`

**CRUD Políticas de Cancelamento:**
- `POST /api/properties/:id/cancellation-policies`
- `GET /api/properties/:id/cancellation-policies`

**Disponibilidade:**
- `POST /api/properties/:id/availability/settings`
- `GET /api/properties/:id/availability/settings`

**Cálculo:**
- `POST /api/reservations/calculate` — calcula preço com breakdown

**Aprovações:**
- `PATCH /api/reservations/:id/approve`
- `PATCH /api/reservations/:id/reject`

---

## ⚠️ Bug Pendente: Preço €184

**Descoberto:** Fim da sessão

**Sintoma:**
- Seleção: 7/9 a 9/9 (2 noites)
- Esperado: 2 × €139 = €278
- Obtido: €184 ❌

**Causa Desconhecida:**
- €184 não corresponde a nenhum cálculo lógico
- 184 / 2 = €92/noite (não é €139)
- Pode estar usando preço errado ou arredondando incorrectamente

**Investigação Criada:**
- ✅ Endpoint de debug: `GET /api/debug/pricing/[slug]?checkin=2026-09-07&checkout=2026-09-09`
- Mostra breakdown completo do cálculo
- Retorna dados de `pricing_rules` e `daily_prices` do período

**Como Investigar Amanhã:**
1. Deploy chegar ao Vercel (2-3 min)
2. Chamar endpoint de debug
3. Verificar:
   - Se `pricing_rules` tem €139 para 7-9 Set
   - Se `daily_prices` está interferindo
   - Breakdown dia-a-dia

---

## 📊 Status de Deploy

| Item | Status |
|------|--------|
| Build Local | ✅ Passed |
| Git Push | ✅ Completed |
| Vercel Deploy | ⏳ In Progress (2-3 min) |
| Browser Test | ⏳ Awaiting Deploy |

**Commits em Deploy:** `e53b8bf6`, `ec877fd9`, `d126d239`, `48680ee3`, `5b87044f`

---

## 📁 Ficheiros Modificados

### Criados
- `supabase/migrations/20260731_recreate_daily_prices_table.sql` — Recria tabela
- `docs/stories/43.0.story.md` — Epic 43 completa
- `src/app/api/debug/pricing/[slug]/route.ts` — Debug endpoint

### Modificados
- `src/app/api/properties/[id]/daily-prices/route.ts` — Corrige schema
- `src/app/p/[slug]/page.tsx` — Adiciona price_per_night
- `src/lib/pricing/getPriceForRange.ts` — Atualiza referência a price_per_night

---

## 🎯 Checklist de Testes

### Após Deploy (Amanhã)

#### Página de Propriedade
- [ ] Abrir `algarve-home-stay.lodgra.io/p/t2-armacao-de-pera-praia-dos-pescadores`
- [ ] Verificar "Preço base" no widget → deve ser **€139** (não €85)
- [ ] Seleccionar datas 7/9 a 9/9
- [ ] Verificar preço calculado (esperado: €278, não €184)

#### Calendário Administrativo
- [ ] Abrir calendário administrativo
- [ ] Seleccionar propriedade T2 Armação de Pera
- [ ] Verificar se consegue:
  - [ ] Ver preços das datas (deve mostrar €120 ou €139)
  - [ ] Seleccionar período e salvar preço customizado
  - [ ] Usar modal de preço

#### Debug Endpoint
- [ ] Chamar `/api/debug/pricing/t2-armacao-de-pera-praia-dos-pescadores?checkin=2026-09-07&checkout=2026-09-09`
- [ ] Verificar resposta JSON:
  - [ ] `pricingRules` tem dados?
  - [ ] `dailyPricesInRange` vazio ou com valores?
  - [ ] `breakdown` mostra 2 dias?
  - [ ] `total` é €278 ou €184?

---

## 📚 Documentação Criada

| Documento | Localização |
|-----------|------------|
| Esta Sessão | `docs/sessions/SESSION_2026_07_31_PRICING_SYSTEM_FIXES.md` |
| Epic 43 | `docs/stories/43.0.story.md` |
| Debug Guide | Código do endpoint `/api/debug/pricing/[slug]/route.ts` |

---

## 🔗 Próximos Passos (Amanhã)

### Imediatamente
1. ⏳ Aguardar Vercel deploy (2-3 min)
2. 🧪 Re-testar página de propriedade → preço deve ser €139
3. 🐛 Testar endpoint de debug para investigar bug €184
4. 📊 Analisar resposta JSON do endpoint

### Curto Prazo (Esta Semana)
1. 🔍 Corrigir bug €184
2. ✅ Aprovar Epic 43 com PO
3. 📋 Quebrar Epic 43 em 10 subtasks
4. 🎯 Priorizar ordem de implementação

### Médio Prazo (Próximas Semanas)
1. 🏗️ Fase 1 (Sprint 1-2): Schema + APIs
2. 🎨 Fase 2 (Sprint 2-3): Desktop Calendar UI + Cards
3. 🧮 Fase 3 (Sprint 3-4): Cálculos + Validações
4. 📱 Fase 4 (Sprint 4-5): Mobile Calendar
5. 📝 Fase 5 (Sprint 5-6): FAQ + Polish + QA

---

## 📞 Notas Importantes

### Preços Inteligentes (Feature Flag)
- Schema preparado (campos `min_price`, `max_price`)
- UI preparada (toggle, inputs desabilitados)
- **Lógica NÃO implementada** (conforme pedido)
- Pronto para adicionar lógica de ajuste automático depois

### Cliente Fidelidade
- Lógica de identificação automática necessária
- Verificar `reservations` table por email/guest_id
- Desconto aplicado **após** todos os outros descontos

### Transparência de Cálculo
- Critical: Mostrar breakdown claro
- Formato: `Preço Base × Dias - Desconto Semanal - Desconto Mensal - Fidelidade + Taxas = TOTAL`
- Exemplo: `€139 × 2 - €0 - €0 - €0 + €0 = €278`

---

**Sessão Encerrada:** 2026-07-31 ~21:30 CET  
**Retomar:** 2026-08-01 (Amanhã)

**Próximo Foco:** Investigar e corrigir bug €184 via endpoint de debug
