# 01 — Domínio e regras de negócio

Fonte da verdade: `src/lib/validation/motor.ts` (núcleo puro),
`src/lib/validation/motorEmenda.ts` (camada com banco),
`src/lib/authz.ts`, `src/lib/actions/emendas.ts`.

## Glossário mínimo (para quem não é do orçamento público)

| Termo | O que é |
| --- | --- |
| **Exercício** | O ano orçamentário. É o contexto global de **todos** os dados da aplicação. Escolhido na topbar, guardado em cookie. |
| **PPA** | Plano Plurianual — planejamento de 4 anos. Define os **programas**. |
| **LDO** | Lei de Diretrizes Orçamentárias — define as **prioridades e metas** do ano. |
| **LOA** | Lei Orçamentária Anual — o orçamento propriamente dito, com as **dotações**. |
| **Dotação** | A linha do orçamento. Combinação completa de Órgão + Unidade + Função + Subfunção + Programa + Ação + Natureza da Despesa + Fonte de Recurso, com um valor. |
| **Classificação funcional-programática** | O conjunto de códigos acima. É padronizada nacionalmente (ex.: Função `10` = Saúde, `12` = Educação). |
| **Instrumento** | Um documento: PPA/LDO/LOA, em uma de duas espécies — `PROJETO_LEI` (o que o Executivo envia, base das emendas) ou `LEI_APROVADA` (depois da sanção). |
| **Emenda impositiva** | Emenda cuja execução é obrigatória para o Executivo. |
| **Cota** | Valor máximo que **cada** vereador pode emendar no exercício. |
| **Reserva da saúde** | Percentual da cota que só pode ser destinado à saúde. |
| **Impedimento técnico** | Motivo legal pelo qual o Executivo pode não executar uma emenda impositiva (CF art. 166 §11). **Não modelado no sistema — ver gap P1.** |

## Ciclo de vida da emenda

```
RASCUNHO ──validar──► VALIDA ──submeter──► SUBMETIDA ──parecer──► APROVADA
    │                    ▲                     │                └─► REJEITADA
    └──validar──► INVALIDA┘  (correção)        │
                                    (EM_TRAMITACAO existe no enum,
                                     mas não é usado pelas actions)
```

Regras duras:

- `submeterEmenda` **sempre reexecuta o motor no servidor** antes de mudar o
  status. O botão desabilitado no cliente é conveniência, não segurança.
- Só emendas em `SUBMETIDA` podem ser aprovadas/rejeitadas.
- Aprovar/rejeitar **exige parecer textual** (`parecerSchema`, mínimo 1 char) —
  mas o parecer é gravado no `AuditLog`, não em entidade própria (dívida
  reconhecida na análise regulatória).
- `EM_VALIDACAO` e `EM_TRAMITACAO` existem no enum mas não são atribuídos por
  nenhuma action — são estados mortos hoje.

## Ciclo de vida do instrumento

`EM_ELABORACAO → ENVIADO → EM_TRAMITACAO → APROVADO → SANCIONADO → VIGENTE → ENCERRADO`

**Detalhe crítico e não óbvio:** o motor só aceita emendas quando o instrumento
base está exatamente em **`EM_TRAMITACAO`** (`STATUS_BASE_ABERTO` em
`motor.ts:60`). Qualquer outro status derruba a checagem
`INSTRUMENTO_BASE_ABERTO` e invalida a emenda. Se numa demo "nada funciona",
esse costuma ser o motivo.

## O motor de validação — as 10 checagens

Chamada: `avaliarEmenda(ctx)` recebe **todo o contexto já carregado** (não faz
I/O) e devolve `{ resultado, itens[] }`. Cada item tem `codigo`, `descricao`,
`status` (`OK` | `FALHA` | `ALERTA`) e `detalhe` em português.

> **Regra de agregação:** a emenda é `INVALIDA` se **algum** item estiver em
> `FALHA`. `ALERTA` nunca impede.

| # | Código | O que confere | Pode ser configurável? |
| --- | --- | --- | --- |
| 1 | `EXERCICIO_ABERTO` | `Exercicio.status === ABERTO` | não |
| 2 | `INSTRUMENTO_BASE_ABERTO` | instrumento base em `EM_TRAMITACAO` | não |
| 3 | `DOTACAO_EXISTE` | a dotação existe **e** pertence ao mesmo instrumento base e exercício | não |
| 4 | `PROGRAMA_NO_PPA` | o programa da dotação consta no PPA do exercício | vira `ALERTA` se não houver PPA cadastrado **ou se o PPA estiver cadastrado sem programas** — ver nota abaixo |
| 5 | `ACAO_VINCULADA` | a ação pertence ao programa da dotação | não |
| 6 | `CLASSIFICACAO_COMPLETA` | todos os 8 componentes por FK presentes | não |
| 7 | `ADERENCIA_LDO` | programa/ação consta nas prioridades da LDO | **sim** — parâmetro `ADERENCIA_LDO`, modo `BLOQUEANTE`/`ALERTA` |
| 8 | `LIMITE_VALOR_AUTOR` | soma das emendas `VALIDA`+`SUBMETIDA` do autor no exercício + esta ≤ teto | **sim** — parâmetro `TETO_VALOR_AUTOR`; sem parâmetro → passa |
| 9 | `TIPO_COERENTE` | `REMANEJAMENTO` exige origem e destino distintos; `ANULACAO` não pode exceder o saldo da dotação | não |
| 10 | `RESERVA_SAUDE` | as emendas **fora da saúde** do autor não podem ultrapassar `teto × (1 − pct/100)` | **sim** — `RESERVA_SAUDE_PERCENTUAL` + modo |

### `PROGRAMA_NO_PPA` confere uma regra real sobre um dado que não temos

A exigência é municipal e não foi inventada: **LOM art. 140, §1º, I** — "as
emendas […] serão admitidas desde que: I - sejam compatíveis com o Plano
Plurianual e com a Lei de Diretrizes Orçamentárias" —, repetida na **LDO 2027,
art. 23, §1º, I**.

O que é frágil é a implementação, herdada do protótipo original: `programasNoPPA`
é derivado das **dotações** ligadas ao instrumento PPA. Só que **PPA não tem
dotação** — ele tem programas, ações e metas plurianuais; dotação é peça da LOA.

Enquanto o protótipo não cadastrava PPA nenhum, isso era invisível: sem
instrumento, a checagem caía no ramo `ALERTA` e não incomodava ninguém. Quando a
base real de Mogi Guaçu passou a criar o instrumento PPA (Lei 6.245/2025) sem
dados — commit `173eb53` —, a checagem migrou sozinha para o ramo que reprova, e
**toda emenda nova nascia INVÁLIDA** com a mensagem "Programa não consta no PPA
do exercício". Nada em `motor.ts` havia sido tocado.

Duas correções em 20/08/2026, na mesma tarde:

1. **Conjunto vazio passou a significar "não dá para conferir"**, não "nenhum
   programa consta". A checagem sai em `ALERTA` dizendo isso, em vez de reprovar
   tudo. Coberta por teste de regressão em `motor.test.ts`.
2. **A origem do dado mudou.** `programasNoPPA` não vem mais de dotações, e sim
   da flag `Programa.constaNoPPA`, preenchida a partir do Anexo II do PPA
   2026-2029. Os 47 programas da base foram **todos** localizados no PPA — a
   compatibilidade se sustenta integralmente para este exercício. Evidência item
   a item em `docs/better/dados/ppa-2026-2029-programas.json`.

A granularidade é **programa**, não ação: o TCE-SP cobra emendas "compatíveis com
os **programas de governo** e os planos setoriais vigentes".

> **Lição de método:** o seed de 2027 derivava `programasNoPPA` de forma mais
> permissiva que o runtime (todos os programas do exercício). Por isso as 43
> emendas de demonstração apareciam válidas enquanto qualquer emenda criada de
> verdade era reprovada. Semente que valida diferente do produto não demonstra o
> produto — as duas derivações agora são idênticas.

### A regra da reserva da saúde — a sutileza que custou 3 commits

A reserva **é um LIMITE, não uma obrigação**. Foi corrigido explicitamente nos
commits `b0236de` ("reserva da saúde é LIMITE, não obrigação") e `745cc98`.

- ❌ Errado: "o vereador **tem que** gastar 50% da cota em saúde".
- ✅ Certo: "as **demais áreas** não podem passar de 50% da cota. Apresentar
  emenda é faculdade do autor — ele pode não usar a cota inteira."

Consequência no motor: emendas de saúde **nunca falham** nesta checagem; as
demais consomem o limite `cota × (1 − pct/100)`.

"Saúde" é determinado pelo **código da Função** da dotação, comparado ao
parâmetro `FUNCAO_SAUDE` (padrão `"10"`, o código federal de Saúde).

## Parâmetros de validação (`ParametroValidacao`)

Tabela chave/valor com escopo `GERAL` ou `EXERCICIO`. **O parâmetro do
exercício sobrepõe o GERAL.** Cada um pode citar um `DocumentoNormativo` como
fundamento jurídico (`fundamentoNormaId`) — bom detalhe para a UI expor.

| Chave | Tipo | Usado por | Semântica |
| --- | --- | --- | --- |
| `TETO_VALOR_AUTOR` | número (R$) | motor + todos os painéis | Cota individual por vereador. Base de quase toda a matemática das telas. |
| `RESERVA_SAUDE_PERCENTUAL` | número (%) | motor + painéis | % da cota reservado à saúde (limite das demais áreas). |
| `FUNCAO_SAUDE` | código | motor + agregações | Código da Função que representa Saúde. Padrão `"10"`. |
| `ADERENCIA_LDO` | `"true"` + `modo` | motor | Liga/ajusta a checagem 7. |
| `PERCENTUAL_IMPOSITIVO` | número (%) | apenas informativo nos painéis | % da RCL destinado a emendas impositivas. |
| `RCL` | número (R$) | apenas informativo | Receita Corrente Líquida — base do cálculo impositivo. |
| `NUMERO_AUTORES` | inteiro | painéis | Nº de parlamentares do exercício. **Define o teto global** = cota × nº autores. Sem ele, cai na contagem de `Autor` cadastrados (que pode incluir contas demo → número errado). Corrigido no commit `36e8745`. |

Valores do seed (município fictício 2025): teto `500000`, impositivo `1.5`,
aderência LDO `true`/`ALERTA`, reserva saúde `50`/`ALERTA`.

## Regras de autorização (`src/lib/authz.ts` — funções puras, testadas)

| Função | Quem pode |
| --- | --- |
| `podeCriarEmenda` | `LEG_ADMIN`, `LEG_TECNICO`, `LEG_AUTOR` (+ `SUPER_ADMIN`) |
| `podeTramitar` | `LEG_ADMIN`, `LEG_TECNICO` (+ `SUPER_ADMIN`) |
| `podeGerirEmenda` | Mesa/Técnico: qualquer emenda. `LEG_AUTOR`: **só as próprias** (`autor.usuarioId === ator.id`) |
| `podeGerirExercicio` | `EXEC_ADMIN`, `LEG_ADMIN` (+ `SUPER_ADMIN`) |
| `ehAdminDoPoder` | admin do respectivo Poder |

`SUPER_ADMIN` passa por tudo, sempre.

## Importação da base estruturada

Pipeline em `src/lib/import/`, disparado por
`Configurações → Instrumentos → Gerar base`.

```
arquivo (CSV/XLSX)
  → parse.ts        lê o workbook; aba de dotações + aba `prioridades_ldo`
  → validar.ts      Zod linha a linha; devolve linhas válidas + ErroLinha[]
  → derivar.ts      deriva Órgãos/UOs/Funções/…/Fontes únicos das linhas
  → integridade.ts  só importa a dotação se TODOS os componentes existirem
  → importar.ts     upserts + criação das Dotacao, dentro do instrumento
```

Colunas esperadas na aba de dotações:

```
orgao_codigo, orgao_nome, unidade_codigo, unidade_nome, funcao_codigo,
funcao_nome, subfuncao_codigo, subfuncao_nome, programa_codigo, programa_nome,
acao_codigo, acao_nome, acao_tipo, natureza_codigo, natureza_categoria,
natureza_grupo, natureza_modalidade, natureza_elemento, fonte_codigo,
fonte_nome, valor_inicial
```

`acao_tipo` ∈ `PROJETO | ATIVIDADE | OPERACAO_ESPECIAL`.
Aba `prioridades_ldo`: `programa_codigo`, `acao_codigo` (opcional), `descricao`.

⚠️ **Armadilha operacional real:** colunas de código precisam estar formatadas
como **Texto** no Excel, senão zeros à esquerda somem (`0012` → `12`) e a
integridade referencial quebra silenciosamente. Isso é um problema de UX de
importação que vale atacar (validação + preview antes de confirmar).

## Beneficiário final e deduplicação

`Beneficiario` é entidade **global** (atravessa exercícios), com `@@unique(nome)`.
Foi adicionada para atender a rastreabilidade "ponta a ponta" exigida pelo
STF/TCE. Existe uma ação `derivarBeneficiarios()` que extrai beneficiários do
texto do campo `objeto` das emendas — o que gera variantes de grafia
("Santa Casa" × "Santa Casa de Misericórdia").

`src/lib/beneficiarios-dedup.ts` (núcleo puro, 9 testes) agrupa candidatos a
duplicata por tokens — inclusive por subsequência ordenada com folga ≤2
(commit `2393ca8`). A **mesclagem é sempre confirmada pelo usuário** na aba
Beneficiários das Configurações.
