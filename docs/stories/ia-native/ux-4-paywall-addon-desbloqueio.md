# Story UX-4 - Desenhar paywall e desbloqueio por add-on da IA Native

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for Review  
**Owner:** @ux-design-expert  
**Quality Gate:** @pm + @architect + @qa  
**Depends On:** PM-4, DEV-4, UX-3, QA-3

---

## UX Intent

A IA Native já precisa parecer uma capability premium nativa do Lodgra.

Os planos `Premium` e `Enterprise` já devem entrar com acesso incluído; para os restantes planos, o bloqueio deve abrir o caminho de compra do add-on sem quebrar a sensação premium.

Quando o utilizador não tiver entitlement, o fluxo não deve parecer erro, bloqueio seco ou página escondida. O estado bloqueado deve:
- manter o módulo visível
- explicar rapidamente por que o acesso está indisponível
- mostrar o valor do add-on
- conduzir para compra sem quebrar a leitura premium
- devolver o utilizador ao ponto certo após desbloqueio

## Story

**Como** utilizador que vê a IA Native mas ainda não tem acesso contratado,  
**Quero** entender o valor do add-on e comprar o desbloqueio sem perder contexto,  
**Para que** eu possa ativar Property Intelligence sem trocar o meu plano principal.

## Context

A PM-4 define a decisão comercial: a capability continua visível e o acesso bloqueado vira oferta de add-on.

A UX-4 traduz essa regra em experiência:
- o shell não esconde o módulo
- a análise não vira beco sem saída
- a oferta não parece downgrade de produto
- a confirmação de compra devolve o utilizador ao fluxo original

Esta story também precisa respeitar o trabalho já fechado em UX-3:
- aparência nativa no shell
- linguagem premium e orientada à decisão
- separação clara entre leitura, execução e governança

## UX Rules

1. O módulo IA Native continua visível na navegação.
2. O estado bloqueado deve ser explícito e acolhedor.
3. O add-on deve ser apresentado como desbloqueio premium, não como punição.
4. O CTA principal deve ser inequívoco e fácil de encontrar.
5. O fluxo pós-compra deve preservar contexto e evitar recomeçar do zero.
6. A linguagem deve continuar em português, simples e executiva.

## Acceptance Criteria

### AC1: Descoberta e estado bloqueado
- [ ] A IA Native continua visível no menu quando não há entitlement
- [ ] O utilizador entende rapidamente que a capability existe e pode ser comprada
- [ ] O estado bloqueado não parece falha de navegação ou erro técnico

### AC2: Paywall premium
- [ ] O estado bloqueado apresenta um painel premium de desbloqueio
- [ ] O painel explica o benefício da capability antes de pedir a compra
- [ ] O CTA principal para comprar o add-on está visível sem scroll excessivo
- [ ] O paywall não se confunde com upgrade genérico do plano inteiro

### AC3: Retorno de fluxo
- [ ] Após compra bem-sucedida, o utilizador volta ao módulo correto
- [ ] O contexto anterior é preservado no retorno
- [ ] O estado da interface mostra claramente que o acesso foi ativado

### AC4: Estados alternativos
- [ ] Se a entitlement já existir, o paywall não aparece
- [ ] Se o checkout falhar, existe mensagem clara e recuperável
- [ ] Se a verificação estiver pendente, o estado comunica carregamento ou validação em curso

### AC5: Acessibilidade e responsividade
- [ ] A proposta de add-on é legível em desktop e mobile
- [ ] O CTA principal continua destacável em tamanhos menores
- [ ] O estado bloqueado não depende apenas de cor para comunicar restrição
- [ ] Os blocos de valor e decisão mantêm leitura escaneável

## Scope

### In scope
- estado bloqueado com narrativa de valor
- paywall premium para IA Native
- CTA para compra do add-on
- retorno pós-compra com preservação de contexto
- variações de estados: ativo, bloqueado, pendente, falha

### Out of scope
- mudar o plano principal do usuário
- definir preço final do add-on
- alterar a lógica do motor Property Intelligence
- redesenhar o billing inteiro
- criar novas capabilities

## Deliverables

- wireframe / layout do estado bloqueado
- copy premium do paywall
- estrutura do retorno pós-compra
- guidelines de layout para desktop e mobile
- base para DEV-5 implementar o fluxo

## Suggested File List

- `src/app/[locale]/ia-native/page.tsx`
- `src/app/[locale]/ia-native/analyze/page.tsx`
- `src/components/features/property-intelligence/PropertyIntelligenceWorkbench.tsx`
- `src/components/common/layout/Sidebar.tsx`
- `src/components/common/layout/BottomNav.tsx`
- `src/components/features/account/SubscriptionSection.tsx`
- `src/components/features/account/PlanUpgradeModal.tsx`
- `src/components/features/billing/BillingPreview.tsx`
- `src/app/[locale]/settings/billing/page.tsx`
- `src/app/[locale]/settings/billing/subscription/page.tsx`
- `src/components/features/property-intelligence/PropertyIntelligencePaywall.tsx`
- `src/components/features/property-intelligence/PropertyIntelligenceAddonCard.tsx`

## Handoff Notes

- esta story deve ser consumida logo após a PM-4
- o módulo precisa continuar visível mesmo quando o acesso estiver bloqueado
- a UX deve vender o desbloqueio sem parecer um bloqueio duro
- a compra deve devolver o utilizador ao fluxo de análise com contexto preservado
- a próxima story da cadeia deve ser DEV-5, focada em implementação do paywall/add-on

## Session Update - 2026-08-26

### What was decided
- o add-on será apresentado dentro da própria experiência da IA Native
- o estado bloqueado precisa manter descoberta, valor e caminho de compra
- o retorno pós-compra é parte da experiência, não um detalhe técnico
- a UX deve reduzir fricção e evitar que o usuário sinta que perdeu a sessão
