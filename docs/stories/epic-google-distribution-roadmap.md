# Epic: Google Vacation Rentals Distribution — Roadmap

**Status:** Roadmap (Não iniciar antes de Epic 14, 17 e 18 estarem completos)
**Priority:** High (estratégico)
**Effort:** Very High
**Risk:** High

## Vision

Transformar o Lodgra num canal de distribuição directo via Google Hotel Center / Vacation Rentals, eliminando dependência de OTAs e comissões de 15-20%.

## Pré-requisitos (antes de iniciar este épico)

- [ ] Epic 14 completo — páginas públicas por propriedade com URL única
- [ ] Epic 17 completo — fotos e documentos por propriedade
- [ ] Epic 18 completo — comodidades, quartos, taxas e horários estruturados
- [ ] Schema.org (LodgingBusiness) implementado nas páginas públicas

## Scope

### Fase 1 — Páginas Públicas SEO-Ready
- URL única por propriedade: `/imovel/[slug]`
- Schema.org markup: LodgingBusiness, Offer, Product
- Fotos optimizadas (WebP, dimensões correctas)
- Calendário de disponibilidade público
- Preço base visível

### Fase 2 — Feed Estruturado
- Endpoint `/api/google-feed` em XML ou JSON
- Dados: disponibilidade por data, preços, fotos, localização exacta
- Actualização em tempo real ou near-real-time
- Validação com Google Hotel Center

### Fase 3 — Reviews
- Integração com Google My Business
- Pull de reviews das OTAs integradas (Booking.com, Airbnb)
- Exibição de rating nas páginas públicas

### Fase 4 — Feature Premium SaaS
- "Distribuição automática para Google" como add-on Pro/Enterprise
- Dashboard de performance (impressões, cliques, reservas directas)
- ROI vs comissões OTA

## Decisões Técnicas a Tomar (na altura)

- Google Hotel Center vs Vacation Rentals API (verificar elegibilidade)
- Estratégia de preços dinâmicos para o feed
- Gestão de disponibilidade em tempo real

## Notas

> Este épico não deve ser iniciado antes dos épicos de fundação (14, 17, 18) estarem completos. Cada decision técnica nos épicos actuais deve considerar compatibilidade com este roadmap.
