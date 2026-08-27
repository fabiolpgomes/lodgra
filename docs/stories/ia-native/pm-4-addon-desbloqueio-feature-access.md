# Story PM-4 - Desbloqueio da IA Native via add-on comercial

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for Review  
**Owner:** @pm  
**Quality Gate:** @architect + @ux + @qa  
**Depends On:** PM-3, DEV-4, UX-3, QA-3

---

## Product Intent

A IA Native já existe como capability nativa no shell.

Os planos `Premium` e `Enterprise` incluem acesso nativo à capability. Os demais planos mantêm o módulo visível e podem desbloqueá-lo via add-on recorrente.

Quando o plano da organização não incluir acesso à capability, o produto não deve criar um beco sem saída. O caminho certo é apresentar a capability, explicar o valor e permitir a compra de um add-on para desbloqueio imediato.

Esta story define o comportamento de produto, monetização e acesso para que Property Intelligence possa ser vendido como add-on sem obrigar o usuário a trocar de plano inteiro.

## Story

**Como** utilizador que não tem o plano com acesso à IA Native,  
**Quero** comprar a capability como add-on,  
**Para que** eu possa usar Property Intelligence sem mudar o meu plano principal.

## Context

O módulo já precisa permanecer visível no menu para descoberta.

Se a organização não tiver direito de uso incluído, o fluxo correto é:
- mostrar a capability no shell
- explicar que o acesso requer add-on
- oferecer compra direta
- ativar a entitlement após pagamento
- evitar qualquer sensação de página escondida ou funcionalidade perdida

Esta story aplica a política core / capability / extension já validada na PM-3:
- Property Intelligence continua como capability
- o acesso extra via add-on é um caminho comercial, não uma nova reclassificação do core
- o produto deve manter a experiência premium e sem ruptura de navegação

## Product Rules

1. A IA Native continua visível no menu.
2. O acesso bloqueado deve virar oferta de add-on, não erro.
3. A compra do add-on não altera o plano principal.
4. O add-on precisa ativar a entitlement de forma imediata após confirmação.
5. Se o add-on já estiver ativo, o fluxo deve abrir normalmente sem paywall.
6. A linguagem comercial deve permanecer clara, premium e em português.
7. O modelo de cobrança do add-on é recorrente.

## Acceptance Criteria

### AC1: Descoberta do módulo
- [ ] A IA Native continua visível no menu mesmo quando o plano não inclui a feature
- [ ] O utilizador entende que a capability existe e pode ser comprada
- [ ] O acesso bloqueado não parece falha de navegação

### AC2: Oferta de add-on
- [ ] O estado bloqueado apresenta uma proposta clara de add-on
- [ ] A oferta explica o valor da capability antes da compra
- [ ] O CTA principal conduz para a compra do add-on
- [ ] A UI não obriga o usuário a trocar de plano inteiro

### AC3: Entitlement e desbloqueio
- [ ] Após compra confirmada, a entitlement é atualizada para a organização
- [ ] O acesso à IA Native passa a funcionar sem retrabalho manual
- [ ] O estado da interface reflete imediatamente que o add-on foi ativado

### AC4: Estados de fallback
- [ ] Se o add-on já estiver ativo, o fluxo abre normalmente
- [ ] Se o pagamento falhar, o utilizador vê um estado claro e recuperável
- [ ] Se a verificação de acesso estiver pendente, a UI mostra carregamento ou instrução apropriada

### AC5: Métrica e rastreabilidade
- [ ] O sistema regista visualização do paywall/add-on
- [ ] O sistema regista início e conclusão da compra
- [ ] O sistema regista desbloqueio da entitlement

## Scope

### In scope
- paywall/upgrade state para IA Native
- compra de add-on como caminho de desbloqueio
- entitlement por organização
- copy comercial da oferta
- atualização da navegação e do estado de acesso

### Out of scope
- mudar o plano principal da organização
- redesenhar o billing inteiro
- criar novos módulos de IA
- alterar a lógica determinística do motor Property Intelligence
- redefinir a política core / capability / extension

## Deliverables

- fluxo de compra de add-on para IA Native
- estado bloqueado com CTA comercial
- entitlement persistida por organização
- copy premium de desbloqueio
- critérios de QA para compra, falha e reentrada

## Suggested File List

- `src/app/[locale]/ia-native/page.tsx`
- `src/app/[locale]/ia-native/analyze/page.tsx`
- `src/components/features/property-intelligence/PropertyIntelligenceWorkbench.tsx`
- `src/components/common/layout/Sidebar.tsx`
- `src/components/common/layout/BottomNav.tsx`
- `src/lib/features/featureGate.tsx`
- `src/lib/billing/addons.ts`
- `src/lib/billing/addon-entitlements.ts`
- `src/app/api/billing/addons/route.ts`
- `src/app/api/billing/addons/[addonId]/checkout/route.ts`
- `src/app/api/features/check/route.ts`
- `src/__tests__/api/billing/addons.test.ts`
- `src/__tests__/components/features/property-intelligence/addon-paywall.test.tsx`

## Handoff Notes

- esta story nasce depois da validação do shell modular e da política de expansão
- o módulo não deve desaparecer quando não houver entitlement
- a compra do add-on deve ser tratada como um caminho natural de monetização
- a UX deve manter a experiência premium e evitar parecer um erro técnico
- a próxima implementação precisa confirmar se a compra será one-off, recorrente ou vinculada à organização como entitlement permanente
- o modelo de cobrança do add-on já foi decidido como recorrente; o preço e a forma exata de checkout ficam para definição posterior

## Session Update - 2026-08-26

### What was decided
- o usuário não deve bater numa parede quando o plano não incluir Property Intelligence
- o produto deve oferecer compra de add-on diretamente do estado bloqueado
- o módulo continua visível no menu para descoberta e upsell
- a monetização passa a ser um caminho explícito da capability, e não apenas uma restrição
- o add-on de Property Intelligence terá cobrança recorrente
