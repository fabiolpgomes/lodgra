# Backlog Técnico - Property Intelligence em 3 Camadas

**Objetivo:** executar a arquitetura alvo definida na spec `property-intelligence-arquitetura-3-camadas.spec.md`, separando explicitamente as camadas Mercado, Inteligência Lodgra/AHS e IA.

**Contexto atual:** o MVP já entrega CLI, JSON/Markdown, comparáveis com `source`, `observedAt` e `marketTier`, e um relatório executivo funcional.  
**Próximo salto:** tornar a origem do número e da recomendação inequívoca.

## Ordem de execução recomendada

1. [Story 46.2 - Camada de Mercado e Contratos Observados](../46.2-property-intelligence-market-layer.story.md)
2. [Story 46.3 - Camada Financeira com Custos Ponderados](../46.3-property-intelligence-finance-layer.story.md)
3. [Story 46.4 - Camada Lodgra/AHS e Precedência do Histórico](../46.4-property-intelligence-lodgra-layer.story.md)
4. [Story 46.5 - Camada IA e Relatório Executivo em 3 Blocos](../46.5-property-intelligence-ia-e-relatorio.story.md)

## Tarefa 1 - Expandir o contrato de dados

**Objetivo:** preparar os tipos para suportar três camadas explícitas.

### Entregáveis
- adicionar `marketSnapshot`
- adicionar `lodgraSignal`
- expandir `ComparableInput` e `ComparableBenchmark` com metadados operacionais opcionais
- preparar tipos para `analysisLayers` ou estrutura equivalente

### Dependências
- nenhuma

### Critérios de aceite
- o TypeScript compila sem casts frágeis
- o contrato suporta origem do dado em nível de mercado e em nível Lodgra/AHS
- o JSON continua compatível com o input atual

---

## Tarefa 2 - Introduzir custos ponderados por canal

**Objetivo:** substituir a premissa fixa de comissão por uma lógica por mix de canais.

### Entregáveis
- calcular `weightedChannelCost`
- suportar mix por canal: Airbnb, Booking, VRBO, Flatio, Hostwise, direto
- manter fallback conservador quando o mix não existir
- preservar a compatibilidade com `commissionPct` atual como fallback

### Dependências
- Tarefa 1

### Critérios de aceite
- o motor consegue distinguir custo por canal
- a comissão deixa de ser uma média cega quando houver mix informado
- o output continua estável para entradas antigas

---

## Tarefa 3 - Criar o snapshot de mercado

**Objetivo:** consolidar a Camada 1 como um bloco explícito de mercado observado.

### Entregáveis
- gerar `marketSnapshot` por cenário
- calcular mediana ou range bruto/líquido por segmento
- classificar comparáveis por zona e recência
- marcar referências secundárias fora da zona principal

### Dependências
- Tarefa 1

### Critérios de aceite
- o relatório mostra claramente o bloco Mercado
- a recência e a zona aparecem no output
- comparáveis sem data continuam válidos, mas com menor confiança

---

## Tarefa 4 - Criar a camada Lodgra/AHS

**Objetivo:** transformar o histórico real em sinal proprietário.

### Entregáveis
- criar `lodgraSignal`
- aceitar receita histórica, ocupação, ADR, sazonalidade, custos e mix de canais
- calcular `ownerRealityScore`
- calcular `historicalVsMarketDelta`

### Dependências
- Tarefa 1
- Tarefa 2

### Critérios de aceite
- histórico real tem peso superior ao benchmark genérico
- o sistema informa se o número veio do imóvel, da carteira ou de mercado
- o output suporta dados parciais sem quebrar

---

## Tarefa 5 - Reforçar a camada de IA

**Objetivo:** fazer a IA sintetizar as camadas anteriores sem recalcular a matemática.

### Entregáveis
- criar uma estrutura de saída para a interpretação da IA
- gerar razão da recomendação com base em mercado + Lodgra/AHS + contexto do proprietário
- incluir riscos, caveats e framing executivo
- manter a matemática fora da responsabilidade da IA

### Dependências
- Tarefa 3
- Tarefa 4

### Critérios de aceite
- a recomendação final deixa claro o porquê da escolha
- a IA não inventa comparáveis nem custos
- a IA não altera o bruto calculado

---

## Tarefa 6 - Separar os níveis financeiros

**Objetivo:** deixar inequívoco o que é bruto, o que é pós-canais e o que é líquido do proprietário.

### Entregáveis
- expor `grossRevenue`
- expor `afterChannelRevenue`
- expor `ownerNetReturn`
- ajustar o motor para retornar cada nível separadamente

### Dependências
- Tarefa 2
- Tarefa 4

### Critérios de aceite
- o relatório não usa “líquido” sem contexto
- o utilizador entende o que foi descontado em cada fase
- os comparáveis com líquido observado preservam o valor informado

---

## Tarefa 7 - Reescrever o relatório executivo

**Objetivo:** apresentar o motor como três camadas de leitura, com clareza comercial.

### Entregáveis
- bloco Mercado
- bloco Inteligência Lodgra/AHS
- bloco IA
- tabela comparativa com três níveis financeiros
- leitura anual vs curta/média duração lado a lado

### Dependências
- Tarefa 3
- Tarefa 4
- Tarefa 5
- Tarefa 6

### Critérios de aceite
- o relatório explica claramente onde a recomendação nasceu
- o proprietário consegue ler o dossiê sem ambiguidade semântica
- o texto mantém tom executivo, não técnico

---

## Tarefa 8 - Cobertura de testes

**Objetivo:** garantir que a nova arquitetura não quebrou o comportamento atual e que a nova lógica está protegida.

### Entregáveis
- testes de ordenação por recência e zona
- testes de precedência do histórico real sobre benchmark
- testes de separação de níveis financeiros
- testes de renderização dos três blocos no Markdown

### Dependências
- Tarefa 1 a Tarefa 7

### Critérios de aceite
- a suíte cobre a nova arquitetura
- os testes do CLI continuam verdes
- os snapshots do relatório refletem a nova narrativa

---

## Tarefa 9 - Atualizar fixtures e exemplo oficial

**Objetivo:** deixar um exemplo vivo para guiar a implementação e a validação.

### Entregáveis
- atualizar `property-intelligence-example.input.json`
- incluir casos com market mix e histórico Lodgra/AHS
- atualizar `property-intelligence-latest-report.md`

### Dependências
- Tarefa 3 a Tarefa 7

### Critérios de aceite
- o exemplo cobre os dois cenários
- o exemplo mostra a diferença entre mercado e inteligência proprietária
- o report latest bate com o output atual do CLI

## Mapeamento das Stories

- Story 46.2 cobre a Tarefa 1 e parte da Tarefa 3
- Story 46.3 cobre a Tarefa 2 e parte da Tarefa 6
- Story 46.4 cobre a Tarefa 4 e parte da Tarefa 6
- Story 46.5 cobre as Tarefas 5, 7, 8 e 9

## Resultado esperado

Ao terminar este backlog, o Property Intelligence deixa de parecer uma calculadora com benchmarks e passa a funcionar como um motor de decisão em três camadas:

- **Mercado** mostra o que é possível
- **Inteligência Lodgra/AHS** mostra o que a operação real já provou
- **IA** sintetiza e recomenda a estratégia mais coerente
