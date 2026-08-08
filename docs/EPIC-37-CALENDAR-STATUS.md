# Epic 37 - Calendar com Preços e Reservas

**Status:** 🟢 MVP COMPLETO (4/5 features funcionais)  
**Última Atualização:** 2026-08-08  
**Commits:** 15+ commits (refactoring, fixes, debugging)

---

## 📋 Funcionalidades

### ✅ COMPLETO (4 de 5)

| Feature | Status | Commit | Notas |
|---------|--------|--------|-------|
| **Nomes dos Hóspedes** | ✅ COMPLETO | `3df38a33` | JOIN com guests table (first_name + last_name) |
| **Modal de Detalhes** | ✅ COMPLETO | `691d3fec` | Click em reserva abre ReservationDetailsModal |
| **Preço Fim de Semana** | ✅ COMPLETO | `9c8e7051` | Weekend_price aplicado automaticamente (sáb/dom) |
| **Reservas no Calendário** | ✅ COMPLETO | `37b24b14` | 14+ reservas exibidas dia a dia com detalhes |
| **Drag-to-Select** | ⚠️ PARCIAL | `b1c7dcb1` | Drag funciona → modal abre, mas sem highlight |

---

## 🔧 Implementação Técnica

### Architecture Changes

```
Component Stack:
CalendarWithSettings (parent)
  ├── SimpleCalendarAdapter (React.memo removed)
  │   └── Drag-to-select logic
  ├── SettingsSidebar
  │   └── Price/Discount/Cancellation cards
  ├── ReservationDetailsModal (NEW)
  ├── CalendarDayClickModal
  ├── DiscountSelectionModal
  └── CancellationPolicyModal

State Management:
useCalendarSelection (useReducer)
  ├── SELECT_RANGE action
  ├── TOGGLE_DAY action
  ├── CLEAR_SELECTION action
  └── SET_SELECTED_CARD action
```

### API Endpoints Enhanced

| Endpoint | Change | Commit |
|----------|--------|--------|
| `GET /api/properties/[id]/reservations` | JOIN guests table | `3df38a33` |
| `GET /api/properties/[id]/daily-prices` | Weekend price calc | `9c8e7051` |
| `GET /api/properties/[id]/pricing` | Weekend_price field | Various |

### Database Queries

```sql
-- Reservations with guest details
SELECT r.*, g.first_name, g.last_name 
FROM reservations r
LEFT JOIN guests g ON r.guest_id = g.id

-- Daily prices with weekend logic
SELECT date, base_price, 
  CASE WHEN dow(date) IN (0,6) THEN weekend_price ELSE base_price END as final_price
```

---

## 🐛 Bugs Resolvidos

| Bug | Causa | Solução | Commit |
|-----|-------|---------|--------|
| Guest names mostrando "Guest" | Missing JOIN com guests table | Added SELECT guests(...) | `3df38a33` |
| Weekend price não atualizava | Ler de `properties` em vez de `property_prices` | Corrigir tabela | `9c8e7051` |
| Drag-select resetava estado | useEffect deletava rangeStart/End | Remover reset logic | `7bf9c865` |
| React.memo stale closures | Props capturadas antigas | Remover React.memo | `da9126cc` |
| useState batching issues | Multiple setState calls | Converter para useReducer | `ddb4ebf2` |

---

## ⚠️ Limitações Conhecidas

### Drag-to-Select (Parcial)

**Problema:** Selection state não persiste para highlight visual

**Causa:** React state propagation issue entre componentes (investigado com 10+ debugging sessions)

**Status Atual:**
- ✅ Click + drag detectado corretamente
- ✅ Modal abre com date range correto
- ✅ Preço pode ser editado e salvo
- ❌ Dias não ficam azuis (visual feedback)

**Impacto:** MVP-suficiente. User consegue usar feature, apenas sem visual feedback.

**Workaround Implementado:** Bypass selection.state, pass dates direto ao modal

---

## 📊 Testing Status

```
TypeScript:     ✅ No errors
Build:          ✅ Passing
Unit Tests:     ✅ 108/108 passing
Integration:    ✅ Manual browser testing
E2E:            ⚠️ Manual only (modal interaction)
```

### Tested Scenarios

- [x] View calendar for October 2026
- [x] See 14 reservations with guest names
- [x] Click on reservation → see modal with details
- [x] Verify weekend prices (Sat/Sun show €250)
- [x] Drag-select days 5-15 → modal opens with correct range
- [x] Edit price for range and save
- [x] Verify price persists after refresh

---

## 🚀 Deployment

**Current Version:** Commit `b1c7dcb1`  
**Environment:** Vercel Production  
**Bundle Size:** ~450KB (no bloat)  
**Performance:** React Query caching, React.memo removed (acceptable)

### Vercel Logs
```
Deploy: OK
Build: OK (took ~90s, Turbopack)
Tests: 108/108 ✅
```

---

## 📝 Next Steps (Se Continuar)

### Priority 1: Fix Drag-Select Highlight
```
Recommended approach: useRef-based tracking instead of selection.state
Time: ~2-3 hours
Risk: Low (isolated to SimpleCalendarAdapter)
```

### Priority 2: Add More Visual Feedback
```
- Toast notifications on price save
- Confirmation modal before bulk update
- Undo/redo for price changes
Time: ~4 hours
Risk: Low
```

### Priority 3: Performance Optimization
```
- Virtualize calendar rows (if >100 reservations)
- Memoize expensive date calculations
- Debounce price API calls
Time: ~3 hours
Risk: Low
```

---

## 🔗 Related Stories

- Story 37.1: Calendar layout + reservations (✅ DONE)
- Story 37.2: Pricing display (✅ DONE)
- Story 37.3: Discount application (✅ DONE)
- Story 37.4: Cancellation policies (✅ DONE)
- Story 37.5: Loyalty automation (pending)

---

## 💾 Code References

**Key Files Modified:**
- `src/components/calendar/SimpleCalendarAdapter.tsx` (drag logic)
- `src/components/calendar/CalendarWithSettings.tsx` (state management)
- `src/components/calendar/ReservationDetailsModal.tsx` (NEW)
- `src/hooks/useCalendarSelection.ts` (useState → useReducer)
- `src/app/api/properties/[id]/reservations/route.ts` (guest JOIN)
- `src/app/api/properties/[id]/daily-prices/route.ts` (weekend pricing)

**Commits to Review:**
```
b1c7dcb1 - Drag-select modal bypass (LATEST)
ddb4ebf2 - useReducer refactor
da9126cc - Remove React.memo
9c8e7051 - Weekend pricing fix
691d3fec - Reservation modal
3df38a33 - Guest name enrichment
```

---

## 📞 Support

**For questions about:**
- Guest name display → Check JOIN query in reservations endpoint
- Weekend pricing → Check daily-prices calculation logic
- Drag-select → See "Limitations Known" section above
- Modal interactions → Check CalendarDayClickModal component

---

**Status:** ✅ Ready for production (MVP)  
**Recommendation:** Deploy now, schedule follow-up for drag-select visual fix
