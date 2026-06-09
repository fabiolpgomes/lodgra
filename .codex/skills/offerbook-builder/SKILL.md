---
name: offerbook-builder
description: "Build a Story-Selling Offerbook (Livro da Oferta) interactively, section by section — avatar/persona, oferta, promessa, USP, mecanismo único, autoridade, história e scaffold de copy. Use when the user wants to create, fill, or resume an offerbook / livro da oferta / offer book for a product, course, or community."
user-invocable: true
version: "1.0.0"
argument-hint: "[caminho-do-offerbook.md opcional para retomar]"
---

# Offerbook Builder — Livro da Oferta (Story Selling)

You guide anyone using Claude Code to fill a complete **Offerbook** (Livro da Oferta) interactively, one section at a time. An offerbook is a single document that holds every raw ingredient of a transformation offer — avatar, desire, problem, mechanism, offer, authority, story — and from which all copy (ads, landing pages, emails, webinar) is later assembled.

This skill is **standalone and portable**: it depends on no squad, no script, no repo path. Drop it in any `.claude/skills/` and it works.

## The single most important idea

An offerbook has two orders:

- **Reading order** (how the final copy flows, top-down): Materiais → Posicionamento → Oferta → Autoridade → Avatar → Solução → História → Análise de Cliente → Copy.
- **Construction order** (how the truth is actually built, bottom-up): **Avatar → Solução → Oferta → Autoridade → História → Copy.**

You **conduct the user in construction order** (Avatar first — it is the root from which everything derives) but **render the saved file in reading order** (so it matches the canonical template layout).

> Why: you cannot write the Promessa before you know the Desejo and the maior Objeção (the template literally asks for "principal benefício *sem a maior objeção*"). You cannot write the USP before the Mecanismo exists. The História only *sequences* what earlier blocks already produced — it invents nothing. The Copy is pure assembly of blocks 1–8.

## Non-negotiable: NO INVENTION

Never fabricate avatar data, anchoring prices, testimonials, statistics, or claims. When the user has no real source for a field:

- Mark it as a **gap**, never a guess: `> [TODO] — requer: <input ou seção a montante>`.
- When you *construct* content beyond what the user supplied (e.g. you infer an archetype the user didn't name), tag it with an HTML comment: `<!-- provenance: extrapolated_editorial | confidence: 70 | nota: inferido, não de dados -->`.
- Content the user gave verbatim (from a transcript/data) needs no tag — absence of a tag means `extracted`.

False coverage (a filled field that's actually a guess) is worse than an honest empty one. A scaffolded offerbook with honest gaps tells the user exactly what to go find.

---

## The dependency DAG (enforce this ordering)

```
P0 Materiais/Sources
   │
   ▼
P1 Avatar + Análise de Cliente  ──────────────┐  (ROOT — feeds everything)
   │  Cliente ideal → Desejo → Problema → Erros │
   │  → dores/medos/objeções (3 camadas)        │
   ▼                                            │
P2 Solução  (Solução técnica → Mecanismo único  │
   │         → Bambu chinês → Benefícios)        │
   ▼                                            ▼
P3 Oferta  (Nome → Promessa → USP → Preço)      P4 Autoridade
   │        Promessa BLOCKED até maior objeção   (Especialista + Depoimentos;
   │        + Benefícios existirem;              depoimentos mapeiam objeções de P1)
   │        USP BLOCKED até Promessa+Mecanismo
   └───────────────┬──────────────┘
                   ▼
P5 História  (integra P1–P4 numa curva emocional; gate de integração)
                   │
                   ▼
P6 Copy  (folha — ads/LP/emails/manifesto; só assembly; defere a /copy-chief)
```

**Hard blocks the skill must enforce:**
- **Promessa** blocked until the *maior objeção* (P1) AND *benefícios* (P2) exist.
- **USP** blocked until *Promessa* + *Mecanismo único* exist.
- **História** blocked until P1–P4 have a minimum viable fill.
- **Copy** is always last; never block other phases waiting on it.

When a blocked section comes up, do not silently fill it. Surface the gap and offer: (a) jump to the upstream section now, or (b) record `[GAP]` and continue.

---

## Elicitation contract (how to ask)

Honor these operating rules every turn:

- **One section at a time.** Announce the phase + section + a one-line "why this matters / what it depends on".
- **Ask the template's guiding question verbatim**, then offer a sensible default or 2–3 numbered options. The user can answer `1`/`2`/`3` or free-text. Do **not** stack a long questionnaire.
- **Echo the answer forward** as the input to the next step: *"Com esse Desejo + essa Objeção, sua Promessa provisória é X — confirma?"*
- **Write incrementally** to the output file after each section (rewrite the whole file each time — atomic, crash-safe).
- **Show progress** (the status block) and advance to the next unblocked section.

**Navigation commands** the user can type any time: `pular` (skip → mark TODO), `voltar` (previous section), `ir para <seção>`, `status` (print completion table), `salvar`, `sair`.

---

## Startup

1. If invoked with a path argument, or if a `./offerbook-*.md` exists in CWD with an `offerbook-status` block, offer to **resume**: read the status block and continue at `last_section`. The output file IS the state — no external store.
2. Otherwise ask: **"Qual o nome do produto/oferta? (vira o slug do arquivo)"** and **"Onde salvo? (default: `./offerbook-{slug}.md`)"**. Use a CWD-relative path only — never an absolute path.
3. **Phase 0 gate — sources first.** Ask what real evidence exists about the audience (transcrições, apresentações de membros, pesquisa, depoimentos, brief, dados de preço). If none, warn explicitly: *"Sem fonte real, o avatar vira chute. Posso seguir, mas marcarei tudo derivado como `[gap: fonte necessária]`."* This is the anti-invention gate.

---

## Per-phase guide — what to ask, how to think, when it's good

For each section: **[P]** = the template's guiding question to ask verbatim · **[Pensar]** = the reasoning pattern that makes a good answer · **[Bom?]** = quality check · **[Depende de]** = upstream prerequisites.

### PHASE 1 — Avatar (the engine)

**Cliente ideal (ICP)**
- **[P]** "Escolha um nome para cada tipo de avatar e defina seu perfil. Qual o nível de consciência do avatar?"
- **[Pensar]** Não é "um avatar genérico". São **1–5 arquétipos NOMEADOS** (ex: "O Empreendedor Digital Travado", "O Executivo Exausto"), cada um com **% de distribuição** se houver dados, uma **frase real na boca dele**, e perfil psicográfico. Segmente por **psicografia > demografia**. Defina também **Red Flags** (quem NÃO queremos) e uma **frase-síntese do ICP**.
- **[Bom?]** Cada arquétipo tem nome + (% se há dado) + frase-na-boca? Há Red Flags? Há uma frase única que define o ICP?
- **[Depende de]** Materiais (fonte real). É a fundação de tudo.

**Desejo**
- **[P]** "Qual a UMA coisa que o avatar mais deseja? Por que ele merece conseguir? O que pessoas inferiores ao avatar estão conseguindo?"
- **[Pensar]** O desejo é UM, concreto, mensurável ("1 oferta que cresce todo mês"), não uma lista. A terceira pergunta é a arma: a **indignação por comparação social** ("jovens de 20 anos faturando 6 dígitos com ChatGPT básico") é combustível de movimento.
- **[Bom?]** Desejo singular e mensurável? Há um "merecimento" (história que justifica)? Há comparação social que indigna?
- **[Depende de]** Cliente ideal.

**Problema**
- **[P]** "Qual problema o avatar vive por não ter o que deseja? O que acontece se ele não conseguir? Qual o principal motivo que ELE diz para não conseguir?"
- **[Pensar]** Três camadas obrigatórias: (1) problema central nomeável ("preso no loop de consumir infinito sem transformar em oferta vendável — sabe demais, executa de menos"); (2) **consequências futuras dramatizadas** ("chegará aos 60 ainda dependente de CLT"); (3) **a desculpa que ELE mesmo dá** ("falta tempo", "não sou técnico"), transcrita. O motivo alegado ≠ a causa real — prepara o terreno para tirar a culpa.
- **[Bom?]** Problema é consequência direta da falta do desejo? Consequências projetam um futuro-pesadelo? A desculpa dele está literalmente transcrita?
- **[Depende de]** Desejo.

**Erros** (a engrenagem mais importante)
- **[P]** "O que ele tenta para conseguir o desejo? Por que acredita que é assim? Por que não funciona? Por que NÃO é culpa dele? Então de quem é a culpa?"
- **[Pensar]** É a **Escada da Transferência de Culpa** (5 elos): tentativas reais → por que acredita (prova social) → por que falha → **absolvição** → **vilão externo nomeado**. O avatar tem que sair *vítima de um sistema*, não burro. Ex: "o ecossistema digital foi desenhado pra vender novidade, não resultado" → vilão = "sistema de incentivos perversos que lucra com FOMO".
- **[Bom?]** Os 5 elos presentes? A culpa vai para um inimigo externo nomeável? O avatar é absolvido sem ser infantilizado?
- **[Depende de]** Problema. **Aqui mora a maior objeção** → desbloqueia Promessa e História.

**Análise de cliente (Avatar 2.0 — aprofundamento forense)**
- **[P]** Demográfico, Personalidade, Armadilhas, Dores, Dores escondidas, Medos, Desejos, Desejos profundos, Vida Perfeita, Objeções (da promessa / do produto).
- **[Pensar]** Para cada dor/desejo capture **3 camadas: Superficial (o que ele FALA) / Profundo (o que MOSTRA) / Oculto (o que precisa que ENSINEM)**. Vende-se no Oculto. "Dores escondidas" = inferidas de padrão, não verbalizadas (inveja, terror de obsolescência, culpa). "Vida Perfeita" = narrada como um **dia inteiro cinematográfico**. Objeções = **transcritas na primeira pessoa**, separadas por origem.
- **[Bom?]** Cada dor/desejo tem as 3 camadas? Dores escondidas vêm de inferência sobre padrão (não chute)? Vida Perfeita é vivível/cinematográfica? Dados ancorados em fonte (% e N)?
- **[Depende de]** Cliente ideal + Materiais. Valida e enriquece o avatar.

### PHASE 2 — Solução (a resposta ao avatar)

**Solução técnica (contexto)**
- **[P]** "O que, de forma simples e lógica, faz o avatar conseguir o que mais deseja?"
- **[Pensar]** É a explicação racional/educativa que dá ao avatar um **modelo mental novo** ("ah, então é ASSIM que funciona") — o oposto do "por que não funciona". Um leigo entende em 3 frases e tem o "aha". Prepara a entrada do mecanismo.
- **[Bom?]** Leigo entende em 3 frases? Gera o "aha"? É o oposto lógico do Erro?
- **[Depende de]** Erros.

**Mecanismo único**
- **[P]** "Como funciona o mecanismo que transforma o avatar? Qual a principal vantagem? Por que é diferente do que tem por aí?"
- **[Pensar]** O mecanismo deve ser **nomeado, proprietário (™) e numericamente memorável** (ex: "Pareto ao Cubo: foca nos 0,8% que geram 51,2%"). Sem mecanismo único = commodity. A vantagem é a **diferenciação** que tira você da comparação direta.
- **[Bom?]** Tem nome próprio? Memorável? Explica por que funciona onde os erros falharam? Diferencia da concorrência?
- **[Depende de]** Solução técnica + Erros. É o coração da diferenciação.

**Bambu chinês**
- **[P]** "Qual metáfora representa o mundo atual do avatar? Qual representa o avatar no mundo ideal?"
- **[Pensar]** Um **par de metáforas Ponto A → Ponto B**, visuais e emocionalmente carregadas, em contraste dramático (ex: "morto-vivo corporativo" → "ressurreição profissional/lendário"). Dá imagem visual à transformação abstrata.
- **[Bom?]** Há DUAS metáforas (atual + ideal)? São visuais? Contrastam dramaticamente?
- **[Depende de]** Problema (mundo atual) + Benefícios profundos (mundo ideal).

**Benefícios diretos**
- **[P]** "Quais resultados o avatar terá ao implementar a solução?"
- **[Pensar]** Resultados **funcionais e mensuráveis**, idealmente com prazo ("primeira automação em 30 dias", "10k/mês em 180 dias"). O que ele *consegue fazer*.
- **[Bom?]** São concretos/observáveis? Com prazo? Decorrem do mecanismo?
- **[Depende de]** Mecanismo único.

**Benefícios profundos**
- **[P]** "O que vai acontecer na vida do avatar decorrente de ele conseguir o que deseja?"
- **[Pensar]** Transformações **identitárias e emocionais** — quem ele *se torna*, não o que faz ("acorda segunda animado, não com peso no estômago", "identidade reconstruída: de empregado a empresário", "autoestima restaurada"). É o Mundo Ideal vivido. Regra ouro: **direto = o que FAZ; profundo = quem se TORNA**.
- **[Bom?]** Toca identidade/emoção/relações (não só dinheiro/tempo)? É o "depois" emocional do bambu chinês?
- **[Depende de]** Benefícios diretos + Desejos profundos.

**Objeções (nível solução)**
- **[P]** "Qual a maior objeção quando ele souber da solução? Quais objeções menores?"
- **[Pensar]** Frases **literais na boca do avatar** ("R$988 é muito para testar mais uma coisa", "vou aprender sozinho no YouTube"), separadas em maior vs menores e por origem. Cada uma idealmente tem um depoimento/argumento que a mata (ver Depoimentos).
- **[Bom?]** Primeira pessoa, como ele fala? Maior separada das menores?
- **[Depende de]** Avatar + Erros.

### PHASE 3 — Oferta (agora "subindo" para o posicionamento)

**Nome do produto**
- **[P]** "O nome deve conter um substantivo que representa o objeto da transformação e um adjetivo que o torna superlativo."
- **[Pensar]** O nome aponta para o **Ponto B aspiracional**, não para a mecânica/feature. Substantivo-transformação + adjetivo-superlativo (ex: "Comunidade Lendár[IA]").
- **[Bom?]** Tem substantivo-transformação + adjetivo-superlativo? Aponta pro desejo profundo? Memorável/pronunciável?
- **[Depende de]** Desejo profundo + Mundo Ideal.

**Promessa** *(BLOQUEADA até maior objeção + benefícios)*
- **[P]** "Qual o principal benefício SEM a maior objeção?"
- **[Pensar]** **Promessa = maior benefício − maior objeção**, numa frase. Não é só o desejo; é o desejo *com a objeção central já desarmada* (ex: transforma "já tentei de tudo, perdi tempo" em ativo: "20 anos de cicatrizes = vantagem competitiva").
- **[Bom?]** Contém o maior benefício E desarma a maior objeção na mesma frase? Crível dado o avatar?
- **[Depende de]** Desejo + maior Objeção + Benefícios. **Bloqueante.**

**USP** *(BLOQUEADA até Promessa + Mecanismo)*
- **[P]** "Comunique em uma frase: principal benefício + mecanismo único + explicação do método."
- **[Pensar]** USP = Promessa + COMO (mecanismo nomeado) numa frase só.
- **[Bom?]** As 3 peças cabem numa frase? O mecanismo é nomeado e proprietário?
- **[Depende de]** Promessa + Mecanismo único.

**Insight Mestre / Big Idea** (opcional mas poderoso)
- **[Pensar]** Uma frase que captura o que você **realmente** vende, não o produto literal (ex: "ressurreição profissional para mortos-vivos corporativos", não "curso de IA"). O produto real raramente é o produto.

**Valor, ancoragem e bônus**
- **[P]** "Qual o valor de ancoragem? Quais os bônus (e valores)? De quanto é o desconto? Por quê esse desconto? Condições de pagamento? Garantia? Qual bônus encantaria o avatar? Quanto custa a alternativa do mercado? Qual a escassez?"
- **[Pensar]** **Ancoragem verificável, NUNCA inventada** (ex: R$8.400 = "valor das IAs separadas" — tangível). Desconto dramatizado em **R$ absoluto E %** ("R$8.302 de economia, 98%"). **Garantia com personalidade** ("Anti-Tédio de 30 dias" > "30 dias"). Bônus-encantamento identificado a partir dos desejos profundos.
- **[Bom?]** Ancoragem real (não chute)? Desconto em R$ E %? Garantia nomeada? Bônus-encantamento? Alternativa precificada?
- **[Depende de]** Conteúdo + Avatar. **Gate anti-invenção** — números vêm de fonte real.

**Conteúdo do treinamento**
- **[P]** "Quais são os módulos? Qual a principal técnica de cada um e o que ela faz?"
- **[Pensar]** Cada módulo = **nome + outcome** (não só título): "Engenharia de Prompts → prompts que funcionam vs genéricos". A soma dos módulos tem que **sustentar a Promessa**.
- **[Bom?]** Cada módulo tem técnica + outcome? A soma sustenta a Promessa?
- **[Depende de]** Promessa.

### PHASE 4 — Autoridade

**Especialista**
- **[P]** "Quais títulos/qualificações? Quais resultados somados dos alunos? O que acredita/defende? Qual a personalidade?"
- **[Pensar]** Duas camadas: **factual** (números verificáveis) + **mítica/propósito** (reposiciona credenciais como prova de uma crença, não vaidade). Personalidade vendida via **contradições que humanizam** ("intenso que busca paz").
- **[Bom?]** Números verificáveis + narrativa de propósito? Conecta ao avatar? Contradições humanizam?
- **[Depende de]** Crenças do avatar.

**Depoimentos**
- **[P]** "Quais mostram os melhores resultados? Quais mostram as principais situações? Quais resolvem as principais objeções?"
- **[Pensar]** Organizados por **função persuasiva**, não por autor (ex: Pertencimento / Qualidade / Transformação). Cada depoimento mapeado a uma **objeção/desejo específico**. **Vêm de fonte real — nunca inventados.**
- **[Bom?]** Cada depoimento mapeia a uma objeção/desejo? Cobrem os 3 eixos (resultado, situação, objeção)?
- **[Depende de]** Objeções + Avatar. **Gate anti-invenção.**

### PHASE 5 — História (integração)

- **[P]** A estrutura v2 (sequência de copy completa): [Atenção] → Boas-vindas → Promessa → Lead → Problema+consequências → por que acontece → erros+por que acreditam → por que não funciona → (opcional: piora) → tirar a culpa → inimigo comum → outra solução que funciona → provas → mecanismo único → exemplo/big idea → mundo ideal → bônus c/ escassez → objeções.
- **[Pensar]** A História **não cria conteúdo novo** — ela **sequencia** os blocos P1–P4 numa curva emocional de sales letter (Atenção → Problema → Culpa → Solução → Prova → Oferta). Cada slot puxa de um campo já preenchido.
- **[Bom?]** Cada beat traça a um campo a montante? A ordem respeita a curva? Tem o "exemplo/big idea" que torna o mecanismo tangível?
- **[Depende de]** TODOS os blocos P1–P4. Se aparecer info nova aqui, ela pertence a um bloco anterior — volte e preencha lá.

### PHASE 6 — Copy (folha, handoff)

- **[P]** Ads (×5), Landing Page (A/B/C), Emails, Webinar, Manifesto.
- **[Pensar]** Copy é **montagem dos blocos** P1–P5 — nada novo. Este skill produz o **scaffold + trace links** para cada peça e marca `> [TODO — camada de copy: ver /copy-chief]`. Não duplique a metodologia de copy aqui.
- **[Bom?]** Cada peça só usa material que já existe nos blocos anteriores?
- **[Depende de]** TODOS os blocos. Sempre o último.

---

## Princípios de copy a reforçar ao longo do caminho

Cite-os quando ajudarem o usuário a decidir:

1. **Promessa = Benefício − Maior Objeção.**
2. **3 camadas do desejo/dor:** Superficial (FALA) / Profundo (MOSTRA) / Oculto (ENSINA) — vende-se no Oculto.
3. **Escada da Transferência de Culpa:** Tentativa → Crença → Falha → Absolvição → Vilão nomeado.
4. **Mecanismo Único nomeado e proprietário** (™ + número memorável) — tira do mercado de comparação.
5. **Ancoragem verificável, nunca inventada;** desconto em R$ absoluto + %.
6. **Garantia com personalidade** (nomeada).
7. **Bambu chinês:** par de metáforas Ponto A ↔ Ponto B.
8. **Benefício Direto (o que FAÇO) vs Profundo (quem me TORNO).**
9. **Depoimento como antídoto de objeção** — mapeado, não decorativo.
10. **ICP por arquétipos com % e frase-na-boca;** Red Flags tão importantes quanto Green Flags.
11. **Indignação por comparação social** ("o que pessoas inferiores estão conseguindo").
12. **O inimigo comum** — externaliza a culpa num vilão nomeável; une a tribo.
13. **História não inventa, sequencia.**
14. **Manifesto como filtro** ("não é para todos") — repelir reforça pertencimento.
15. **Insight Mestre / Big Idea** — o que você REALMENTE vende ≠ o produto literal.

---

## Anti-patterns to block or warn

| Erro | O que você faz |
|---|---|
| Escrever a Promessa primeiro | Bloqueia: exige Desejo + maior Objeção antes. |
| Avatar genérico ("homens 30–50") | Força arquétipos nomeados + psicografia + frase-na-boca + %. |
| Pular a escada de culpa | Exige os 5 elos terminando num vilão externo nomeado. |
| Confundir benefício direto com profundo | Separa: direto = faz, profundo = torna-se. |
| Inventar ancoragem/depoimento/número | **Gate anti-invenção**: vem de fonte real, senão `[gap]`. |
| Mecanismo sem nome / genérico | Exige nome proprietário + número memorável + diferenciação. |
| Objeção parafraseada | Exige primeira pessoa, como o avatar fala. |
| História inventando conteúdo novo | Avisa: ela só sequencia blocos já preenchidos. |
| Garantia genérica | Sugere nomear/dar personalidade. |
| Copy antes do offerbook pronto | Bloqueia: Copy é o último bloco. |
| Pular a camada Oculto | Força as 3 camadas. |
| Esquecer Red Flags | Pede explicitamente. |
| Desconto só em % (ou só R$) | Exige os dois. |
| Especialista = só credenciais | Exige camada de propósito + contradições. |

---

## Output template (render in READING order)

Save to the user-confirmed path (default `./offerbook-{slug}.md`). Always keep the headings even when empty — an empty heading with a `[TODO]` is honest; a fabricated value is not. Begin the file with the status block (this is the resume state).

```markdown
<!-- offerbook-status
produto: {nome}
phase_completion:
  P0_materiais: todo|partial|done
  P1_avatar: todo|partial|done
  P2_solucao: todo|partial|done
  P3_oferta: todo|partial|blocked|done
  P4_autoridade: todo|partial|done
  P5_historia: todo|partial|blocked|done
  P6_copy: todo|handoff:/copy-chief
last_section: {ex: avatar.objecoes}
-->

# Livro da Oferta (Story Selling) — {Nome da Oferta}

## Materiais
### Links Social Media / URLs
### Materiais (referência)
### Conteúdos de referência

## Posicionamento
### Oferta
#### Nome do produto
#### Promessa
#### Unique Selling Proposition
#### Insight Mestre / Big Idea
#### Valor, ancoragem e bônus
#### Conteúdo do treinamento
### Autoridade
#### Especialista
#### Depoimentos

## Avatar
### Cliente ideal (Design de Cliente)
### Desejo
### Problema
### Erros

## Solução
### Solução técnica (contexto)
### Mecanismo único
### Bambu chinês
### Objeções
### Benefícios diretos
### Benefícios profundos

## História
<!-- estrutura v2: Atenção → Boas-vindas → Promessa → Lead → Problema →
     porque → erros → porque não funciona → tira-culpa → inimigo comum →
     solução que funciona → provas → mecanismo → exemplo → mundo ideal →
     bônus c/ escassez → objeções -->

## Análise de Cliente
### Demográfico
### Personalidade
### Armadilhas
### Dores
### Dores escondidas
### Medos
### Desejos
### Desejos profundos
### Vida Perfeita
### Objeções (da promessa / do produto)

## Copy
### Ads
### Landing Page (A / B / C)
### Emails
### Webinar
> [TODO — camada de copy: ver /copy-chief]
```

For each unfilled section write the heading + `> [TODO] — requer: <input ou seção a montante>`. For a blocked derivation write `> [GAP] <campo> requer <upstream>`. Never leave a fabricated value.

---

## Resume

To resume, read the `offerbook-status` block of an existing `./offerbook-*.md`, reconstruct done/partial/blocked from `phase_completion`, and continue at `last_section`. The output file is the single source of truth — no external state, fully portable across machines.
