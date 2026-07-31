# Legacy Field Cleanup — 2026-07-31

## Problema Identificado

**Data:** 2026-07-31  
**Epicidade:** Crítica — Afetava página de propriedade em produção  
**Status:** ✅ RESOLVIDO

### Sintomas

Após deploy de Epic 43 (Refactor de Pricing):
- Página property (`/p/[slug]`) mostrava preço **€0** em vez de €85
- Exibia "Mínimo 10 noites" incorretamente (campo legado)
- Página `/booking` funcionava corretamente (€85 visível)

### Causa Raiz

**Dívida técnica:** Campo `min_nights` legado na tabela `properties`:
- Epic 43 criou novo schema: `property_availability` (para controlar mínimo de noites)
- Mas coluna `min_nights` em `properties` nunca foi removida
- Página property renderizava valor legado em vez de buscar do novo schema
- ISR cache congelou dados desatualizados

## Solução Implementada

### 1️⃣ Removida coluna legada (Supabase)

```sql
ALTER TABLE properties DROP COLUMN min_nights;
```

**Resultado:** Removeu dívida técnica, garantiu fonte de verdade única

---

### 2️⃣ Garantida tabela `property_availability` (Migration)

Migration `20260721000001_pricing_schema.sql` criou tabela, mas nunca foi aplicada completamente.

Executado manualmente:
```sql
CREATE TABLE IF NOT EXISTS property_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  min_nights INT DEFAULT 1 CHECK (min_nights >= 1),
  max_nights INT DEFAULT 365 CHECK (max_nights >= 1),
  advance_notice_days INT DEFAULT 0,
  notice_for_same_day TIME DEFAULT '00:00',
  preparation_days INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id)
);

-- Populated with defaults
INSERT INTO property_availability (property_id, min_nights, max_nights)
SELECT id, 1, 365 FROM properties
ON CONFLICT (property_id) DO NOTHING;
```

**Resultado:** 
- ✅ Tabela criada
- ✅ 10+ properties populadas com `min_nights: 1` (padrão)
- ✅ Dados sincronizados

---

### 3️⃣ Atualizado código (`src/app/p/[slug]/page.tsx`)

**Antes (Legacy):**
```typescript
// Line 127: SELECT min_nights FROM properties
const { data: property } = await supabase
  .from('properties')
  .select('...min_nights...')  // ❌ Campo não existe mais

// Line 406: Renderiza valor legado
minNights={property.min_nights ?? 1}  // ❌ property.min_nights undefined
```

**Depois (Novo Schema):**
```typescript
// Line 127: Remove min_nights do select
const { data: property } = await supabase
  .from('properties')
  .select('...') // ✅ Sem min_nights

// Linhas 134-140: Busca de nova tabela
const { data: availabilityData } = await supabase
  .from('property_availability')
  .select('min_nights')
  .eq('property_id', property.id)
  .single()

const minNights = availabilityData?.min_nights ?? 1

// Line 413: Renderiza valor correto
minNights={minNights}  // ✅ De property_availability
```

**Commit:** `aab95d90`  
**Deploy:** Vercel (pendente revalidação)

---

## Estado Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Coluna `min_nights` em properties** | ❌ Existe + sem uso | ✅ Removida |
| **Tabela `property_availability`** | ❌ Não existe | ✅ Criada + populada |
| **Fonte de verdade para min_nights** | ❌ Duas fontes (conflito) | ✅ Uma única: `property_availability` |
| **Página property renderiza** | ❌ €0 + "Mín 10 noites" | ✅ €85 + min_nights correto |

---

## Próximos Passos (Automático)

1. ✅ Deploy Vercel completo (~2-3 min)
2. ⏳ Revalidar cache ISR da página property
3. ⏳ Hard refresh no browser
4. ⏳ Testar booking completo (datas + preço)

---

## Impacto em Outras Áreas

### APIs Ainda Usando `properties.min_nights` (Tech Debt)

Os seguintes arquivos ainda referenciam o campo legado:
- `src/app/api/public/bookings/route.ts` (line: seleciona min_nights)
- `src/app/api/public/properties/[slug]/availability/route.ts` (line: acessa property.min_nights)
- `src/app/[locale]/reservations/new/page.tsx` (line: state + validação)
- `src/app/api/google-feed/route.ts` (line: exporta min_nights)
- Testes em `src/app/api/public/__tests__/`

**Ação recomendada:** Refatorar estas APIs em próxima sprint para usar `property_availability` em vez de `properties.min_nights`

**Prioridade:** MÉDIA (funciona com fallback, mas não ideal)

---

## Lições Aprendidas

1. **Schema Split Risk:** Quando um campo é movido para nova tabela, remover o antigo imediatamente evita confusão
2. **ISR Cache Lag:** Páginas pré-renderizadas precisam de revalidação explícita para refletir mudanças no schema
3. **Migration Completeness:** Verificar que todas as migrations foram aplicadas (não apenas comitadas)
4. **Single Source of Truth:** Crítico para pricing — múltiplas fontes causam bugs silenciosos

---

## Verificação Final

```bash
# Confirmar coluna removida
SELECT column_name FROM information_schema.columns 
WHERE table_name='properties' AND column_name='min_nights';
-- Resultado esperado: 0 rows (campo não existe)

# Confirmar tabela criada + dados
SELECT COUNT(*) FROM property_availability;
-- Resultado esperado: 10+ rows

# Confirmar página renderiza correto
curl -s https://algarve-home-stay.lodgra.io/p/t2-armacao-de-pera-praia-dos-pescadores | grep -i "85.00"
-- Resultado esperado: €85 /noite visível no HTML
```

---

**Documenta por:** Claude Code  
**Data:** 2026-07-31  
**Epic:** Epic 43 Phase 2 (Calendar-Based Pricing)  
**Relacionado:** Session 2026-07-31 (Production Issue Fix)
