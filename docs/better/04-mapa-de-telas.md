# 04 — Mapa de telas e design system

**Este é o documento-base do trabalho de UX/UI.** Inventário completo das 35
rotas, o design system existente e a análise da sobreposição entre as duas
gerações de navegação.

## A casca (`AppShell`)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ▓ TOPBAR escura (grad-dark, 56px, sticky)                          │
│ [Logo Emendas360] │ Emendas parlamentares      [Exercício ▾]        │
│                     EXERCÍCIO 2025             [👁 Visão pública]   │
│                                                [Perfil ▾]           │
├─────────────────────────────────────────────────────────────────────┤
│ ABAS horizontais (sticky top-14, scroll-x, sublinhado gradiente)    │
│ Painel │ Tramitação │ Emendas & Beneficiários │ Vereador 360 │ …    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   <main> max-width 1320px, padding 20px                            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ FOOTER: "Emendas360 — gestão de emendas parlamentares"             │
│ "A plataforma confere requisitos formais e organiza; a decisão de  │
│  mérito e a assinatura são do parlamentar e da comissão."          │
└─────────────────────────────────────────────────────────────────────┘
```

Arquivos: `src/components/app-shell.tsx`, `nav-tabs-360.tsx`,
`exercicio-selector.tsx`, `perfil-switcher.tsx`, `logo-emendas360.tsx`.

Notas:
- **Não há sidebar** — foi substituída pelas abas. Mas
  `src/components/ui/sidebar.tsx` (702 linhas, o maior arquivo do projeto)
  continua no repo, **sem uso**. Candidato a remoção.
- O **seletor de exercício é global** e muda o contexto de todos os dados.
  Elemento de altíssimo impacto colocado num canto discreto da topbar.
- O **PerfilSwitcher em dev troca de papel** — é ferramenta de demonstração,
  não funcionalidade de produto.
- A logo é **texto**, não arquivo: `logo-emendas360.tsx` avisa "trocar aqui
  quando o arquivo oficial existir".

## Inventário de rotas

### Camada 1 — Vistas "Emendas 360" (abas horizontais)

Configuradas em `src/config/vistas360.ts`.

| Aba | Rota | Arq. (L) | O que mostra |
| --- | --- | --- | --- |
| Painel | `/painel` | 512 | **A tela mais densa do sistema.** Banners de alerta, 6 KPIs (RCL, teto impositivo, cota por autor, emendas apresentadas, reserva da saúde, em análise), "farol" da conferência (lista de itens verde/âmbar/vermelho com "o que fazer"), barras por autor com marca do limite. `LEG_AUTOR` é redirecionado daqui para `/vereador360`. |
| Tramitação | `/tramitacao` | 155 | 4 KPIs (apresentadas, conferência formal, aguardando parecer, etapa atual) + fluxo visual (`Flow360`). |
| Emendas & Beneficiários | `/emendas` | 337 | 3 sub-abas via querystring `?aba=`: **Por autor**, **Por destino**, **Conformidade**. Botão "+ Nova emenda" que salta para a camada legada. |
| Vereador 360 | `/vereador360` | 262 | Visão do gabinete: cota utilizada, itens, saúde, demais áreas, lista dos itens da cota, farol do autor. |
| Análise Técnica | `/analise` | 203 | Fila de conferência: emendas para saneamento e aguardando parecer; prévia do parecer. |
| Resumo Consolidado | `/placar` | 140 | "Como o recurso se distribui": por tipo de emenda, maiores destinos. |
| Assistente | `/assistente` | 117 | ⚠️ **Chat com respostas pré-calculadas no servidor** a partir de perguntas fixas. Não é IA. Pergunta livre responde explicando o escopo. |
| Conformidade | `/conformidade` | 169 | Checklist espelhando o que o TCE-SP confere (LOM cadastrada? RI? manual? rastreabilidade?), derivado do estado real do banco. |
| Ferramentas | `/hub` | 50 | Porta de entrada para a camada 2. |
| Pitch | `/pitch` | 106 | "A demo em 6 passos" — tela de apresentação comercial. |

### Camada 2 — Ferramentas (hub → módulo → ferramenta)

Configuradas em `src/config/navegacao.ts`. **É aqui que as operações reais
acontecem.**

| Módulo | Ferramenta | Rota | L |
| --- | --- | --- | --- |
| **Legislativo · Emendas** | Nova emenda | `/legislativo/emendas/nova` | 57 |
| | Minhas emendas | `/legislativo/emendas/minhas` | 26 |
| | Todas as emendas | `/legislativo/emendas/todas` | 41 |
| | Detalhe da emenda | `/legislativo/emendas/[id]` | 97 |
| **Legislativo · Tramitação** | Situação das emendas | `/legislativo/tramitacao/status` | 76 |
| | Acatadas na lei | `/legislativo/tramitacao/acatadas` | 14 |
| | Relatórios | `/legislativo/tramitacao/relatorios` | 72 |
| **Executivo · Planejamento** | Instrumentos | `/executivo/planejamento/instrumentos` | 71 |
| | Base de dotações | `/executivo/planejamento/base` | 76 |
| | Lei aprovada | `/executivo/planejamento/lei-aprovada` | 72 |
| **Executivo · Acompanhamento** | PL × Lei aprovada | `/executivo/acompanhamento/comparacao` | 140 |
| | Execução | `/executivo/acompanhamento/execucao` | 98 |
| **Transversal** | Configurações (6 abas) | `/config` | 109 |

Abas de `/config`: **Parâmetros · Beneficiários · Normas · Instrumentos ·
Usuários · Auditoria**.

### Camada 3 — Portal público (sem login)

| Rota | L | O que é |
| --- | --- | --- |
| `/publica` | 142 | Agregados em linguagem simples, sem dados pessoais. |
| `/publica/emendas` | 209 | Lista pesquisável com filtros (autor, área, beneficiário, status, exercício), 25 por página. |
| `/publica/emendas/[id]` | 118 | Página pública de uma emenda: autor, objeto, valor, beneficiário, situação, justificativa. |
| `/publica/manual` | 172 | Manual orientativo de indicação e execução — exigência do TCE-SP. Limites vêm dos parâmetros reais. |

### Outras

`/login` (36 L), `/api/auth/[...nextauth]`, `/api/export/emendas`.

## Design system "Emendas 360"

### Tokens (`src/app/globals.css`)

Tailwind v4 **CSS-first** (`@theme inline`) — não há `tailwind.config.ts`.

**Cores de marca** (identidade "Mogi Guaçu", commit `4104697`):

| Token | Hex | Uso |
| --- | --- | --- |
| `--brand-navy` | `#0a2463` | cor institucional, `primary`, texto |
| `--brand-deep` | `#061840` | topo do gradiente escuro |
| `--brand-cyan` | `#00b4d8` | destaque, `ring`, eyebrow, aba ativa |
| `--brand-mint` | `#00e5a0` | fim dos gradientes de destaque |
| `--brand-amber` | `#f5a524` | atenção / pendência |
| `--brand-green` | `#00b278` | positivo |
| `--brand-purple` | `#7c5cfc` | banner de destaque |

Semânticos: `--background #f4f7fb` (azulado claro), `--card #ffffff`,
`--muted-foreground #5a6b8c`, `--destructive #e5484d`, `--radius 0.875rem`
(14px, com escala derivada de `sm` a `4xl`).

**Tema escuro existe** (`.dark`, paleta completa definida) mas **não há
alternador na interface** — `next-themes` está instalado e não é usado. Ou se
liga, ou se remove.

**Tipografia:** Inter (sans + headings), Source Serif 4 (`--font-serif`,
carregada mas praticamente não usada), Geist Mono (mono). Headings com
`letter-spacing: -0.5px` e `line-height: 1.2`.

**Classes utilitárias próprias** (`@layer components`):

| Classe | O que faz |
| --- | --- |
| `.grad-main` | `linear-gradient(135deg, navy, cyan)` — botões primários |
| `.grad-hi` | `linear-gradient(90deg, cyan, mint)` — destaques |
| `.grad-dark` | `linear-gradient(135deg, deep, navy)` — topbar |
| `.eyebrow` | rótulo-antena: 11px, bold, `letter-spacing 1.8px`, uppercase, cyan |
| `.kpi-num` | 26px, weight 800, `letter-spacing -1px` |
| `.kpi-lbl` | 12.5px, weight 600, muted |
| `.sec-bar` | barrinha 34×4px com gradiente ao lado dos títulos de seção |

### Componentes `e360/` (11)

| Componente | Papel |
| --- | --- |
| `SecTitle` | título de seção: h2 + `.sec-bar` + nota |
| `KpiCard` | card de indicador (eyebrow, número, rótulo, delta ↑/↓/⚠, href opcional) — variante `hi` |
| `Card360` + `CardSrc` + `Eyebrow` | card base (raio 14, sombra leve); variantes `mesa` (âmbar), `dark`, `hi`. `CardSrc` é o rodapé "fonte do dado" |
| `Farol` | lista de itens semáforo (`tom: g\|a\|r`) com título, texto, "o que fazer" e link |
| `MiniBar` | barra horizontal com preenchimento em gradiente + tique de limite (`marcaPct`) |
| `Banner` | faixa de aviso no topo (emoji + texto + tag + href) |
| `Tag360` | pílula de status |
| `Subtabs` | pílulas de sub-navegação **server-side** via `?aba=` |
| `Flow360` | diagrama do fluxo de tramitação |
| `ChatAssistente` | chat com Q&A pré-calculado |

### Componentes `ui/` — shadcn/ui (21)

`button`, `card`, `input`, `label`, `select`, `form`, `table`, `tabs`, `dialog`,
`sheet`, `dropdown-menu`, `badge`, `avatar`, `progress`, `separator`, `skeleton`,
`tooltip`, `sonner`, `sidebar` (sem uso), mais `hooks/use-mobile`.

Estilo `radix-nova`, base `neutral`, CSS variables ligadas.

## Observações de UX (ponto de partida para o redesign)

### 1. Navegação dupla é o problema estrutural nº 1
Um vereador que quer apresentar uma emenda precisa: aba **Emendas &
Beneficiários** → botão "+ Nova emenda" → que o joga em
`/legislativo/emendas/nova`, uma tela com **layout, cabeçalho e linguagem
visual diferentes** (`PageHeader` + `Card` shadcn, não `SecTitle` + `Card360`).
A ação mais importante do produto atravessa duas gerações de design.

### 2. Duas linguagens visuais convivem
- vistas 360 → `SecTitle`, `Card360`, `KpiCard`, gradientes, eyebrows;
- ferramentas legadas → `PageHeader`, `Card`/`Table` shadcn padrão, sem
  gradientes.

### 3. O Painel está sobrecarregado
512 linhas, 6 KPIs, banners condicionais, farol com até 7 itens, barras por
autor. É a primeira tela após o login para quase todos os papéis. Precisa de
hierarquia: o que é decisão, o que é monitoramento, o que é contexto.

### 4. O formulário de Nova Emenda é a tela crítica de conversão
`nova-emenda-form.tsx` (client) usa `<select>` **nativos** encadeados em 5
níveis, não os `Select` do shadcn nem combobox com busca.

**Medido** contra a base de volume realista (~2.300 dotações, gerada por
`prisma/seed-volume.ts` — ver [06](06-ambiente-local.md)):

| Nível da cascata | Opções |
| --- | --- |
| Órgão | 15 |
| Unidades por órgão (máx.) | 4 |
| Programas por unidade (máx.) | 7 |
| Ações por programa (máx.) | 16 |
| Dotações por ação (média / máx.) | 7 / 15 |
| **Remanejamento — origem e destino** | **2.375 opções, num `<select>` nativo, sem busca** |

Cada passo isolado é administrável. Dois problemas continuam:

1. **Remanejamento carrega a base inteira.** `fetchTodasDotacoes` popula dois
   `<select>` com todas as dotações — 4.750 nós `<option>` na página.
2. **O rótulo não diz o que é.** `DotacaoOpcao` expõe apenas natureza, fonte e
   saldo — **nunca órgão, programa ou ação**. Resultado medido: **2.375 opções
   para 2.334 rótulos distintos**, e o que os distingue é o valor em reais.
   Escolher entre `3.3.90.39 39 / 500 Recursos não Vinculados — R$ 250.000` e a
   opção idêntica de R$ 251.000 é impossível para quem quer "dinheiro para a
   UBS do Jardim Itamaraty".

O terceiro problema é conceitual: **não há busca por texto em lugar nenhum**. O
vereador pensa no destino (uma escola, uma UBS, uma entidade); o formulário
exige que ele conheça de antemão o órgão, a unidade, o programa e a ação.

Os números acima estão travados em `e2e/nova-emenda.spec.ts` → *"cascata sob
volume realista"*. **Alta prioridade de redesign.**

### 4b. "Minhas emendas" não mostra o objeto
`emendas-table.tsx` lista nº, programa, ação, valor, tipo e situação. O
**objeto** — a única coisa que diz o que a emenda faz — não aparece. O autor
identifica a própria emenda por número ou por valor.

### 4c. O parecer é pedido por `window.prompt`
`tramitacao-actions.tsx` coleta o parecer de aprovação/rejeição com
`window.prompt()`. É um documento com peso jurídico sendo capturado por um
diálogo nativo: sem formatação, sem múltiplas linhas, sem validação de tamanho,
sem rascunho, sem estilo do produto — e bloqueado por padrão em alguns
contextos de navegador. Trocar por um diálogo do próprio sistema é item de
redesign com efeito direto em conformidade.

### 5. Sub-navegação por querystring
`Subtabs` usa `?aba=` com navegação server-side — bom para SSR e links
compartilháveis, mas cada troca de aba é um round-trip completo. Avaliar caso a
caso se vale manter.

### 6. Texto pesado, sem progressive disclosure
Painéis explicam a regra por extenso dentro dos cards ("reserva da saúde
invadida em R$ X · demais áreas acima do limite de R$ Y · reserva de 50% só pode
ir p/ saúde"). O conteúdo é **excelente** — a densidade é que precisa de camadas.

### 7. Estados vazios são bons
`EmptyState` é consistente e os textos ensinam o próximo passo ("Peça ao
Executivo para deixar um PROJETO_LEI em tramitação"). **Manter esse padrão.**

### 8. Acessibilidade não foi endereçada
Sem verificação de contraste, sem foco visível customizado além do `ring`
padrão, sem `aria-live` nos toasts/faróis, sem skip-link. Sistema de governo
municipal deveria mirar **WCAG 2.1 AA** (e há exigência legal de acessibilidade
em portais públicos brasileiros — eMAG/LBI).

Exemplo já corrigido: no formulário de Nova Emenda os `<Label>` não tinham
`htmlFor` e os controles não tinham `id` — **nenhum campo da cascata era
anunciado por leitor de tela**. Corrigido ao montar a suíte E2E (os testes
também não conseguiam alcançar os campos, o que é um bom detector). Vale varrer
o resto da aplicação atrás do mesmo padrão.

### 9. Mobile não foi projetado
Há classes responsivas (`sm:`, `lg:`, `xl:`) e `use-mobile`, mas o layout
principal é `max-width: 1320px` com grids de até 6 colunas. Vereador em
plenário usando celular é caso de uso plausível e não atendido.

### 10. Sem gráficos
Existem tokens `--chart-1..5` e `MiniBar`, mas nenhuma biblioteca de
visualização. "Como o recurso se distribui" é feito só com barras horizontais.
Oportunidade clara — e há dados ricos para isso.

### 11. `valorAtual` da dotação nunca é atualizado
As emendas não alteram o saldo das dotações. A checagem `TIPO_COERENTE` de
`ANULACAO` compara com `valorAtual`, que permanece igual a `valorInicial`.
Consequência de UX: a tela não mostra "quanto ainda sobra nesta dotação".
