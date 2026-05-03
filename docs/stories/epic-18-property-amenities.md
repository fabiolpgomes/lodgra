# Epic 18: Propriedades — Comodidades, Quartos, Banheiros e Taxas

**Status:** Ready for Dev
**Priority:** High
**Effort:** High
**Risk:** Medium (schema changes, novo modelo de dados)

## Problem Statement

O cadastro de propriedades não regista comodidades, configuração de quartos/banheiros, taxas adicionais nem horários de check-in/out. Esta informação é essencial para a gestão operacional, comunicação com hóspedes e — estrategicamente — para feeds estruturados (Google Vacation Rentals).

## Goal

Criar um sistema completo de configuração de propriedade: comodidades por cômodo com ícones padronizados, detalhes de quartos e banheiros, taxas adicionais (limpeza, animais) e horários.

## Affected Screens

1. `/properties/[id]/edit` — todos os novos campos/secções
2. `/properties/[id]` — visualização das comodidades e configurações

## Acceptance Criteria

- [ ] Comodidades: lista por cômodo (Sala, Quarto, Cozinha, Banheiro) com ícones padronizados
- [ ] Comodidades: secção "Destaques" e "Itens de Segurança"
- [ ] Quartos: tipo de cama, nº de camas/espaços para dormir, disponibiliza lençóis (Sim/Não)
- [ ] Banheiros: nome, tipo (WC / Banheiro completo), artigos disponíveis
- [ ] Taxas: taxa de limpeza (valor + tipo: por estadia ou por noite)
- [ ] Taxas: taxa de animais de estimação (valor + tipo: por estadia ou por noite)
- [ ] Horários: check-in (hora de/até) e checkout (hora até)
- [ ] Todos os dados persistidos em base de dados
- [ ] Visualização clara no perfil da propriedade

## Constraints

- Migrações de BD necessárias (novas tabelas: `property_amenities`, `property_rooms`, `property_bathrooms`, `property_fees`)
- Comodidades: usar conjunto pré-definido (não free-text) para permitir ícones consistentes
- Ícones: Lucide React (já usado no projecto) como primeira opção
- Horários: formato HH:MM, sem timezone (local da propriedade)

## Stories

- [ ] Story 18.1: Migração DB — tabelas de comodidades, quartos, banheiros, taxas e horários
- [ ] Story 18.2: Comodidades por cômodo com ícones (UI + API)
- [ ] Story 18.3: Quartos — tipos de cama, capacidade, lençóis
- [ ] Story 18.4: Banheiros — tipo e comodidades
- [ ] Story 18.5: Taxas adicionais e horários check-in/out

## Agents

- @architect — Validar schema de BD antes de Story 18.1
- @dev — Implementação completa (18.1 → 18.5 sequencialmente)
- @devops — Push e deploy

## Strategic Note

Este épico é o mais crítico para a estratégia Google Vacation Rentals. O schema LodgingBusiness/Schema.org exige: número de quartos, tipos de cama, comodidades estruturadas, horários de check-in/out e taxas. Implementar correctamente aqui elimina retrabalho na fase de distribuição.

## Roadmap Context

```
Epic 18 (agora)        → dados estruturados de propriedade
Epic 14 (completo)     → páginas públicas por propriedade
Fase futura            → Schema.org markup + Google Vacation Rentals feed
```
