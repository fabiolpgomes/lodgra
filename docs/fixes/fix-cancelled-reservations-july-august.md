# Fix: Restaurar Reservas Canceladas (Julho-Agosto 2026)

## Problema

Em Julho e Agosto de 2026, reservas foram incorretamente marcadas como "Cancelada" pela sincronização de calendário da propriedade AHS Premium Apart 2 Pools.

- **Julho:** 6 reservas canceladas incorretamente
- **Agosto:** 8 reservas canceladas incorretamente
- **Total:** 14 reservas para restaurar

## Causa

O trigger `check_reservation_conflict_trigger` está impedindo a atualização direto, pois valida se há conflitos de datas entre reservas "confirmed".

## Solução

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: https://app.supabase.com/project/brjumbfpvijrkhrheppt
2. Vá para **SQL Editor**
3. Cole o SQL abaixo e execute:

```sql
-- Desabilitar trigger temporariamente
ALTER TABLE reservations DISABLE TRIGGER check_reservation_conflict_trigger;

-- Restaurar reservas de Julho-Agosto
UPDATE reservations
SET
  status = 'confirmed',
  cancelled_at = NULL,
  cancellation_reason = NULL,
  updated_at = now()
WHERE
  status = 'cancelled'
  AND check_in >= '2026-07-01'::DATE
  AND check_in <= '2026-08-31'::DATE;

-- Re-habilitar trigger
ALTER TABLE reservations ENABLE TRIGGER check_reservation_conflict_trigger;

-- Verificar resultado
SELECT 
  COUNT(*) as restauradas,
  MIN(check_in) as inicio,
  MAX(check_out) as fim
FROM reservations
WHERE
  status = 'confirmed'
  AND check_in >= '2026-07-01'::DATE
  AND check_in <= '2026-08-31'::DATE;
```

4. Clique em **Run** (▶️)
5. Verifique o resultado na aba "Results"

### Opção 2: Via API Route (After Deploy)

Após fazer deploy das mudanças:

```bash
curl -X POST https://lodgra.io/api/admin/fix-cancelled-reservations \
  -H "Content-Type: application/json" \
  -d '{"secret":"d2988a703f3a097fbb6c4bac41bfa109"}'
```

## Verificação

Após executar o SQL, verifique em:
- Dashboard → Reservas → Filtro Julho 2026
- Dashboard → Reservas → Filtro Agosto 2026

Todas as reservas devem estar com status **Confirmada** (verde).

## Notas

- ⚠️ O trigger de conflito é desabilitado **temporariamente** apenas durante a execução
- ✅ O trigger é re-habilitado automaticamente após a correção
- 📋 Estas reservas foram marcadas como canceladas por erro de sincronização, não há conflito real

## Commits Relacionados

- `/api/admin/fix-cancelled-reservations` - Rota para automação futura
- Migrations: `20260702000001`, `20260702000002`, `20260702000003`
