# EPIC 37: Calendar Pricing & Availability Management

**Status:** Core Delivery Complete / Optional Follow-Up Remains
**Epic Owner:** @aios-master  
**Stories:** 5 (37.1–37.5)  
**Estimated Timeline:** 2–3 weeks  
**Priority:** P1 (Blocks deployment)

---

## 📋 Overview

Complete implementation of property pricing, discounts, availability, and cancellation policies. This epic makes the Calendar Settings fully functional end-to-end, from configuration to reservation calculation to refund processing with Stripe.

**Model:** Airbnb-validated (exactly replicated)

---

## 🎯 Acceptance Criteria (EPIC Level)

- [ ] All 4 Settings Cards (Preços, Descontos, Disponibilidade, Cancelamentos) are fully functional
- [ ] Settings data persists to database (not hardcoded)
- [ ] Pricing rules apply to calendar display
- [ ] Reservation creation respects availability rules
- [ ] Cancellation policy is applied to reservation on creation
- [ ] Refund calculation is automated (no manual entry)
- [ ] Stripe refund is processed automatically when cancellation occurs
- [ ] Mobile + Desktop UX works seamlessly
- [ ] All tests pass (unit + integration + e2e)

---

## 📊 Design Reference

**Desktop Layout:** 4 cards side-by-side on right sidebar  
**Mobile Layout:** Tab-based interface (Preços | Descontos | Disponibilidade | Cancelamentos)  
**Source:** Airbnb host dashboard (screenshots in `/docs/stories/EPIC-37-screenshots/`)

---

## 🏗️ Architecture Overview

### Database Schema Changes

#### New Table: `property_cancellation_policies`
```sql
CREATE TABLE property_cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Policy metadata
  policy_type TEXT NOT NULL CHECK (policy_type IN ('flexible', 'moderate', 'limited', 'firm', 'rigid')),
  is_long_stay BOOLEAN NOT NULL,  -- true = 28+ nights, false = <28 nights
  non_refundable_discount_percent INT DEFAULT 0 CHECK (non_refundable_discount_percent >= 0 AND non_refundable_discount_percent <= 100),
  
  -- Refund periods & percentages
  full_refund_days INT NOT NULL,  -- Days before check-in for 100% refund
  partial_refund_days INT,         -- Days before check-in for partial refund (if applicable)
  partial_refund_percent INT,      -- % returned (e.g., 50% for Moderate)
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id, policy_type, is_long_stay)
);

CREATE INDEX idx_property_cancellation_policies_property_id ON property_cancellation_policies(property_id);
CREATE INDEX idx_property_cancellation_policies_type ON property_cancellation_policies(policy_type, is_long_stay);
```

#### Modified Table: `reservations`
Add these columns:
```sql
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_policy_id UUID REFERENCES property_cancellation_policies(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot JSONB;  -- snapshot of policy at booking time
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP WITH TIME ZONE;
```

### TypeScript Types

See `src/types/cancellation.types.ts` (to be created by Story 37.4)

### API Endpoints

#### Story 37.1
- `GET /api/properties/[id]/pricing` (already exists, make functional)
- `PUT /api/properties/[id]/pricing` (already exists, make functional)

#### Story 37.2
- `GET /api/properties/[id]/discounts` (already exists, make functional)
- `PUT /api/properties/[id]/discounts/[discountId]` (already exists, make functional)

#### Story 37.3
- `GET /api/properties/[id]/availability` (already exists, make functional)
- `PUT /api/properties/[id]/availability` (already exists, make functional)

#### Story 37.4 (NEW)
- `GET /api/properties/[id]/cancellation-policies` (new)
- `POST /api/properties/[id]/cancellation-policies` (new)
- `PUT /api/properties/[id]/cancellation-policies/[policyId]` (new)
- `DELETE /api/properties/[id]/cancellation-policies/[policyId]` (new)
- `POST /api/reservations/[id]/cancel` (modify existing to use policy)

#### Story 37.5
- `GET /api/guests/[id]/loyalty-status` (new)
- `POST /api/properties/[id]/loyalty-discounts` (new)

---

## 📈 User Flow (Happy Path)

### Configuration Phase
1. Proprietário acessa Settings → Calendário
2. Configura:
   - **Preços:** Base price €80, weekend +10%, smart pricing disabled
   - **Descontos:** Weekly -5%, Monthly -15%, Loyalty +10%
   - **Disponibilidade:** Min 3 noites, Max 90, Aviso 1 dia, Período 9 meses
   - **Cancelamentos:** Flexível (curta), Rígida (longa), Non-refundable -10%
3. Dados salvos em database ✅

### Booking Phase
1. Hóspede busca propriedade
2. Seleciona datas (ex: 5-10 Agosto, 6 noites = longa duração)
3. Sistema:
   - Verifica disponibilidade (min/max/aviso) ✅
   - Calcula preço (base + descontos aplicáveis) ✅
   - **Determina qual política é aplicada (Rígida para 28+ noites)** ✅
   - Grava tudo na reserva ✅
4. Pagamento via Stripe ✅

### Cancellation Phase
1. Cliente cancela reserva
2. Sistema:
   - Recupera política associada à reserva ✅
   - Calcula dias até check-in ✅
   - Determina refund_percentage baseado em política ✅
   - Calcula refund_amount (reservation.total_amount × refund_percentage) ✅
   - Processa refund automático via Stripe ✅
   - Atualiza reserva status=`cancelled`, grava refund_amount e stripe_refund_id ✅
   - Envia email ao cliente com detalhes ✅

---

## 🧪 Testing Strategy

### Unit Tests
- Pricing calculator (apply discounts, fees)
- Refund calculator (based on policy + date)
- Availability validator (min/max nights, notice periods)

### Integration Tests
- Settings save/load (all 4 cards)
- Reservation creation with policy linkage
- Cancellation workflow with Stripe mock

### E2E Tests
- Full booking flow (search → select → pay → cancel)
- Admin settings workflow (edit policies → see impact on calendar)

## 📌 Current Status

- Story 37.1 pricing has been revalidated against the current code path
- Stories 37.2 and 37.3 are documented as complete/ready for review
- Story 37.4 is documented as ready for production with the Stripe cancellation path
- Story 37.5 remains the optional follow-up for loyalty discount behavior
- The epic is in delivery, not draft, and the remaining work is now mostly closeout / optional enhancement

---

## 🔄 Dependencies

### Input (Prerequisites)
- ✅ Story 36: Calendar UI + reservation bars (completed)
- ✅ Story 12: Stripe integration foundation (completed)
- ✅ Database: 4 existing tables (property_prices, property_discounts, property_availability, daily_prices)

### Output (Used by Future Work)
- Dynamic pricing (AI recommendations)
- Loyalty program (recurring customer tracking)
- Advanced analytics (revenue impact)

---

## 📝 Stories Breakdown

### Story 37.1: Card Preços (Funcional)
**Objective:** Make PriceCard fully functional end-to-end  
**Scope:** UI + API integration + calculations  
**Files:** SettingsSidebar.tsx, PriceCard.tsx, API endpoints  
**Size:** 8h

### Story 37.2: Card Descontos (Funcional)
**Objective:** Make DiscountCard fully functional with calculations  
**Scope:** UI + API integration + discount application  
**Files:** DiscountCard.tsx, pricing calculator  
**Size:** 6h

### Story 37.3: Card Disponibilidade (Funcional)
**Objective:** Make AvailabilityCard functional + validate on booking  
**Scope:** UI + API integration + availability validation  
**Files:** AvailabilityCard.tsx, availability validator  
**Size:** 6h

### Story 37.4: Card Cancelamento (NEW) + Stripe Integration
**Objective:** Implement cancellation policies + automated refund workflow  
**Scope:** Schema migration + types + UI (4th tab) + logic + Stripe automation  
**Files:** CancellationCard.tsx, cancellation-policies API, refund calculator  
**Size:** 12h (most complex)

### Story 37.5: Loyalty Discount (Identificação Automática)
**Objective:** Identify repeat customers + auto-apply loyalty discount  
**Scope:** Guest history tracking + discount application + notification  
**Files:** Loyalty discount logic, guest history queries  
**Size:** 6h (depends on 37.2)

---

## 🛠️ Implementation Notes

### Calculation Order (Pricing)
1. Base price (nightly rate)
2. Weekend multiplier (if applicable)
3. Daily overrides (if exist)
4. Length discounts (weekly, monthly)
5. Loyalty discounts (if customer is repeat)
6. Smart pricing adjustment (if enabled — future)

### Refund Calculation (Cancellation)
```
days_until_checkin = checkout_date - today
refund_percentage = policy.calculate_refund(days_until_checkin, during_stay)
refund_amount = reservation.total_amount * (refund_percentage / 100)
stripe.refund(reservation.stripe_charge_id, refund_amount)
```

### UI/UX Considerations
- Mobile: Swipeable tabs (Preços → Descontos → Disponibilidade → Cancelamentos)
- Desktop: Collapsible cards with "Edit" modals
- Tooltips on all complex fields (refund policies, discount conditions)
- Visual diff when changing values (e.g., "€149 → €159")
- Confirmation before saving

### Error Handling
- Validate min < max for numeric fields
- Prevent overlapping discount types
- Warn if availability too restrictive
- Fallback refund policy if none selected

---

## 📦 Deliverables

- [ ] 5 Stories completed + tested
- [ ] Database migrations applied
- [ ] TypeScript types defined
- [ ] API endpoints functional
- [ ] Frontend UI fully connected
- [ ] E2E tests passing (100% user flow coverage)
- [ ] Stripe refund automation working
- [ ] Documentation updated
- [ ] Ready for @qa review

---

## 🎓 Learning Resources

- [Airbnb Cancellation Policies](https://www.airbnb.com/help/article/379/how-do-cancellation-policies-work)
- [Stripe Refunds API](https://stripe.com/docs/api/refunds)
- Pricing calculator precedent: `src/lib/pricing/pricing-calculator.ts`

---

## 📞 Contact

**Epic Owner:** @aios-master  
**Dev Lead:** @dev (Dex)  
**QA Lead:** @qa (Quinn)  
**PM Lead:** @pm (Morgan)

---

*Last Updated: 2026-07-28*  
*Model: Airbnb Host Dashboard (Exactly Replicated)*
