# Migração de External IDs para Formato Estável

**Data**: 2026-07-09  
**Versão**: 1.0  
**Status**: Pronto para execução  

---

## 🔴 Problema Corrigido

Erro durante sincronização iCal:
```
Erro ao atualizar reserva ac52040b-0fa1-44d7-bc1b-32f84c54562b: 
Conflito de reserva detectado para estas datas
```

### Causa Raiz

1. **Reservas antigas** têm `external_id = "6816972454@booking.com"` (UID genérico)
2. **Novo sistema** busca por `external_id = "booking_6816972454"` (formato estável)
3. Sync **não encontra** a reserva existente (external_id não bate)
4. Tenta criar **NOVA reserva**
5. Conflito com a reserva antiga → **ERRO**

---

## ✅ Solução Implementada

### Conversão de Formatos

| Plataforma | Antes | Depois |
|-----------|-------|--------|
| **Booking.com** | `6816972454@booking.com` | `booking_6816972454` |
| **Airbnb** | `1234567890@airbnb.com` | `airbnb_1234567890` |
| **VRBO** | `vrbo_xxxxx@expedia.com` | `vrbo_xxxxx` |
| **Flatio** | `flatio_xxxxx@flatio.com` | `flatio_xxxxx` |

### Arquivos Adicionados

1. **Migration SQL**: `supabase/migrations/20260709000000_update_external_ids_to_stable_format.sql`
   - Atualiza todas as reservas antigas
   - Pode ser aplicada via Supabase CLI ou endpoint

2. **Admin Endpoint**: `POST /api/admin/migrate-external-ids`
   - Executa a migração programaticamente
   - Retorna estatísticas
   - Requer `ADMIN_SECRET`

---

## 🚀 Como Executar a Migração

### Opção 1: Via API (Recomendado)

```bash
curl -X POST https://www.lodgra.io/api/admin/migrate-external-ids \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json"
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "External IDs migrados com sucesso",
  "stats": {
    "total": 42,
    "booking": 25,
    "airbnb": 12,
    "vrbo": 4,
    "flatio": 1
  }
}
```

### Opção 2: Via Supabase CLI

```bash
# Fazer push das migrations
supabase db push

# Ou verificar status
supabase migration list
```

### Opção 3: SQL Direto (Emergency)

Se a API falhar, execute direto no Supabase SQL Editor:

```sql
-- Booking.com
UPDATE reservations
SET external_id = 'booking_' || SPLIT_PART(external_id, '@', 1)
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE '%@booking.com'
AND external_id IS NOT NULL;

-- Airbnb
UPDATE reservations
SET external_id = 'airbnb_' || SPLIT_PART(external_id, '@', 1)
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE '%@airbnb.com'
AND external_id IS NOT NULL;
```

---

## ✓ Verificação

Após executar a migração:

```sql
-- Verificar quantas foram convertidas
SELECT 
  COUNT(CASE WHEN external_id LIKE 'booking_%' THEN 1 END) as booking_count,
  COUNT(CASE WHEN external_id LIKE 'airbnb_%' THEN 1 END) as airbnb_count,
  COUNT(CASE WHEN external_id LIKE 'vrbo_%' THEN 1 END) as vrbo_count,
  COUNT(CASE WHEN external_id LIKE 'flatio_%' THEN 1 END) as flatio_count
FROM reservations
WHERE booking_source = 'ical_auto_sync';

-- Verificar se há ainda no formato antigo
SELECT COUNT(*) as old_format_count
FROM reservations
WHERE booking_source = 'ical_auto_sync'
AND external_id LIKE '%@%'
AND external_id IS NOT NULL;
```

---

## 📊 O Que Muda Depois

### Antes da Migração
```
Reserva 1:
  - external_id: "6816972454@booking.com"
  - Sync não encontra (busca por "booking_6816972454")
  - Tenta criar nova → conflito → ERRO ❌

Reserva 2:  
  - external_id: "1234567890@airbnb.com"
  - Mesma situação ❌
```

### Depois da Migração
```
Reserva 1:
  - external_id: "booking_6816972454"
  - Sync encontra corretamente
  - Atualiza os dados → SUCCESS ✅

Reserva 2:
  - external_id: "airbnb_1234567890"
  - Sync encontra e atualiza → SUCCESS ✅
```

---

## 🔧 Próximos Passos

1. ✅ Execute a migração acima
2. 🔄 Espere ~5 minutos
3. 🧪 Rode o sync-ical manualmente
4. ✓ Verifique que não há mais erros de conflito

```bash
# Trigger sync manualmente (se tiver acesso)
curl -X GET "https://www.lodgra.io/api/cron/sync-ical" \
  -H "Authorization: Bearer $CRON_SECRET"
```

4. 📊 Monitorar logs em produção
5. ✉️ Comunicar ao time que o problema foi resolvido

---

## 📝 Referências

- **Story**: 36.1 - Usar Identificador de Reserva da Plataforma
- **Commits**: 
  - `07a86bd` - fix: criar migration e endpoint
  - `35b7794` - refactor: eliminar débito técnico
  - `48c77a4` - fix: atualizar sync-ical

---

**Status**: Pronto para produção ✅  
**Risco**: Baixo (apenas UPDATE, sem DELETE)  
**Rollback**: Simples (revert da query UPDATE)
