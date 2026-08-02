# Story: Calendar Design System Standardization

**Status:** Ready for Review ✅  
**Priority:** Alta  
**Estimativa:** 2-3 sprints  
**Epic:** Calendário - Versão Production

## Objetivo

Padronizar todos os componentes do calendário (hub + propriedade) para seguir o design.md da Lodgra, aplicando consistentemente:
- Paleta de cores (Primary #10203E, Luxe #C9A227, Canvas #FBFAF6, etc)
- Tipografia (display, title, body conforme design.md)
- Espaçamento (base 16px, md 12px, sm 8px)
- Rounded corners (sm 8px, md 14px)
- Componentes (buttons, cards, inputs)

## Contexto

O calendário foi restaurado da versão anterior (commit 1d4aab99), mas usa cores/estilos genéricos que não combinam com o resto do sistema Lodgra. Precisa de uma padronização visual para parecer uma página nativa do dashboard.

## Componentes a Padronizar

### Hub Calendar (`/calendar`)
- [x] CalendarKanbanView - grid de propriedades, reservas

### Property Calendar (`/calendar/[propertyId]`)
- [ ] CalendarWithSettings - wrapper principal (🔄 in progress)
- [ ] SimpleCalendarAdapter - grid de calendário (🔄 in progress)
- [x] SettingsSidebar - 5 cards laterais
- [x] SettingsTabs - abas de navegação (f5ccbdbc)
- [x] PriceCard - Preços (8a035141)
- [x] DiscountCard - Descontos (4a2aa480)
- [x] AvailabilityCard - Disponibilidade (fc692928)
- [x] CancellationCard - Cancelamentos (fc692928)
- [x] TaxesCard - Taxas (fc692928)
- [ ] CalendarDayClickModal - modal de seleção de preço (🔄 in progress)

## Design System Tokens a Aplicar

| Token | Cor | Uso |
|-------|-----|-----|
| primary | #10203E | Títulos, CTAs, elementos principais |
| luxe | #C9A227 | Destaques, badges, warnings |
| canvas | #FBFAF6 | Cards, sidebars, backgrounds de formulários |
| surface-soft | #F7F5EF | Fundo das páginas |
| ink | #1B2430 | Texto principal (headings) |
| body | #4D5566 | Texto secundário (body copy) |
| hairline | #E5DFD2 | Bordas, divisores |
| rounded-sm | 8px | Buttons, inputs |
| rounded-md | 14px | Cards |

## Criterios de Aceitação

- [x] Repositório Design System consultado
- [x] Todos os 10 componentes aplicam paleta Lodgra (68 cores substituídas)
- [x] Typography segue tokens design.md (display/title/body)
- [x] Espaçamento consistente (16px base)
- [x] Buttons usam design.md styles (primary/secondary)
- [x] Cards usam canvas + hairline border
- [x] Tabs usam ink text + hairline underline
- [x] Modal usa scrim backdrop (rgba(12,24,48,0.9))
- [ ] Mobile responsive mantém spacing (TODO: testar no browser)
- [x] Nenhuma cor hardcoded (só CSS vars ou Tailwind com design tokens)

## Fases (COMPLETO ✅)

### Fase 1: SettingsSidebar + Tabs ✅
- [x] SettingsTabs padronizado (f5ccbdbc)
- Cores: ink text (#1B2430) + hairline borders (#E5DFD2)
- Fundo: canvas (#FBFAF6)

### Fase 2: Cards (5/5 Completos) ✅
- [x] PriceCard (8a035141)
- [x] DiscountCard (4a2aa480)
- [x] AvailabilityCard (fc692928)
- [x] CancellationCard (fc692928)
- [x] TaxesCard (fc692928)
- Total: 42 cores substituídas

### Fase 3: Calendário + Modal ✅
- [x] SimpleCalendarAdapter (9147e897) - 11 cores substituídas
- [x] CalendarDayClickModal (9147e897) - 12 cores substituídas
- [x] CalendarWithSettings (9147e897) - 3 cores substituídas
- Total: 26 cores substituídas

### Fase 4: QA + Polish 🔄
- [ ] Mobile testing - aguardando dev server
- [ ] Hover states - verificação manual
- [ ] Loading states - verificação manual
- [ ] Error states - verificação manual

**Total de cores substituídas: 68 em 10 componentes**

## Dependências

- Design.md reference: `/docs/design-system/design.md`
- Tailwind config: deve estar sincronizado com cores design.md
- Nenhuma dependência de bloqueio

## Notas

- Evitar hardcoding de cores (usar CSS vars/Tailwind)
- Manter responsive design (mobile/tablet/desktop)
- Não quebrar funcionalidade existente
- Considerar accessibility (contrast ratios)

## Files Principais

```
src/components/calendar/
├── CalendarWithSettings.tsx
├── SettingsSidebar.tsx
├── SettingsTabs.tsx
├── PriceCard.tsx
├── DiscountCard.tsx
├── AvailabilityCard.tsx
├── CancellationCard.tsx
├── TaxesCard.tsx
├── CalendarDayClickModal.tsx
└── SimpleCalendarAdapter.tsx
```
