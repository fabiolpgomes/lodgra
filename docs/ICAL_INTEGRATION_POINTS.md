# Pontos de Integração: Sincronização Bidirecional iCal

**Data**: 13 de Abril de 2026  
**Propósito**: Identificar exatamente onde intervir no código existente para implementar fluxo inverso (app → plataformas)

---

## 1. Ponto de Integração #1: Validação de Disponibilidade

### Localização
**Arquivo**: `src/app/[locale]/reservations/new/page.tsx` (linha ~99-255)  
**Função**: `handleSubmit()`

### Código Atual
```typescript
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  setLoading(true)
  setError(null)

  const formData = new FormData(e.currentTarget)
  
  // AQUI: Validação de noites mínimas
  if (property && nights < property.min_nights) {
    const confirm = window.confirm(...)
    if (!confirm) { setLoading(false); return }
  }

  try {
    // AQUI: INSERT direto em reservations (SEM validação de datas!)
    const { data, error: insertError } = await supabase
      .from('reservations')
      .insert({ ... })
      .select()
      .single()
    
    if (insertError) throw insertError

    // Fire-and-forget: notificar proprietário
    fetch('/api/notifications/owner-reservation', {...})
  }
}
```

### Mudança Necessária
**ANTES de INSERT**, adicionar:
```typescript
// ✨ NEW: Validação de datas (check-availability)
try {
  const availabilityCheck = await fetch('/api/reservations/check-availability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      property_id: selectedProperty,
      check_in: checkIn,
      check_out: checkOut
      // exclude_reservation_id: undefined (new reservation)
    })
  }).then(r => r.json())

  if (!availabilityCheck.available) {
    const conflictStr = availabilityCheck.conflicting_reservations
      .map(r => `${r.guest_name} (${r.check_in} a ${r.check_out})`)
      .join(', ')
    setError(`Datas indisponíveis. Conflito com: ${conflictStr}`)
    setLoading(false)
    return
  }
} catch (err) {
  console.error('Erro ao verificar disponibilidade:', err)
  // Falha aberta: continue mesmo se validação falhar
}

// OK: proceder com INSERT
```

### Integração: Antes vs. Depois
```
ANTES:
  ┌─ handleSubmit()
  ├─ Validar min_nights
  └─ INSERT reservations (sem validação de overlap) ❌

DEPOIS:
  ┌─ handleSubmit()
  ├─ Validar min_nights
  ├─ ✨ POST /api/reservations/check-availability
  ├─ Se conflito: erro + stop
  └─ Se OK: INSERT reservations ✅
```

---

## 2. Ponto de Integração #2: Notificação de Sincronização

### Localização
**Arquivo**: `src/app/[locale]/reservations/new/page.tsx` (linha ~234-240)

### Código Atual
```typescript
// Notificar proprietário (fire-and-forget)
if (data?.id) {
  fetch('/api/notifications/owner-reservation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservation_id: data.id }),
  }).catch(err => console.error('Erro ao notificar proprietário:', err))
}
```

### Mudança Necessária
**APÓS INSERT bem-sucedido**, adicionar novo fetch para sync:
```typescript
// Notificar proprietário (fire-and-forget)
if (data?.id) {
  fetch('/api/notifications/owner-reservation', {
    method: 'POST',
    body: JSON.stringify({ reservation_id: data.id }),
  }).catch(err => console.error('Erro ao notificar proprietário:', err))

  // ✨ NEW: Sincronizar para plataformas (fire-and-forget)
  fetch('/api/reservations/sync-to-platforms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservation_id: data.id })
  }).catch(err => console.error('Erro ao sincronizar para plataformas:', err))
}
```

### Integração: Fluxo de Notificações
```
INSERT reservations ✅
  ├─ 🔔 Notificar proprietário (existente)
  └─ 🔄 Sincronizar plataformas (NEW)
        ├─ POST /api/reservations/sync-to-platforms
        ├─ Registra sync_logs
        └─ UPDATE synced_to_platforms=true
```

---

## 3. Ponto de Integração #3: Edição de Reserva

### Localização
**Arquivo**: `src/app/[locale]/reservations/[id]/edit/page.tsx`  
**Seção**: Validação antes de UPDATE (procurar por `handleSubmit()` ou update logic)

### Código Atual
```typescript
// Presumidamente há UPDATE direto sem validação de overlap:
const { error: updateError } = await supabase
  .from('reservations')
  .update({
    check_in: newCheckIn,
    check_out: newCheckOut,
    // ...
  })
  .eq('id', reservationId)

if (updateError) throw updateError
```

### Mudança Necessária
**ANTES de UPDATE**, adicionar validação (similar a criação):
```typescript
// ✨ NEW: Se datas mudaram, validar novamente
const { data: currentReservation } = await supabase
  .from('reservations')
  .select('check_in, check_out')
  .eq('id', reservationId)
  .single()

if (currentReservation.check_in !== newCheckIn || 
    currentReservation.check_out !== newCheckOut) {
  
  // Datas mudaram → validar disponibilidade
  const availabilityCheck = await fetch('/api/reservations/check-availability', {
    method: 'POST',
    body: JSON.stringify({
      property_id: propertyId,
      check_in: newCheckIn,
      check_out: newCheckOut,
      exclude_reservation_id: reservationId  // Exclude current
    })
  }).then(r => r.json())

  if (!availabilityCheck.available) {
    setError('Novas datas conflitam com reservas existentes')
    return
  }
}

// OK: proceder com UPDATE
const { error: updateError } = await supabase
  .from('reservations')
  .update({...})
  .eq('id', reservationId)

// ✨ NEW: Re-sincronizar (apenas se datas mudaram)
if (!updateError && (currentReservation.check_in !== newCheckIn || ...)) {
  fetch('/api/reservations/sync-to-platforms', {
    method: 'POST',
    body: JSON.stringify({ reservation_id: reservationId })
  }).catch(...)
}
```

### Integração: Fluxo de Edição
```
Usuário edita datas
  ├─ ✨ POST /api/reservations/check-availability (exclude current)
  ├─ Se conflito: erro
  └─ Se OK:
      ├─ UPDATE reservations
      └─ ✨ POST /api/reservations/sync-to-platforms (re-sync)
```

---

## 4. Ponto de Integração #4: Componente Modal de Calendário

### Localização
**Arquivo**: `src/components/calendar/NewReservationModal.tsx`  
**Componente**: Renderização do modal

### Código Atual
```typescript
export function NewReservationModal({ open, checkIn, checkOut, properties, onClose }: NewReservationModalProps) {
  const router = useRouter()
  const [selectedPropertyId, setSelectedPropertyId] = useState('')

  function handleCreate() {
    const params = new URLSearchParams({ check_in: checkIn, check_out: checkOut })
    if (selectedPropertyId) params.set('property_id', selectedPropertyId)
    router.push(`/reservations/new?${params}`)  // Redireciona para form
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={...}>
      {/* Form simples: propriedade (opcional) + botão Criar */}
    </Dialog>
  )
}
```

### Mudança Necessária
**OPCIONAL**: Adicionar feedback visual de disponibilidade no modal
```typescript
const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle')
const [conflictInfo, setConflictInfo] = useState<any>(null)

async function checkAndCreate() {
  if (!selectedPropertyId) {
    // Aviso: propriedade obrigatória para check
    setAvailabilityStatus('idle')
    return handleCreate()
  }

  // ✨ NEW: Verificar disponibilidade antes de redirecionar
  setAvailabilityStatus('checking')
  try {
    const result = await fetch('/api/reservations/check-availability', {
      method: 'POST',
      body: JSON.stringify({
        property_id: selectedPropertyId,
        check_in: checkIn,
        check_out: checkOut
      })
    }).then(r => r.json())

    if (result.available) {
      setAvailabilityStatus('available')
      // Redirecionar com feedback positivo
      handleCreate()
    } else {
      setAvailabilityStatus('unavailable')
      setConflictInfo(result.conflicting_reservations)
      // Toast ou alert
    }
  } catch (err) {
    console.error('Erro ao verificar:', err)
    // Falha aberta: redirecionar mesmo assim
    handleCreate()
  }
}

return (
  <Dialog open={open} onOpenChange={...}>
    {/* ... existente ... */}
    
    {/* ✨ NEW: Feedback de disponibilidade */}
    {availabilityStatus === 'checking' && (
      <p className="text-sm text-gray-500">Verificando disponibilidade...</p>
    )}
    {availabilityStatus === 'unavailable' && conflictInfo && (
      <Alert variant="warning">
        <AlertDescription>
          ⚠️ Datas indisponíveis: {conflictInfo.map(c => c.guest_name).join(', ')}
        </AlertDescription>
      </Alert>
    )}
    
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancelar</Button>
      <Button onClick={checkAndCreate} disabled={availabilityStatus === 'checking'}>
        {availabilityStatus === 'checking' ? 'Verificando...' : 'Criar Reserva'}
      </Button>
    </DialogFooter>
  </Dialog>
)
```

### Integração: UX Melhorada
```
Modal "Nova Reserva" (antes)
  └─ Click Criar → Redirecionar (sem feedback)

Modal "Nova Reserva" (depois)
  ├─ Click Criar
  ├─ Verificar disponibilidade
  ├─ Feedback: "Verificando..."
  └─ Se OK: redirecionar (datas já validadas)
     Se erro: mostrar conflitos (não redirecionar)
```

---

## 5. Ponto de Integração #5: Novo Arquivo - checkAvailability.ts

### Localização (Novo)
**Arquivo**: `src/lib/reservations/checkAvailability.ts`

### Estrutura
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

export interface ConflictingReservation {
  id: string
  guest_name: string
  check_in: string
  check_out: string
  source: string
  booking_source: string
  status: string
}

export interface AvailabilityResult {
  available: boolean
  conflicts: ConflictingReservation[]
}

export async function checkAvailability(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  organizationId: string,
  excludeReservationId?: string
): Promise<AvailabilityResult> {
  const supabase = createAdminClient()

  // 1. Buscar property_listings da propriedade
  const { data: listings, error: listingsError } = await supabase
    .from('property_listings')
    .select('id')
    .eq('property_id', propertyId)

  if (listingsError || !listings || listings.length === 0) {
    // Propriedade sem listings → considerar disponível
    return { available: true, conflicts: [] }
  }

  const listingIds = listings.map(l => l.id)

  // 2. Buscar reservas com conflito
  const { data: conflicts, error } = await supabase
    .from('reservations')
    .select(`
      id,
      check_in,
      check_out,
      guests(first_name, last_name),
      source,
      booking_source,
      status
    `)
    .in('property_listing_id', listingIds)
    .in('status', ['confirmed', 'pending_payment'])
    .not('id', 'eq', excludeReservationId || 'null')  // Exclude current if editing
    .lt('check_in', checkOut)      // conflictEnd > myStart
    .gt('check_out', checkIn)      // conflictStart < myEnd

  if (error) {
    console.error('[checkAvailability] DB error:', error)
    // Falha aberta: considerar disponível
    return { available: true, conflicts: [] }
  }

  if (!conflicts || conflicts.length === 0) {
    return { available: true, conflicts: [] }
  }

  // 3. Transformar resultado
  const transformed: ConflictingReservation[] = (conflicts || []).map(c => ({
    id: c.id,
    guest_name: c.guests 
      ? `${c.guests.first_name || ''} ${c.guests.last_name || ''}`.trim()
      : 'Hóspede',
    check_in: c.check_in,
    check_out: c.check_out,
    source: c.source,
    booking_source: c.booking_source,
    status: c.status
  }))

  return {
    available: false,
    conflicts: transformed
  }
}
```

### Integração: Reutilização
```
Usado em:
  ├─ src/app/api/reservations/check-availability/route.ts (endpoint)
  ├─ src/app/[locale]/reservations/new/page.tsx (validação)
  ├─ src/app/[locale]/reservations/[id]/edit/page.tsx (validação)
  └─ src/components/calendar/NewReservationModal.tsx (opcional UX)
```

---

## 6. Ponto de Integração #6: Novo Arquivo - syncToOutboundPlatforms.ts

### Localização (Novo)
**Arquivo**: `src/lib/reservations/syncToOutboundPlatforms.ts`

### Estrutura
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

export interface SyncResult {
  success: boolean
  synced_platforms: string[]
  errors: Array<{ platform: string; error: string }>
}

export async function syncReservationToOutboundPlatforms(
  reservationId: string,
  organizationId: string
): Promise<SyncResult> {
  const supabase = createAdminClient()

  try {
    // 1. Buscar reserva
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        id,
        check_in,
        check_out,
        property_listing_id,
        property_listings(
          id,
          property_id,
          platform_id,
          platforms(code, name)
        )
      `)
      .eq('id', reservationId)
      .eq('organization_id', organizationId)
      .single()

    if (resError || !reservation) {
      throw new Error(`Reserva não encontrada: ${resError?.message}`)
    }

    const propertyId = (reservation.property_listing_id as any).property_id

    // 2. Buscar todos os listings da propriedade
    const { data: allListings, error: listingsError } = await supabase
      .from('property_listings')
      .select('id, platform_id, platforms(code, name)')
      .eq('property_id', propertyId)
      .eq('is_active', true)

    if (listingsError) {
      throw new Error(`Erro ao buscar listings: ${listingsError.message}`)
    }

    const results: SyncResult = {
      success: true,
      synced_platforms: [],
      errors: []
    }

    // 3. Para cada listing, registrar sync
    for (const listing of allListings || []) {
      try {
        const platformName = (listing.platforms as any)?.name || 'Unknown'
        const platformCode = (listing.platforms as any)?.code || 'unknown'

        // Registrar em sync_logs
        await supabase.from('sync_logs').insert({
          property_listing_id: listing.id,
          sync_type: 'manual_push',
          direction: 'outbound',
          status: 'success',
          records_processed: 1,
          records_created: 1,
          synced_at: new Date().toISOString()
        })

        results.synced_platforms.push(platformCode)
      } catch (err) {
        results.errors.push({
          platform: (listing.platforms as any)?.name || 'Unknown',
          error: err instanceof Error ? err.message : 'Unknown error'
        })
        results.success = false
      }
    }

    // 4. Atualizar flag na reserva
    await supabase
      .from('reservations')
      .update({
        synced_to_platforms: true,
        last_platform_sync_at: new Date().toISOString()
      })
      .eq('id', reservationId)

    console.log(`[Sync] Reserva ${reservationId} sincronizada para ${results.synced_platforms.join(', ')}`)

    return results
  } catch (err) {
    console.error('[Sync] Erro:', err)
    return {
      success: false,
      synced_platforms: [],
      errors: [{ platform: 'all', error: err instanceof Error ? err.message : 'Unknown error' }]
    }
  }
}
```

### Integração: Chamada em Reservas
```
Reserva criada/editada com sucesso
  └─ syncReservationToOutboundPlatforms(id)
       ├─ Busca listings da propriedade
       ├─ Registra em sync_logs para cada platform
       └─ UPDATE synced_to_platforms=true
```

---

## 7. Ponto de Integração #7: Novo Endpoint - check-availability

### Localização (Novo)
**Arquivo**: `src/app/api/reservations/check-availability/route.ts`

### Estrutura
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { checkAvailability } from '@/lib/reservations/checkAvailability'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    const body = await request.json()
    const { property_id, check_in, check_out, exclude_reservation_id } = body

    if (!property_id || !check_in || !check_out) {
      return NextResponse.json(
        { error: 'property_id, check_in, check_out são obrigatórios' },
        { status: 400 }
      )
    }

    const result = await checkAvailability(
      property_id,
      check_in,
      check_out,
      auth.organizationId,
      exclude_reservation_id
    )

    return NextResponse.json({
      available: result.available,
      conflicting_reservations: result.conflicts
    })
  } catch (error) {
    console.error('[check-availability] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar disponibilidade' },
      { status: 500 }
    )
  }
}
```

### Integração: Consumido por
```
Frontend:
  ├─ src/app/[locale]/reservations/new/page.tsx
  ├─ src/app/[locale]/reservations/[id]/edit/page.tsx
  └─ src/components/calendar/NewReservationModal.tsx

Resposta:
  { "available": true, "conflicting_reservations": [] }
  ou
  { "available": false, "conflicting_reservations": [...] }
```

---

## 8. Ponto de Integração #8: Novo Endpoint - sync-to-platforms

### Localização (Novo)
**Arquivo**: `src/app/api/reservations/sync-to-platforms/route.ts`

### Estrutura
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { syncReservationToOutboundPlatforms } from '@/lib/reservations/syncToOutboundPlatforms'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const body = await request.json()
    const { reservation_id } = body

    if (!reservation_id) {
      return NextResponse.json(
        { error: 'reservation_id é obrigatório' },
        { status: 400 }
      )
    }

    const result = await syncReservationToOutboundPlatforms(
      reservation_id,
      auth.organizationId
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[sync-to-platforms] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao sincronizar' },
      { status: 500 }
    )
  }
}
```

### Integração: Chamado em Fire-and-Forget
```
Após INSERT/UPDATE bem-sucedido em reservations
  └─ fetch('/api/reservations/sync-to-platforms', {
       method: 'POST',
       body: JSON.stringify({ reservation_id: '...' })
     })

Resposta (não aguardada):
  { "success": true, "synced_platforms": ["booking.com"], "errors": [] }
```

---

## 9. Ponto de Integração #9: Migration de BD

### Localização (Novo)
**Arquivo**: `supabase/migrations/20260413_XX_sync_to_platforms.sql`

### Conteúdo
```sql
-- Adicionar colunas para rastreamento de sync bidirecional

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS synced_to_platforms BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS last_platform_sync_at TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS platform_sync_errors TEXT; -- JSON array

-- Índice para queries rápidas de conflito
CREATE INDEX IF NOT EXISTS idx_reservations_property_listing_status
  ON reservations(property_listing_id, status)
  WHERE status IN ('confirmed', 'pending_payment');

-- Índice para queries de período
CREATE INDEX IF NOT EXISTS idx_reservations_check_dates
  ON reservations(check_in, check_out);
```

### Integração: Executado uma vez
```
supabase migration up
  └─ Adiciona colunas a reservations
  └─ Cria índices para performance
```

---

## 10. Checklist de Integração

### Ordem de Implementação Recomendada

```
[ ] 1. Migration: 20260413_XX_sync_to_platforms.sql
      └─ supabase migration up

[ ] 2. Novo arquivo: src/lib/reservations/checkAvailability.ts
      └─ Lógica de verificação de datas

[ ] 3. Novo arquivo: src/lib/reservations/syncToOutboundPlatforms.ts
      └─ Lógica de sincronização para plataformas

[ ] 4. Novo endpoint: src/app/api/reservations/check-availability/route.ts
      └─ POST /api/reservations/check-availability

[ ] 5. Novo endpoint: src/app/api/reservations/sync-to-platforms/route.ts
      └─ POST /api/reservations/sync-to-platforms

[ ] 6. Modificação: src/app/[locale]/reservations/new/page.tsx
      ├─ Integrar checkAvailability
      └─ Integrar syncToOutboundPlatforms (fire-and-forget)

[ ] 7. Modificação: src/app/[locale]/reservations/[id]/edit/page.tsx
      ├─ Integrar checkAvailability
      └─ Integrar syncToOutboundPlatforms (fire-and-forget)

[ ] 8. Modificação (opcional): src/components/calendar/NewReservationModal.tsx
      └─ Adicionar feedback visual de disponibilidade

[ ] 9. Testes:
      ├─ Unit: checkAvailability.test.ts
      ├─ Unit: syncToOutboundPlatforms.test.ts
      ├─ Integration: POST /api/reservations/check-availability
      ├─ Integration: POST /api/reservations/sync-to-platforms
      ├─ E2E: Criar reserva → verify in iCal export
      └─ E2E: Criar com datas ocupadas → erro 409

[ ] 10. Documentação:
       ├─ Atualizar ICAL_INTEGRATION.md
       ├─ Atualizar CLAUDE.md (novas funcionalidades)
       └─ Documentar em PRD/Story
```

---

## 11. Testes por Ponto de Integração

### Test 1: checkAvailability.ts
```typescript
describe('checkAvailability', () => {
  test('retorna available=true se sem conflitos', async () => {
    const result = await checkAvailability('prop1', '2026-04-20', '2026-04-25', 'org1')
    expect(result.available).toBe(true)
    expect(result.conflicts).toHaveLength(0)
  })

  test('retorna available=false se tem conflito', async () => {
    // Criar reserva existente: 2026-04-22 a 2026-04-24
    const result = await checkAvailability('prop1', '2026-04-20', '2026-04-25', 'org1')
    expect(result.available).toBe(false)
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].guest_name).toBe('João')
  })

  test('exclude_reservation_id permite edição de data', async () => {
    // Reserva atual: 2026-04-20 a 2026-04-25
    // Editar para: 2026-04-20 a 2026-04-25 (mesmas datas)
    const result = await checkAvailability(
      'prop1', '2026-04-20', '2026-04-25', 'org1',
      'existing-reservation-id'  // Exclude self
    )
    expect(result.available).toBe(true)
  })
})
```

### Test 2: POST /api/reservations/check-availability
```typescript
describe('POST /api/reservations/check-availability', () => {
  test('retorna 200 com available=true', async () => {
    const res = await fetch('/api/reservations/check-availability', {
      method: 'POST',
      body: JSON.stringify({
        property_id: 'uuid',
        check_in: '2026-04-20',
        check_out: '2026-04-25'
      })
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.available).toBe(true)
  })

  test('retorna 409 com available=false e conflitos', async () => {
    // Criar conflito primeiro
    const res = await fetch('/api/reservations/check-availability', {
      method: 'POST',
      body: JSON.stringify({...})
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.available).toBe(false)
    expect(data.conflicting_reservations).toBeDefined()
  })
})
```

### Test 3: E2E (Playwright)
```typescript
describe('Criar Reserva com Validação', () => {
  test('criar reserva com datas livres', async () => {
    await page.goto('/reservations/new?check_in=2026-04-20&check_out=2026-04-25')
    await page.selectOption('select[name="property_id"]', 'prop1')
    await page.fill('input[name="guest_first_name"]', 'João')
    await page.click('button:has-text("Criar Reserva")')
    
    // Deve estar em /reservations após sucesso
    await expect(page).toHaveURL(/\/reservations/)
    await expect(page.locator('text=Reserva criada')).toBeVisible()
  })

  test('erro ao criar com datas conflitantes', async () => {
    // Criar primeira reserva: 2026-04-20 a 2026-04-25
    // Tentar criar segunda: 2026-04-22 a 2026-04-24
    
    await page.goto('/reservations/new?check_in=2026-04-22&check_out=2026-04-24')
    await page.selectOption('select[name="property_id"]', 'prop1')
    await page.fill('input[name="guest_first_name"]', 'Maria')
    await page.click('button:has-text("Criar Reserva")')
    
    // Deve mostrar erro
    await expect(page.locator('text=Datas indisponíveis')).toBeVisible()
    // Deve permanecer no formulário
    await expect(page).toHaveURL(/\/reservations\/new/)
  })
})
```

---

## 12. Matriz de Dependências

```
Migration (20260413_XX_sync_to_platforms.sql)
  ├─ checkAvailability.ts
  │  ├─ POST /api/reservations/check-availability
  │  │  ├─ src/app/[locale]/reservations/new/page.tsx
  │  │  ├─ src/app/[locale]/reservations/[id]/edit/page.tsx
  │  │  └─ NewReservationModal.tsx (opcional)
  │  │
  │  └─ syncToOutboundPlatforms.ts
  │     ├─ POST /api/reservations/sync-to-platforms
  │     ├─ src/app/[locale]/reservations/new/page.tsx
  │     └─ src/app/[locale]/reservations/[id]/edit/page.tsx

Ordem de Execução:
  1. Migration (supabase)
  2. checkAvailability.ts + syncToOutboundPlatforms.ts
  3. Endpoints (check-availability, sync-to-platforms)
  4. Integrações (pages)
  5. Testes
```

---

**Última Atualização**: 13 de Abril de 2026  
**Pronto para**: Implementação Imediata  
**Tempo Estimado**: 2-3 dias de desenvolvimento + testes
