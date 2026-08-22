# Epic: Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades

**Status:** Ready for execution
**Prioridade:** Alta  
**Tipo:** Brownfield / Product / UX / Architecture / AI  
**Objetivo de negócio:** permitir que o Lodgra cresça como plataforma modular, sem virar uma coleção de remendos, validando primeiro um MVP de IA separado antes de integrá-lo ao produto principal.

## 1. Contexto

O Lodgra evoluiu para cobrir necessidades operacionais, financeiras e de gestão de propriedades, mas hoje a experiência ainda mistura públicos, objetivos e tipos de dados diferentes no mesmo fluxo.

Isso gera três problemas principais:
- a navegação não separa com clareza **Empresa**, **Operação** e **Proprietário**
- os relatórios e dashboards misturam visões que deveriam ser distintas
- novas features tendem a entrar como adições pontuais, aumentando a complexidade e o acoplamento

Ao mesmo tempo, existe uma oportunidade clara: criar um **MVP de IA Native** para avaliação de viabilidade de propriedades e previsão de retorno ao proprietário. Esse MVP deve nascer com escopo próprio, validar valor em ambiente controlado e só então ser incorporado ao Lodgra.

## 2. Problema

Hoje o sistema não transmite uma arquitetura de produto coerente para escalar.

Na prática:
- o usuário precisa “descobrir” onde cada coisa está
- os módulos aparecem organizados por implementação, não por intenção de uso
- a camada de informação da empresa, do operacional e do proprietário fica parcialmente sobreposta
- features novas correm o risco de virar uma “coxa de retalho” se entrarem sem fronteiras claras

## 3. Objetivo da Epic

Reestruturar o Lodgra para funcionar como uma **plataforma modular**, com módulos de produto bem definidos, permitindo:
- crescimento sustentável do sistema
- inclusão de novas features sem degradar a arquitetura
- separação clara entre públicos e responsabilidades
- validação de um MVP de IA Native para viabilidade de propriedades e previsão de retorno
- futura integração dessa IA no Lodgra, com baixo acoplamento e alto reaproveitamento

## 4. Visão de Produto

O Lodgra deve evoluir para um sistema com quatro camadas funcionais:

### 4.1 Core da Plataforma
Base transversal a todo o produto:
- autenticação
- organizações
- permissões
- moedas
- timezone
- formatação monetária
- auditoria
- navegação base
- design system

### 4.2 Módulo Operacional
Área de uso diário da equipa:
- propriedades
- reservas
- calendários
- hóspedes
- utilizadores
- configurações
- sincronizações

### 4.3 Módulo Empresa
Área da gestora do negócio:
- receita consolidada
- custos operacionais
- lucro
- caixa
- leitura multi-moeda
- performance executiva

### 4.4 Módulo Proprietário
Área de prestação de contas e acompanhamento por imóvel:
- rentabilidade
- repasses
- despesas
- histórico
- relatórios individuais
- visão por propriedade

### 4.5 MVP de IA Native
Módulo de validação separado, inicialmente independente do core:
- viabilidade de propriedades
- previsão de retorno ao proprietário
- cenários conservador, base e otimista
- score de oportunidade
- recomendações assistidas

## 5. Princípios do Produto

1. Cada feature deve pertencer a um módulo claro.
2. A interface deve refletir a estrutura do produto, não escondê-la.
3. O sistema deve crescer por capacidade, não por acúmulo de telas.
4. O MVP de IA não deve entrar no núcleo operacional antes de validar valor.
5. Moedas diferentes devem ser tratadas com contexto explícito.
6. Resultados da empresa, operação e proprietário não devem se misturar.
7. A evolução deve ser possível sem reescrever o produto inteiro.
8. Dívida técnica não deve ser empurrada para frente sem registo, dono e plano de eliminação.
9. Qualquer atalho estrutural precisa nascer como exceção temporária, nunca como padrão arquitetural.

## 6. Escopo desta Epic

### Em escopo
- redefinição da arquitetura de informação do Lodgra
- reorganização da navegação por público e por módulo
- separação conceitual entre Empresa, Operação e Proprietário
- desenho do shell modular da plataforma
- definição do MVP de IA Native como módulo separado
- estratégia de ambientes para validar o MVP antes da integração
- diretrizes para inclusão de futuras features sem acoplamento excessivo

### Fora de escopo
- reescrever todo o sistema operacional de uma vez
- lançar o MVP de IA diretamente dentro do fluxo principal do Lodgra
- refatorar todas as páginas existentes sem priorização
- trocar toda a base visual antes da definição dos módulos
- resolver todos os relatórios históricos nesta fase

## 7. Direção para o MVP de IA Native

O MVP deve responder a uma pergunta simples e valiosa:

**“Esta propriedade tem viabilidade e qual retorno esperado pode gerar ao proprietário?”**

### Entradas esperadas
- localização
- tipologia
- sazonalidade
- preço médio
- ocupação histórica
- custos estimados
- moeda
- perfil do imóvel

### Saídas esperadas
- score de viabilidade
- retorno previsto
- cenários de performance
- indicação de risco
- recomendação de entrada ou não no portfólio

### Regra de produto
O MVP deve nascer como uma capability validada, não como uma feature improvisada dentro do operacional.

## 8. Estratégia de Ambiente

A recomendação é:

### 8.1 Desenvolvimento local
Para implementação e testes rápidos.

### 8.2 Staging espelho da produção
Ambiente principal de validação:
- mesma estrutura da produção
- dados mascarados ou anonimizados
- integrações de sandbox quando aplicável
- teste completo de navegação, cálculos, permissões e UX

### 8.3 Produção
Entrada apenas após validação em staging e aprovação da evolução.

### Regra
Mudanças que afetem:
- navegação
- dados financeiros
- permissões
- cálculos
- moeda
- IA

devem passar por staging antes de produção.

## 9. Direção de UX

A experiência deve ser reorganizada com foco na intenção do usuário.

### Princípios de UX
- separar o sistema por público e contexto de uso
- reduzir ambiguidade entre módulos
- deixar explícito onde está a visão da empresa, da operação e do proprietário
- evitar dashboards que misturam resultados de naturezas diferentes
- tratar o MVP de IA como um módulo próprio, com acesso claro e valor explicável

### Resultado esperado
O usuário deve conseguir responder, em poucos segundos:
- “estou na área certa?”
- “isto é visão da empresa, da operação ou do proprietário?”
- “este resultado está consolidado por moeda?”
- “isto já é produto principal ou ainda é validação do MVP?”

## 10. Direção de Arquitetura

A arquitetura deve evoluir para suportar modularidade real.

### Princípios arquiteturais
- shell base único para toda a plataforma
- módulos desacoplados por responsabilidade
- serviços de domínio separados para cálculo e regras de negócio
- contratos claros de entrada e saída entre módulos
- uso de design system e componentes compartilhados, sem repetir padrões
- capacidade de adicionar novas features sem quebrar a navegação ou o modelo mental do produto
- dívida técnica explicitamente controlada, rastreável e com prazo de remoção

### Objetivo técnico
Evitar que o crescimento do produto vire acumulação de páginas e regras espalhadas.

## 11. Direção para Dev

A implementação deve seguir um modelo de evolução modular:
- criar/ajustar o shell da plataforma
- estruturar módulos por domínio
- concentrar regras em serviços e helpers reutilizáveis
- evitar lógica de produto espalhada em componentes de UI
- isolar o MVP de IA para facilitar validação e desligamento se necessário
- preparar o caminho para futura integração sem retrabalho

## 12. Critérios de Sucesso

Esta epic será bem-sucedida se:

- o Lodgra tiver módulos claramente distinguíveis por intenção de uso
- Empresa, Operação e Proprietário deixarem de competir no mesmo fluxo
- novas features puderem ser adicionadas sem quebrar a estrutura principal
- o MVP de IA Native puder ser validado isoladamente
- staging representar fielmente a produção
- o sistema passar a crescer como plataforma, não como coleção de remendos
- nenhuma dívida técnica relevante permanecer invisível, sem owner e sem decisão de remoção

## 13. Riscos

- acoplamento excessivo entre módulos antigos e novos
- ambiguidade entre visão operacional e visão executiva
- IA entrar cedo demais no core e gerar dívida estrutural
- falta de validação em staging levar mudanças incompletas para produção
- repetição de componentes e regras sem padrão central
- normalização de atalhos que depois viram arquitetura permanente

## 14. Entregáveis por Função

### PM
- definição da visão da plataforma modular
- priorização das frentes de modularização
- recorte do MVP de IA
- critérios de sucesso e rollout

### Arquiteto
- desenho da estrutura modular
- definição de fronteiras entre módulos
- estratégia de integração do MVP de IA
- diretrizes para escalabilidade e baixo acoplamento

### UX
- nova arquitetura de informação
- navegação por público
- hierarquia visual por módulo
- experiência do MVP de IA e sua leitura de valor

### Dev
- estrutura base da plataforma modular
- implementação dos módulos e contratos
- separação de responsabilidades
- preparação do staging e rollout gradual

## 24. Atualização de Estado

As waves centrais da epic já avançaram para review ou closeout:
- PM-2, ARCH-2, UX-2, DEV-3, QA-2, DEV-4, UX-3 e PM-3 ficaram prontos para review
- QA-3 fechou a política de expansão como gate reutilizável
- OPS-1 foi validada com ressalva explícita sobre restauração em produção

## 15. Próximos Passos Sugeridos

1. manter o PRD oficial do módulo como fonte de verdade
2. detalhar os módulos e submódulos
3. mapear a navegação atual versus a navegação alvo
4. manter a story 46.1 como primeiro corte funcional do MVP
5. descrever as primeiras stories por disciplina
6. preparar staging espelho da produção
7. executar o trabalho por ondas, com validação em cada etapa

## 16. Fases de Entrega

### Fase 0 — Discovery e alinhamento
- validar a visão modular com PM, arquiteto, UX e dev
- fechar o recorte do MVP de IA
- definir naming e fronteiras dos módulos
- confirmar estratégia de ambiente

### Fase 1 — Fundação da plataforma modular
- ajustar shell base e navegação
- separar os pontos de entrada por módulo
- estabelecer contratos entre áreas
- preparar staging espelho da produção

### Fase 2 — Reorganização da experiência
- redesenhar a arquitetura de informação
- reorganizar Empresa, Operação e Proprietário
- revisar dashboard e relatórios para contexto correto
- explicitar leitura por moeda e por público

### Fase 3 — MVP de IA Native isolado
- construir a primeira versão da viabilidade de propriedades
- definir entrada, processamento e saída do score
- validar previsões de retorno ao proprietário
- testar com dados reais ou semi-reais em staging

### Fase 4 — Integração ao Lodgra
- integrar o MVP validado como módulo nativo
- reutilizar core, permissões e design system
- preparar rollout gradual por feature flag ou segmento
- manter capacidade de desligamento rápido

## 17. Story Map Inicial

### Wave 1 — Plataforma Modular
1. **Story PM-1:** Definição formal dos módulos e submódulos do Lodgra
2. **Story ARCH-1:** Contratos de fronteira entre Core, Operação, Empresa, Proprietário e IA
3. **Story UX-1:** Nova arquitetura de informação e navegação por público
4. **Story DEV-1:** Shell modular da plataforma e pontos de entrada por módulo

### Wave 2 — Ambientes e validação
5. **Story DEV-2:** Staging espelho da produção com dados mascarados
6. **Story QA-1:** Checklist de validação de navegação, permissões, moeda e contexto
7. **Story OPS-1:** Estratégia de rollout gradual e rollback por módulo

### Wave 3 — MVP de IA Native
8. **Story PM-2:** Recorte do MVP de IA e métricas de sucesso
9. **Story ARCH-2:** Arquitetura do motor de viabilidade e previsão de retorno
10. **Story UX-2:** Fluxo de entrada e leitura de resultado do MVP de IA
11. **Story DEV-3:** Implementação do MVP isolado em staging
12. **Story QA-2:** Validação do modelo, UX e consistência de retorno

### Wave 4 — Integração
13. **Story DEV-4:** Integração do MVP validado no Lodgra
14. **Story UX-3:** Refinamento da entrada do módulo IA dentro do shell
15. **Story PM-3:** Critérios para expansão do módulo IA para novos casos de uso
16. **Story QA-3:** Validação da política de expansão como gate de closeout

## 18. Critérios de Aceite da Epic

- [ ] O Lodgra expõe claramente os módulos Core, Operação, Empresa, Proprietário e IA
- [ ] A navegação deixa explícito o público e a intenção de uso de cada área
- [ ] Nenhum novo módulo entra como remendo solto fora do shell modular
- [ ] O MVP de IA Native nasce isolado da operação principal
- [ ] O MVP consegue ser validado em staging antes de qualquer integração com produção
- [ ] A estrutura permite adicionar novas capabilities sem reabrir o produto inteiro
- [ ] Resultados financeiros e analíticos não misturam contexto de empresa, operação e proprietário
- [ ] O sistema mantém uma base comum de design, autenticação, permissões e formatação monetária

## 19. Definição de Pronto

Uma story desta epic só é considerada pronta para desenvolvimento quando:
- o módulo alvo foi identificado
- o público principal foi definido
- os dados de entrada e saída estão claros
- a dependência de ambiente foi mapeada
- o impacto em navegação e arquitetura foi validado
- o critério de aceite está escrito em linguagem objetiva

## 20. File List Inicial

### Documentação
- `docs/stories/epic-modularizacao-ia-native.md`
- `docs/stories/epic-modularizacao-ia-native-index.md`
- `docs/stories/epic-modularizacao-ia-native-sequencia.md`
- `docs/stories/epic-modularizacao-ia-native-responsabilidades.md`
- `docs/stories/epic-modularizacao-ia-native-handoff.md`
- `docs/stories/epic-modularizacao-ia-native-consolidated-view.md`
- `docs/product/lodgra-property-intelligence-prd.md`
- `docs/stories/46.1-property-intelligence-cli.story.md`

### Stories derivadas
- `docs/stories/ia-native/pm-1-modulos-submodulos.md`
- `docs/stories/ia-native/arch-1-fronteiras-contratos.md`
- `docs/stories/ia-native/ux-1-navegacao-por-publico.md`
- `docs/stories/ia-native/dev-1-shell-modular.md`
- `docs/stories/ia-native/dev-2-staging-espelho.md`
- `docs/stories/ia-native/qa-1-checklist-validacao.md`
- `docs/stories/ia-native/ops-1-rollout-rollback.md`
- `docs/stories/ia-native/pm-2-recorte-mvp-ia.md`
- `docs/stories/ia-native/arch-2-arquitetura-viabilidade.md`
- `docs/stories/ia-native/ux-2-fluxo-mvp-ia.md`
- `docs/stories/ia-native/dev-3-mvp-ia-isolado.md`
- `docs/stories/ia-native/qa-2-validacao-mvp-ia.md`
- `docs/stories/ia-native/dev-4-integracao-lodgra.md`
- `docs/stories/ia-native/ux-3-entrada-mvp-no-shell.md`
- `docs/stories/ia-native/pm-3-expansao-capabilities.md`
- `docs/stories/ia-native/qa-3-validar-expansao-capabilities.md`

### Apoios esperados
- `src/components/common/layout/Sidebar.tsx`
- `src/components/common/layout/BottomNav.tsx`
- `src/app/[locale]/dashboard/page.tsx`
- `src/app/[locale]/dashboard/empresa/page.tsx`
- `src/app/[locale]/dashboard/reports/page.tsx`
- `src/app/[locale]/owners/[id]/report/page.tsx`

## 21. Observação de Execução

Esta epic deve ser tratada como base de orquestração entre agentes:
- **PM** valida visão, escopo e prioridade
- **Architect** define fronteiras e contratos
- **UX** desenha a arquitetura de informação e o MVP de IA
- **Dev** implementa por módulos e prepara o staging
- **QA** valida a experiência e o comportamento em cada fase

O princípio central é manter a evolução do Lodgra como um sistema modular, onde cada nova capability entra com fronteiras claras e pode crescer sem transformar o produto numa colcha de retalhos.

## 22. Matriz de Responsabilidades

Ver documento dedicado: [`epic-modularizacao-ia-native-responsabilidades.md`](epic-modularizacao-ia-native-responsabilidades.md)

### Regra de decisão

- PM decide valor e prioridade
- Architect decide fronteira e contrato
- UX decide clareza e jornada
- Dev decide implementação e estrutura técnica
- QA decide readiness funcional
- DevOps decide promoção e rollback

## 23. File List Final

### Epic principal
- `docs/stories/epic-modularizacao-ia-native.md`
- `docs/stories/epic-modularizacao-ia-native-index.md`
- `docs/stories/epic-modularizacao-ia-native-sequencia.md`
- `docs/stories/epic-modularizacao-ia-native-responsabilidades.md`

### Stories da wave 1
- `docs/stories/ia-native/pm-1-modulos-submodulos.md`
- `docs/stories/ia-native/arch-1-fronteiras-contratos.md`
- `docs/stories/ia-native/ux-1-navegacao-por-publico.md`
- `docs/stories/ia-native/dev-1-shell-modular.md`

### Stories da wave 2
- `docs/stories/ia-native/dev-2-staging-espelho.md`
- `docs/stories/ia-native/qa-1-checklist-validacao.md`
- `docs/stories/ia-native/ops-1-rollout-rollback.md`

### Stories da wave 3
- `docs/stories/ia-native/pm-2-recorte-mvp-ia.md`
- `docs/stories/ia-native/arch-2-arquitetura-viabilidade.md`
- `docs/stories/ia-native/ux-2-fluxo-mvp-ia.md`
- `docs/stories/ia-native/dev-3-mvp-ia-isolado.md`
- `docs/stories/ia-native/qa-2-validacao-mvp-ia.md`

### Stories da wave 4
- `docs/stories/ia-native/dev-4-integracao-lodgra.md`
- `docs/stories/ia-native/ux-3-entrada-mvp-no-shell.md`
- `docs/stories/ia-native/pm-3-expansao-capabilities.md`
- `docs/stories/ia-native/qa-3-validar-expansao-capabilities.md`
