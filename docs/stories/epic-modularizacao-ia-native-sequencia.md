# Epic Modularização IA Native - Sequência de Eventos

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for execution
**Propósito:** sequência operacional para orquestração entre agentes

---

## Evento 1 - Alinhamento de produto

1. PM valida visão modular
2. PM fecha módulos, públicos e limites
3. PM define recorte do MVP de IA

## Evento 2 - Arquitetura e fronteiras

1. Architect define fronteiras entre módulos
2. Architect define contratos e dependências
3. Architect valida possibilidades de expansão sem acoplamento

## Evento 3 - UX e navegação

1. UX desenha navegação por público
2. UX define hierarquia visual do shell modular
3. UX desenha fluxo do MVP de IA como capability separada

## Evento 4 - Fundação técnica

1. Dev cria shell modular
2. Dev prepara staging espelho da produção
3. QA valida navegação, contexto e isolamento

## Evento 5 - MVP de IA Native isolado

1. PM fecha o recorte final do MVP
2. Architect define o fluxo técnico do motor
3. UX desenha o fluxo de entrada e leitura
4. Dev implementa o MVP em staging
5. QA valida saída, estabilidade e compreensão

## Evento 6 - Integração

1. Dev integra o MVP validado ao shell
2. UX ajusta a entrada do módulo no produto
3. PM define critérios para expansão
4. QA confirma rollback, governança e regressão zero crítica

## Evento 7 - Closeout de governança de expansão

1. PM valida a política de expansão de capabilities
2. UX confirma a leitura nativa da capability no shell
3. Dev confirma que a integração não quebrou o estado modular
4. QA valida a política de classificação e fechamento

## Regra de Sequência

- Nenhum evento posterior deve começar antes da validação do anterior
- O MVP de IA não entra no Lodgra antes de existir de forma isolada
- O staging deve existir antes do primeiro rollout
- Expansão de capabilities só acontece após validação do MVP e do shell modular
- O closeout de expansão só acontece depois da política de PM-3 e da validação de QA-3

## Estado Atual

- O evento 5, 6 e 7 já têm stories prontas para review ou closeout
- A sequência agora pode ser tratada como executável a partir da base validada
