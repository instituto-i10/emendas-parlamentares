# 02 — Modelo de dados

Fonte: `prisma/schema.prisma` (631 linhas, bem comentado em português).
Banco: PostgreSQL (Neon). Migrations em `prisma/migrations/` (duas: `0_init` e
`20260714120000_beneficiario`).

## Princípio estrutural

> **Toda classificação orçamentária é por chave estrangeira. Nunca string
> solta.** Não existe `programa: String` em lugar nenhum — existe
> `programaId: String` com FK para `Programa`.

Isso é o que torna impossível "inventar" uma classificação e é o que sustenta
todas as agregações dos painéis.

## Mapa das entidades

```
Exercicio (ano, status) ◄──── raiz de contexto de TUDO
  │
  ├─ classificação orçamentária (todos escopados por exercício)
  │    Orgao ──< UnidadeOrcamentaria
  │    Funcao ──< Subfuncao
  │    Programa ──< Acao
  │    NaturezaDespesa
  │    FonteRecurso
  │    PrioridadeLDO (→ Programa, → Acao?)
  │
  ├─ InstrumentoPlanejamento (PPA|LDO|LOA × PROJETO_LEI|LEI_APROVADA)
  │    │   auto-relação: LEI_APROVADA.instrumentoOrigemId → PROJETO_LEI
  │    └──< Dotacao ─── 8 FKs de classificação + valorInicial/valorAtual
  │
  ├─ Emenda ── FK obrigatória p/ Dotacao, InstrumentoPlanejamento, Autor
  │    │       FK opcional p/ Beneficiario, dotacaoOrigem, dotacaoDestino
  │    └──< ValidacaoEmenda (resultado + itens em JSON)
  │
  └─ ParametroValidacao (escopo GERAL ou por exercício)
       └─ FK opcional → DocumentoNormativo (fundamento jurídico)

Autor ──1:1?── User          Beneficiario (global, @@unique(nome))
User ──< AuditLog            DocumentoNormativo (LOM | RI | OUTRO)
Auth.js: User, Account, Session, VerificationToken
```

## Convenções

- **IDs:** `cuid()` em tudo.
- **Idioma:** domínio em **português**; modelos do Auth.js em **inglês** (exigência
  do `@auth/prisma-adapter`). FKs para usuário no domínio usam `usuarioId`.
- **Dinheiro:** `Decimal @db.Decimal(18,2)`. ⚠️ Chega no JS como
  `Prisma.Decimal` — o código converte com `Number(...)` antes de usar. Cuidado
  ao criar novos componentes: `Decimal` não é `number` e não serializa direto
  para Client Component.
- **Timestamps:** `createdAt` / `updatedAt` em todas as entidades de domínio.
- **Cascade:** quase tudo `onDelete: Cascade` a partir de `Exercicio` — apagar
  um exercício apaga o mundo dele. FKs de classificação dentro de `Dotacao` são
  `Restrict` (default), então componentes em uso não somem por acidente.

## Entidades-chave em detalhe

### `Dotacao` — a linha do orçamento

Índice único composto por **instrumento + os 8 componentes de classificação**.
Ou seja: a mesma classificação não pode existir duas vezes no mesmo instrumento.
Guarda `valorInicial` e `valorAtual` (o segundo existe para refletir o efeito
das emendas — hoje as actions **não atualizam** `valorAtual`; ver gap).

### `Emenda`

| Campo | Nota |
| --- | --- |
| `numero` | único por exercício (`@@unique([exercicioId, numero])`) |
| `dotacaoId` | **obrigatório** — é o que impede emenda fora do orçamento |
| `instrumentoBaseId` | o PROJETO_LEI sobre o qual foi apresentada |
| `tipo` | `ACRESCIMO` \| `ANULACAO` \| `REMANEJAMENTO` \| `IMPOSITIVA` |
| `objeto` | texto livre — **é daqui que os beneficiários são derivados** |
| `justificativa` | texto livre |
| `valor` | `Decimal(18,2)` |
| `beneficiarioId` | opcional — rastreabilidade STF/TCE |
| `dotacaoOrigemId` / `dotacaoDestinoId` | só para `REMANEJAMENTO` |

### `ValidacaoEmenda`

Histórico de cada execução do motor. `itens` é `Json` — o array de
`ItemValidacao` serializado. Permite mostrar a evolução da validação de uma
emenda ao longo do tempo (**a UI hoje só mostra o resultado mais recente** —
oportunidade de UX).

### `ParametroValidacao`

`@@unique([exercicioId, chave])`. `modo` (`BLOQUEANTE`|`ALERTA`) só faz sentido
para as chaves que o motor consulta. `fundamentoNormaId` + `fundamentoDescricao`
permitem exibir "esta regra existe por causa do art. X da LOM" — hoje
subaproveitado na interface.

### `AuditLog`

`entidade`, `entidadeId`, `acao`, `dadosAntes`/`dadosDepois` (JSON), `usuarioId`,
`criadoEm`. Gravado por `registrarAuditoria()`, que **nunca lança exceção** —
auditoria não pode derrubar a operação principal.

⚠️ O **parecer** de aprovação/rejeição de emenda vive aqui, em
`dadosDepois.parecer`. Não é entidade própria. Isso significa que "ver o
parecer de uma emenda" exige varrer o AuditLog — dívida reconhecida.

## Enums (todos em `src/generated/prisma/enums`)

| Enum | Valores |
| --- | --- |
| `Poder` | `LEGISLATIVO`, `EXECUTIVO` |
| `Role` | `SUPER_ADMIN`, `EXEC_ADMIN`, `EXEC_PLANEJAMENTO`, `EXEC_CONSULTA`, `LEG_ADMIN`, `LEG_TECNICO`, `LEG_AUTOR`, `LEG_CONSULTA` |
| `StatusExercicio` | `ABERTO`, `ENCERRADO` |
| `TipoInstrumento` | `PPA`, `LDO`, `LOA` |
| `EspecieInstrumento` | `PROJETO_LEI`, `LEI_APROVADA` |
| `StatusInstrumento` | `EM_ELABORACAO`, `ENVIADO`, `EM_TRAMITACAO`, `APROVADO`, `SANCIONADO`, `VIGENTE`, `ENCERRADO` |
| `TipoAcao` | `PROJETO`, `ATIVIDADE`, `OPERACAO_ESPECIAL` |
| `TipoNorma` | `LOM`, `REGIMENTO_INTERNO`, `OUTRO` |
| `EscopoParametro` | `GERAL`, `EXERCICIO` |
| `ModoValidacao` | `BLOQUEANTE`, `ALERTA` |
| `TipoBeneficiario` | `ADMINISTRACAO_DIRETA`, `ADMINISTRACAO_INDIRETA`, `TERCEIRO_SETOR` |
| `TipoEmenda` | `ACRESCIMO`, `ANULACAO`, `REMANEJAMENTO`, `IMPOSITIVA` |
| `StatusEmenda` | `RASCUNHO`, `EM_VALIDACAO`, `VALIDA`, `INVALIDA`, `SUBMETIDA`, `EM_TRAMITACAO`, `APROVADA`, `REJEITADA` |
| `ResultadoValidacao` | `VALIDA`, `INVALIDA` |

**Rótulos em português** para todos eles estão centralizados em
`src/lib/rotulos.ts` (`ROTULO_STATUS_EMENDA`, `ROTULO_TIPO_EMENDA`, …). Use
sempre esse módulo na UI — nunca escreva o enum cru na tela.

## Dados de demonstração (`src/lib/seed-data.ts`)

Município fictício, exercício **2025**, PL `PL 45/2024` (LOA, `EM_TRAMITACAO`):

- 3 órgãos (Governo, Educação, Saúde), 3 funções, 5 programas, 12 ações,
  3 naturezas, 2 fontes;
- 8 usuários de demonstração, um por papel, senha `mudar@123`
  (repertório completo em [`../contas-demo.md`](../contas-demo.md));
- apenas o perfil **Vereador** tem `Autor` vinculado — é o único que apresenta
  emendas em nome próprio;
- o seed é **idempotente** (upserts): alterar senha direto no banco é
  sobrescrito se o seed rodar de novo.


## Plano de trabalho simplificado

Duas entidades acrescentadas em 20/08/2026, a pedido do jurídico do cliente.

| Modelo | Papel |
| --- | --- |
| `PlanoTrabalho` | 1:1 com `Emenda`. Guarda justificativa, objetivo, a declaração da entidade e o token do link de preenchimento externo. |
| `ItemPlanoTrabalho` | Linha da planilha orçamentária: descrição, quantidade e valor unitário. O total é **derivado**, nunca gravado. |

**Não é o plano de trabalho do MROSC.** O plano completo da Lei 13.019/2014 —
metas no formato Audesp, matriz de indicadores, memória de cálculo de RH, rateio
de custos indiretos, cronograma de desembolso — é elaborado na **execução
orçamentária**, quando o município for de fato repassar o recurso à entidade.
O que existe aqui é o mínimo da apresentação da emenda.

O que o plano exige depende da **categoria do beneficiário final** — a categoria
define o rito, não é rótulo:

| Categoria | Exige |
| --- | --- |
| `TERCEIRO_SETOR` | justificativa própria (da entidade) + objetivo + declaração + planilha que fecha com o valor da emenda |
| `ADMINISTRACAO_DIRETA` | nada além da justificativa **da emenda** |
| `ADMINISTRACAO_INDIRETA` | nada além da justificativa **da emenda** |

### A justificativa não é pedida duas vezes (24/08/2026)

`reusaJustificativaDaEmenda(categoria)` é falso só no terceiro setor. Fora dele,
`Emenda.justificativa` **é** a justificativa do plano:

- no terceiro setor quem escreve é a ENTIDADE, pelo link, e o texto dela não pode
  sobrescrever o do vereador — são duas vozes, e por isso dois campos;
- na administração pública não há entidade externa nenhuma. É o mesmo vereador,
  na mesma tela, e pedir o mesmo texto duas vezes é atrito puro.

`planoEfetivo(plano, categoria, justificativaDaEmenda)` aplica a regra e é usado
**no motor**, não só na tela. Consequência prática: uma emenda de secretaria sem
nenhuma linha de `PlanoTrabalho` no banco não é pendência — não há o que
preencher além do que já está na emenda. O bloco 3 do formulário mostra a
justificativa da emenda em leitura, para quem preenche ver que já está atendida.

As regras são puras e vivem em `src/lib/plano-trabalho.ts`, testadas em
`src/lib/__tests__/plano-trabalho.test.ts`. O motor consome o resultado pela
checagem `PLANO_TRABALHO`, que é requisito da **remessa** — nunca do rascunho.
Beneficiário não informado é **alerta**, não falha: sem categoria não dá para
saber o que o plano precisa conter.

### Token de preenchimento pela entidade

`PlanoTrabalho.token` é a credencial de uma rota pública
(`/plano-trabalho/<token>`) que a entidade beneficiária abre sem ter conta no
sistema. 32 bytes de entropia, validade de 30 dias, revogável pelo gabinete.
A rota é liberada no `authorized` de `src/lib/auth.config.ts`; a conferência de
validade e o rate limit ficam na própria ação. Depois que a emenda sai do
rascunho, o link para de funcionar mesmo dentro do prazo.
