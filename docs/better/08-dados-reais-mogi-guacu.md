# 08 — Dados reais: Mogi Guaçu, PPA 2026-2029 e LDO 2027

> Análise dos quatro arquivos enviados pelo Emerson Pontes em 19/08/2026, que
> substituem a expectativa de "puxar o banco Neon do projeto original".
> Arquivos em `../../../dados-recebidos/` (fora do repo, não versionados).

## 1. O que o Emerson esclareceu

Do print da conversa (`dados-recebidos/WhatsApp Image 2026-08-19 at 12.36.35.jpeg`):

| Afirmação | Consequência para nós |
| --- | --- |
| "o sistema é para apresentar as emendas" | O produto é de **entrada**, não de consulta a histórico. |
| "aquelas que lá estão foram as apresentadas em 2025 para 2026" / "aquelas eu coloquei para testar" | Os dados do Neon eram **seed de teste** dele. Não há base real de emendas a migrar. |
| "agora vão ser apresentadas em 2026 para 2027 — elas ainda não existem" | O exercício-alvo é **2027**. Emendas são o *output* do sistema. |
| "os vereadores vão utilizar para apresentar as emendas e para a comissão de finanças e orçamento fazer a análise de viabilidade" | Dois atores: **autor (vereador)** e **CPFO — Comissão Permanente de Finanças e Orçamento**. |

**Conclusão:** não existe — e nunca vai existir antes do sistema rodar — "dado
real de emenda" para importar. O que precisa ser real é a **base orçamentária
sobre a qual a emenda incide**. É exatamente isso que os quatro PDFs entregam.
Faz sentido, e é uma base melhor do que o Neon: está mais atualizada (2027, não 2026).

Município: **Mogi Guaçu/SP**. Sistema de origem dos relatórios:
**INTER-TEC Soluções em Software** (relatórios `PLR00340`–`PLR00343`, `PLR00547`).

## 2. Inventário dos arquivos

| Arquivo | Pág. | Camada de texto | Conteúdo |
| --- | --- | --- | --- |
| `Lei nº 6245-25 - Plano Plurianual - 26-29.pdf` | 6 | ✅ extraível | Texto da Lei 6.245 de 05/12/2025 — PPA 2026-2029 |
| `Lei nº 6245-25 - Plano Pluanual - 26-29 - Anexos.pdf` | 321 | ❌ **só imagem** | "Volume II" — anexos do PPA |
| `Lei nº 6393-26 - Lei de Diretrizes Orçamentárias - 2027.pdf` | 10 | ✅ extraível | Texto da Lei 6.393 de 03/07/2026 — LDO 2027 |
| `Lei nº 6396-26 - Lei de Diretrizes Orçamentárias 27 - Anexos.pdf` | 94 | ❌ **só imagem** | Processo do PL 158/2026 + anexos da LDO 2027 |

Os dois arquivos grandes — os que têm os dados estruturados — são **escaneados,
sem camada de texto**. `pdftotext` devolve 321 e 94 bytes respectivamente
(só quebras de página).

### O que há dentro dos anexos do PPA (321 pág.)

- **Receita total estimada 2026-2029** por classificação (pág. ~15).
  Receita líquida **2027: R$ 1.065.442.905,00**.
- **Anexo II — Demonstrativo de Programas e Ações por Programa, Físico e
  Financeiro**, consolidado geral: programa (cód.+nome), objetivo, justificativa,
  indicador, e por ação (cód.+nome, produto, unidade de medida) a **meta física
  e o custo estimado em cada um dos quatro exercícios**.
- **Anexo III** — o mesmo, quebrado por **órgão**.
- **Demonstrativo de Funções, Subfunções, Programas e Ações** (pág. ~310) —
  a única fonte de **função/subfunção** no pacote.

### O que há dentro dos anexos da LDO (94 pág.) — **o arquivo mais valioso**

- Páginas iniciais: texto integral do PL 158/2026 (scan limpo, boa qualidade).
- Páginas ~29-94: **Anexo V — Descrição dos Programas Governamentais / Metas /
  Custos para o Exercício 2027** (66 páginas de relatório `PLR00547`).

  Cada bloco traz, para **2027**:

  ```
  Instituição   : 4 Serviço Autonomo Municipal Agua Esgoto
  Órgão Resp.   : 18 SAMAE - SERVICO AUTONOMO MUNICIPAL DE AGUA E ESGOTO
  Unidade Resp. : 1 SUPERINTENDÊNCIA
  Programa      : 5007 SISTEMAS DE AGUA E DE ESGOTO SANITARIO
  Objetivo / Justificativa / Público Alvo / Indicador (unidade, índice recente, índice futuro)
  ─────────────────────────────────────────────────────────────────────────
  Código  Ação                                    Órgão Exec.  Produto  Meta Física  Custo Estimado
  1050    CONSTRUCAO OU AMPLIACAO DO SISTEMA...   18.01        NAO HA   100          31.827,00
  2086    DESENVOLVIMENTO DE RECURSOS HUMANOS...  18.01        NAO HA   100          944.201,00
  2579    OPERACIONALIZAÇÃO DO SISTEMA DE AGUA    18.01        NAO HA   100          40.313,00
  ```

  Isto é, literalmente, o **Anexo de Metas e Prioridades** citado no art. 2º da
  LDO — a fonte canônica do nosso `PrioridadeLDO` — **e** a hierarquia
  órgão → unidade → programa → ação para 2027.

## 3. Mapeamento para o schema atual

| Modelo Prisma | Fonte nos PDFs | Cobertura |
| --- | --- | --- |
| `Exercicio` (2027) | LDO 2027 | ✅ trivial |
| `Orgao` | LDO Anexo V — "Órgão Resp.: 18 SAMAE…" | ✅ código + nome |
| `UnidadeOrcamentaria` | LDO Anexo V — "Unidade Resp." e "Órgão Executor 18.01" | ✅ código + nome + órgão |
| `Programa` | LDO Anexo V / PPA Anexos II e III | ✅ código + nome (+ objetivo, justificativa, indicador — hoje **não cabem no schema**) |
| `Acao` | LDO Anexo V | ✅ código + nome (+ produto, meta física, custo — idem) |
| `Acao.tipo` (`TipoAcao`) | — | ⚠️ **derivar** da convenção do código: `1xxx` projeto, `2xxx` atividade, `0xxx` operação especial |
| `Funcao` / `Subfuncao` | Só no *PPA* Anexos, demonstrativo função/subfunção | ⚠️ códigos presentes, **nomes não**; e é a visão 2026-2029, não 2027. Cruzar por programa+ação, ou usar a tabela fixa da Portaria MOG 42/1999 (é nacional). |
| `NaturezaDespesa` | — | ❌ **ausente**. Só existe na LOA. Catálogo de códigos é nacional (Portaria STN/SOF 163/2001) — dá para popular a tabela, não o valor. |
| `FonteRecurso` | — | ❌ **ausente**. Tabela do TCE-SP. Mesma observação. |
| `Dotacao` | — | ❌ **ausente e é o alvo da emenda**. Só sai da LOA/PLOA 2027. |
| `PrioridadeLDO` | LDO Anexo V (programa + ação + descrição/objetivo) | ✅ é exatamente isso |
| `InstrumentoPlanejamento` | PPA = Lei 6.245/25 (`LEI_APROVADA`); LDO = Lei 6.393/26 (`LEI_APROVADA`); **PLOA 2027 = o `PROJETO_LEI` que ainda não existe** | ⚠️ parcial |

### O buraco central

A emenda incide sobre uma **`Dotacao` da PLOA 2027** — e a PLOA 2027 ainda não
foi enviada à Câmara. Sem ela não há base de dotações, natureza de despesa nem
fonte de recurso. Nenhum dos quatro arquivos preenche isso, e nenhum documento
poderia: a informação só nasce quando o Executivo protocola o projeto.

**Isso não é um problema — é o calendário do produto.**

## 4. O calendário que os documentos revelam

| Data | Evento | Fonte |
| --- | --- | --- |
| 05/12/2025 | PPA 2026-2029 sancionado (Lei 6.245) | texto da lei |
| 03/07/2026 | LDO 2027 sancionada (Lei 6.393) | texto da lei |
| **31/08/2026** | Câmara remete sua proposta orçamentária ao Executivo | LDO art. 26 |
| **~30/09/2026** | Prazo da LOM para o Executivo enviar a PLOA 2027 à Câmara | LOM (não temos o texto) |
| out–dez/2026 | **Janela real de apresentação das emendas** | — |
| até 31/12/2026 | Autógrafo da LOA; senão, execução por 1/12 avos | LDO art. 27 |
| jan/2027 + 30d | Prefeito indica impedimentos técnicos das impositivas | LDO art. 23 §4º |

Hoje é **19/08/2026**. Restam cerca de **seis semanas** até a PLOA chegar, e a
janela de uso real do sistema é o quarto trimestre de 2026.

## 5. Regras que os PDFs entregam de graça para o motor de validação

O **art. 23 da LDO 2027** é, na prática, a especificação do motor:

| Dispositivo | Regra | Estado no sistema |
| --- | --- | --- |
| art. 23, *caput* | Emenda que reduz receita ou aumenta despesa exige **estimativa de impacto orçamentário-financeiro no exercício e nos dois seguintes** (LRF art. 16) | ❌ **campo não existe** em `Emenda` |
| art. 23 §1º, I | Compatibilidade com o **PPA e a LDO** | ✅ `ADERENCIA_LDO` e `PROGRAMA_NO_PPA`, este último contra os 47 programas do PPA 2026-2029 extraídos do Anexo II por OCR em 20/08/2026. Mesma exigência na **LOM art. 140 §1º, I** |
| art. 23 §1º, II | Não ultrapassar limites de gasto com pessoal | ❌ |
| art. 23 §2º, I | Emenda **redutiva**: demonstrar que vinculações constitucionais/legais de receita seguem observadas | ❌ |
| art. 23 §2º, II | Emenda redutiva: demonstrar que não inviabiliza serviço obrigatório nem encargo legal | ❌ |
| art. 23 §3º | Somatório das **impositivas individuais** limitado ao **art. 140 §6º da LOM** | ⚠️ existe `LIMITE_VALOR_AUTOR`, mas **o percentual não está na LDO** — precisamos da LOM |
| art. 23 §§4º-6º | Fluxo de **impedimento técnico** pós-publicação: 30 dias (prefeito indica) → 30 dias (Câmara responde via Mesa, consultados os autores) → 15 dias úteis (PL de modificação); esgotado, a emenda perde o caráter impositivo | ❌ **fluxo pós-aprovação inteiro não modelado** |
| art. 24 | O crédito da emenda serve para **atender a meta física** da ação, independentemente de usar todo o recurso | ➡️ reforça amarrar emenda a **ação + meta física** — e o Anexo V já traz a meta física |
| art. 7º §7º | Contingenciamento **incide** sobre as impositivas | ❌ |
| art. 21 §4º | Saldo negativo de emenda redutiva/supressiva é ajustado por crédito adicional | ❌ |
| art. 5º §1º | Reserva de contingência: máx. **2% da RCL** | ❌ |

O print também confirma um ator que o app hoje não modela explicitamente: a
**CPFO**, que faz a *análise de viabilidade*. Os papéis atuais (`LEG_ADMIN`,
`LEG_TECNICO`, `LEG_AUTOR`, `LEG_CONSULTA`) não têm um perfil de comissão nem
uma tela de parecer colegiado — a pág. 2 dos anexos do PPA mostra o formato real
do trabalho da CPFO (deliberação em reunião + ata + ofício ao Presidente).

## 6. O que já foi extraído (19/08/2026)

O Emerson não tem mais nada a enviar — os quatro arquivos são tudo. Então os
dados foram extraídos dos próprios PDFs escaneados, com OCR. **A base do
exercício 2027 está pronta**, em [`dados/`](dados/).

### Método

OCR pelo **framework Vision do macOS** (`extracao/ocr.swift`, ~90 linhas de
Swift compiladas com o `swiftc` que já vem no sistema — nenhuma dependência
instalada). Páginas renderizadas a 300 dpi; as paisagens do PPA rotacionadas
−90°. Correção de idioma **desligada** de propósito: em código orçamentário e
valor, "corrigir" é corromper.

O que torna o resultado confiável não é o OCR e sim o **checksum**: o relatório
imprime `TOTAL DO PROGRAMA` em cada bloco. O parser só aceita um bloco se a soma
das ações bater exatamente com o total impresso. Dos 64 blocos do Anexo V,
**55 fecharam no primeiro passe**; os 9 restantes foram relidos à vista na
imagem da página e corrigidos em `extracao/correcoes.json` — todos os 9 fecham
agora. Os erros eram pontuais e do tipo esperado: `70.270,00` lido como
`10.270,00`, linhas de ação com nome quebrado em duas linhas que o parser
descartava.

### Resultado

| | |
| --- | --- |
| Órgãos | **28** |
| Unidades orçamentárias | **45** |
| Programas | **47** |
| Ações | **183** |
| Linhas programa×ação | **208** |
| **Total do exercício 2027** | **R$ 993.305.344,00** |

Consistência: a receita líquida estimada para 2027 no PPA é
R$ 1.065.442.905,00 — a despesa do Anexo V equivale a **93%** dela, o que é a
proporção esperada (fora reserva de contingência e o que não entra nas metas e
prioridades).

Função e subfunção **não estão** no Anexo V da LDO. Foram recuperadas do
*Demonstrativo de Funções, Subfunções, Programas e Ações — Órgão e Unidade*
(relatório `PLR00342`, 25 páginas dentro dos anexos do PPA), que traz a
hierarquia completa órgão → unidade → função → subfunção → programa → ação, e
juntadas à base 2027 pela chave programa+ação:

- **198 de 208 linhas** classificadas — **96,3% do valor** (R$ 956,4 mi).
- 54 subfunções efetivamente em uso.
- Nomes de função vêm da **Portaria MOG nº 42/1999** (tabela nacional fixa), não
  do OCR — zero risco de erro de leitura.
- **10 linhas ficaram sem função/subfunção** (as linhas com `funcaoCodigo` vazio
  no CSV). São ações cujo bloco no PPA o OCR não conseguiu ler, ou ações novas
  criadas na LDO 2027. Resolver é trabalho manual de poucos minutos — mas é
  preciso **conferir na fonte**, não inferir pelo órgão.

### Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| [`dados/base-2027.json`](dados/base-2027.json) | Base completa: catálogos (órgãos, unidades, funções, subfunções, programas, ações), prioridades da LDO e as 208 linhas |
| [`dados/base-2027-linhas.csv`](dados/base-2027-linhas.csv) | As 208 linhas em CSV, para conferência e para alimentar o importador |
| [`dados/extracao/`](dados/extracao/) | Todo o pipeline: OCR em Swift, runner, parsers, correções manuais e o join. Reprodutível — se aparecer um PDF melhor, roda de novo |

## 7. O que continua faltando, e por quê

| Falta | Situação |
| --- | --- |
| **Natureza da despesa** | Não existe em nenhum dos quatro documentos — é informação da LOA. O **catálogo** de códigos é nacional e fixo (Portaria Interministerial STN/SOF nº 163/2001) e pode ser montado a qualquer momento; o que não dá para inventar é qual natureza cabe em cada dotação. |
| **Fonte de recurso** | Idem: tabela do TCE-SP, montável; a distribuição real só vem da LOA. |
| **`Dotacao`** (o alvo da emenda) | **Só existe na PLOA 2027, que ainda não foi enviada à Câmara.** Nenhum documento poderia trazer isso hoje. |
| **LOM art. 140 §6º** (teto das impositivas) | A Lei Orgânica está publicada em `sistema.camaramogiguacu.sp.gov.br` (norma 792), mas o visualizador tem um **gate declaradamente anti-automação** ("esta verificação protege a consulta pública contra acessos automatizados"). Não foi contornado. É um clique em navegador — ver seção 9. |
| **Regimento Interno** (rito da CPFO) | Mesmo sistema, mesmo gate. |

Sobre o teto: as buscas na web trazem percentuais de **outros municípios**
(Belo Horizonte, sobretudo) — 1%, 0,8%, 0,5% da RCL. **Nada disso vale para Mogi
Guaçu** e não foi usado. O número tem que sair da LOM.

De todo modo, o teto **deve ser um parâmetro de configuração**, não uma
constante no código — o schema já tem `ParametroValidacao` com escopo por
exercício e modo `BLOQUEANTE`/`ALERTA`. Ou seja: a ausência do percentual não
bloqueia construir a checagem, só a configuração dela.

## 8. Aplicado — o exercício 2027 está no banco

Rodado e verificado em 19/08/2026.

```bash
npm run seed              # base oficial (exercício 2025, usuários)
npm run db:2027           # exercício 2027 — base REAL de Mogi Guaçu
npm run db:2027:emendas   # opcional: emendas de demonstração sobre ela
```

> Os beneficiários que `db:2027:emendas` cria são fictícios, como as emendas.
> Depois de 24/08/2026 o cadastro de beneficiários **abre vazio** e cresce pelo
> uso — para esvaziá-lo num banco já semeado, `npm run db:limpar-beneficiarios`
> (não apaga emenda; elas só ficam sem beneficiário vinculado).

O app usa o exercício mais recente por padrão, então **2027 entra como ativo**;
o seletor no topo continua permitindo voltar ao 2025 de demonstração.

### O que `db:2027` carrega

| | Origem |
| --- | --- |
| 28 órgãos, 45 unidades, 47 programas, 183 ações | **real** — LDO 2027, Anexo V |
| 29 funções, 55 subfunções | **real** — demonstrativo do PPA + Portaria MOG 42/1999 |
| 208 prioridades da LDO | **real** — Anexo V é o Anexo de Metas e Prioridades |
| PPA (Lei 6.245/2025) e LDO (Lei 6.393/2026) | **reais**, como `LEI_APROVADA` |
| 29 naturezas de despesa, 16 fontes de recurso | catálogos **reais** (Portarias STN/SOF 163/2001 e STN 710/2021) |
| **1.163 dotações** na "PLOA 2027 (simulada)" | **simuladas** — ver abaixo |

### O que é simulado, e como

Só as **dotações**. A dotação nasce na LOA, e a PLOA 2027 ainda não foi enviada
à Câmara — nenhum documento existente poderia trazê-la.

A simulação **não inventa dinheiro**. O custo estimado real de cada ação é
repartido entre as dotações geradas, de modo que a soma bate **exatamente** com
os R$ 993.305.344,00 do Anexo V. O seed confere isso lendo de volta do banco
depois de gravar — e **aborta** se não fechar. O que é fictício é apenas a
*repartição*: quanto de cada ação vai para pessoal, custeio ou capital, e sob
qual fonte. Os perfis seguem o feitio da ação (ação de RH → naturezas 3.1.90.x;
projeto `1xxx` → obras e equipamentos; convênio → subvenções), e a fonte é
sorteada entre as plausíveis para aquela função — nada de FUNDEB fora da
educação.

Geração determinística (PRNG com semente fixa): rodar de novo dá o mesmo
resultado.

**A simulação está rotulada onde aparece.** O instrumento se chama
`PLOA 2027 (simulada)`, a ementa explica o que é real e o que não é, e o rótulo
fica visível no topo da tela de Nova Emenda ("Base: LOA PLOA 2027 (simulada)").
Quando a PLOA real chegar, importa-se pelo `src/lib/import/` e aposenta-se este
instrumento.

### Volume — o que isso significa para o risco B2

| | |
| --- | --- |
| Dotações no exercício | **1.163** |
| Opções no `<select>` de remanejamento (lista tudo) | **1.163** |
| Dotações no maior órgão (Educação) | 145 |
| Dotações por ação — mediana / máximo | 7 / 11 |

O seletor de remanejamento continua sendo um `<select>` nativo com **mais de mil
opções**, agora com rótulos de órgãos e programas reais de Mogi Guaçu. O risco
B2 do [documento 07](07-lacunas-e-riscos.md) fica visível no tamanho certo.

### As emendas de demonstração (`db:2027:emendas`)

**São fictícias, e é assim mesmo** — as emendas de 2027 só serão apresentadas
entre outubro e dezembro de 2026. Rodar `db:2027` sozinho deixa o exercício no
estado verdadeiro de hoje: base carregada, zero emendas, que é o que a Câmara
vai encontrar ao abrir o sistema pela primeira vez.

O que o seed opcional acrescenta, para que o redesign não trabalhe com telas
vazias: **44 emendas de 13 vereadores**, cada uma sobre uma **dotação real** da
base e avaliada pelo **motor de validação de verdade** — o relatório de
conformidade que aparece na tela é o que o motor produziu, não texto fabricado.
A distribuição é deliberada para acender cada estado do farol: 15 aprovadas,
15 submetidas, 4 em tramitação, 3 rascunhos, 3 rejeitadas e **4 inválidas**
(duas por estouro de cota, três por anulação acima do saldo da dotação),
alimentando a fila de saneamento e a Análise Técnica.

### Verificação

| Checagem | Resultado |
| --- | --- |
| `npm run typecheck` | sem erros |
| `npm run test:e2e` | **45/45 passam** |
| Soma das dotações no banco × Anexo V | R$ 993.305.344,00 = R$ 993.305.344,00 ✓ |
| Portal público com exercício 2027 | renderiza valores e beneficiários |
| Nova Emenda com a base 2027 | cascata carrega, rótulo "(simulada)" visível |

### RESOLVIDO: os parâmetros agora são os de Mogi Guaçu

Em 20/08/2026 a Lei Orgânica chegou (arquivo consolidado, atualizada até a
Emenda nº 56/2023) e o jurídico do cliente confirmou a leitura. As três
pendências desta seção estão fechadas.

| Parâmetro | Estava | Agora | Fonte |
| --- | --- | --- | --- |
| `RCL` | R$ 433 mi (protótipo) → R$ 1.059.216.686,35 (projeção 2027) | **R$ 926.030.562,09** | Siconfi/Tesouro, RREO 6º bim/2025, Anexo 03, ente IBGE 3530706 |
| `PERCENTUAL_IMPOSITIVO` | 1,5% não conferido | **1,2%** BLOQUEANTE | LOM art. 140 §6º (Emenda à LOM nº 47/2017) |
| `TETO_VALOR_AUTOR` | R$ 1.000.000 marcador | **R$ 854.797,44** BLOQUEANTE | derivado: (RCL × 1,2%) ÷ 13 |
| `RESERVA_SAUDE_PERCENTUAL` | 50% ALERTA (herdado) | **50%** BLOQUEANTE | LOM art. 140 §6º, *in fine* |
| `NUMERO_AUTORES` | 13 sem fundamento | **13** | LOM art. 11 §2º (Emenda à LOM nº 55/2023) |

#### A armadilha da base de cálculo

O §6º diz, literalmente, "receita corrente líquida **prevista no projeto
encaminhado pelo Poder Executivo**". O §8º, que trata da execução obrigatória,
diz "**realizada no exercício anterior**". Quem ler só a LOM usa a primeira.

Está errado. A redação do §6º é de 2017 e ficou defasada: a **EC 126/2022**
passou a base do art. 166 da Constituição para a RCL realizada no exercício
anterior, e o Município não pode aplicar base diversa da constitucional.
Orientação expressa do jurídico do cliente (Correia Pontes Advocacia) em
20/08/2026. Por isso a base é a **RCL realizada de 2025**, e não a projeção de
2027 da LDO que estava no seed.

O fundamento inteiro está gravado em `fundamentoDescricao` de cada parâmetro,
em `prisma/seed-2027.ts` — é lá que se olha antes de mexer nos números.

### RESOLVIDO: o teto do painel passou a fechar com a base de cálculo

A seção anterior registrava que `tetoGlobal = cotaPorAutor × totalAutores`
(R$ 13 mi) não batia com RCL × percentual, embora o painel apresentasse os dois
como "base de cálculo". A LDO art. 23 §3º aponta para o teto **global** como
primitivo, com a cota nascendo dele.

Não foi preciso inverter a fórmula. A cota gravada passou a ser **derivada** do
teto legal — `(926.030.562,09 × 1,2%) ÷ 13 = 854.797,44` —, de modo que
`cota × 13 = R$ 11.112.366,72` reproduz `RCL × 1,2% = R$ 11.112.366,75`. A
derivação exibida agora produz o número exibido.

Sobram **3 centavos** de diferença, do arredondamento da cota para centavos. É
irrelevante para o painel, mas quem for reescrever a fórmula para calcular o
teto global direto da RCL deve saber que os dois caminhos não coincidem ao
centavo.

### Regra nova encontrada na leitura: LOM art. 140 §7º

O mesmo artigo traz uma vedação que não estava em nenhuma lista nossa: a
execução do montante destinado a ações e serviços públicos de saúde é "**vedada
a destinação para pagamento de pessoal ou encargos sociais**".

Virou checagem do motor (`SAUDE_NAO_PESSOAL`): emenda na função 10 apontando
para dotação do grupo 1 da natureza da despesa (Pessoal e Encargos Sociais) é
reprovada. É proibição legal, não parâmetro de política — bloqueia sempre, sem
chave que a afrouxe.

O §11 do mesmo artigo traz ainda o **calendário do impedimento de ordem
técnica** (120 dias para o Executivo justificar; 30 dias para o Legislativo
indicar remanejamento; 30 de setembro para o projeto de lei; 20 de novembro
para a decisão tácita) e o §13, o limite de **0,6% da RCL realizada** para
restos a pagar contarem na execução obrigatória. Nenhum dos dois está
implementado — ficam registrados para a fase de acompanhamento.

## 9. O que ainda depende de uma pessoa

O Emerson já disse que não tem mais nada. Estes itens **não dependem dele** —
são documentos públicos ou decisões nossas:

### Precisa de um clique num navegador (2 minutos)

Os dois documentos estão publicados no sistema da Câmara, mas atrás de um gate
anti-automação que não foi contornado de propósito. Basta abrir e salvar:

1. ~~**Lei Orgânica Municipal**~~ — **obtida em 20/08/2026.** O arquivo
   consolidado (atualizado até a Emenda nº 56/2023) foi enviado pelo cliente e
   está na raiz do workspace. Resolveu as quatro pendências que esta lista
   apontava — percentual, cota, a afirmação da tela de login e a inconsistência
   do teto —, além de trazer o art. 140 §7º, §11 e §13, que não conhecíamos.
   Ver a seção 8.
2. **Regimento Interno da Câmara** — mesmo sistema, consulta de normas.
   Rito da CPFO, prazo para emendar o PLOA, quórum e formato do parecer.

### Dá para montar sem pedir nada a ninguém

3. **Catálogo de naturezas de despesa** — Portaria Interministerial STN/SOF
   nº 163/2001 e o MCASP. Tabela nacional, estável, pública.
4. **Catálogo de fontes de recurso** — tabela do TCE-SP para municípios
   paulistas. Idem.

   Nos dois casos monta-se o **catálogo**; a distribuição real por dotação só
   vem com a PLOA.

5. **As 10 linhas sem função/subfunção** — conferir na fonte (anexos do PPA,
   demonstrativo por órgão) e completar `dados/base-2027-linhas.csv`.

### Depende do calendário, não de esforço

6. **A PLOA 2027.** É a única fonte possível das dotações, naturezas e fontes
   reais. Chega em torno de 30/09/2026. Quando chegar, o importador que já
   existe (`src/lib/import/`) resolve — desde que o export venha em planilha.

### Decisão nossa

7. **A CPFO tem perfil próprio?** O print confirma que ela faz a análise de
   viabilidade, mas os papéis atuais não têm um perfil de comissão nem tela de
   parecer colegiado. Precisa de decisão de produto antes do redesign do fluxo
   de tramitação.
