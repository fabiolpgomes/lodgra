# Epic Modularização IA Native - Matriz de Responsabilidades

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for execution
**Objetivo:** definir quem decide, quem desenha, quem implementa e quem valida cada etapa

## Papéis

### PM
- define visão, escopo e prioridade
- aprova recorte do MVP de IA
- controla expansão de capabilities
- valida critérios de aceite de produto

### Architect
- define fronteiras entre módulos
- define contratos de integração
- garante baixo acoplamento
- aprova arquitetura do MVP e do shell

### UX
- desenha arquitetura de informação
- organiza navegação por público
- define leitura visual por módulo
- valida fluxo e clareza do MVP de IA

### Dev
- constrói shell modular
- implementa staging espelho
- integra MVP de IA
- prepara rollout e desligamento seguro

### QA
- valida navegação, contexto e regressão
- confirma staging como espelho funcional
- avalia MVP de IA antes da integração
- aprova readiness para produção

### DevOps
- coordena rollout e rollback
- garante promoção por módulo ou wave
- controla versionamento de entrega
- monitora estabilidade em promoção

## Matriz por Story

| Story | PM | Architect | UX | Dev | QA | DevOps |
|---|---|---|---|---|---|---|
| PM-1 | R | C | C | I | I | I |
| ARCH-1 | C | R | C | I | I | I |
| UX-1 | C | C | R | I | I | I |
| DEV-1 | C | C | C | R | C | I |
| DEV-2 | C | C | C | R | C | C |
| QA-1 | C | C | C | C | R | I |
| OPS-1 | I | C | I | C | C | R |
| PM-2 | R | C | C | I | I | I |
| ARCH-2 | C | R | C | I | I | I |
| UX-2 | C | C | R | I | I | I |
| DEV-3 | C | C | C | R | C | I |
| QA-2 | C | C | C | C | R | I |
| DEV-4 | C | C | C | R | C | C |
| UX-3 | C | C | R | C | C | I |
| PM-3 | R | C | I | I | C | I |
| QA-3 | C | C | C | I | R | I |

## Legenda

- R = Responsible
- C = Consulted
- I = Informed

## Regra de Trabalho

- nenhuma story começa sem R definido
- nenhuma story avança sem C mínimo entre as disciplinas afetadas
- nenhuma integração entra em produção sem QA e DevOps

## Current Alignment

- PM-3 já formalizou a política de expansão
- QA-3 já validou a política como gate reutilizável
- OPS-1 já fechou a governança operacional com ressalva explícita de produção
