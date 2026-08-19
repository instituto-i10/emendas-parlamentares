# 07 — Lacunas, dívidas e riscos

Duas origens: (a) a **análise regulatória** que o próprio time do protótipo já
fez ([`../analise-regulatoria-gaps.md`](../analise-regulatoria-gaps.md), commit `618ec5f`), e (b) o
que **encontramos** ao ler o código.

---

## Parte A — Lacunas regulatórias (do time do protótipo)

Fonte: deck "Emendas Parlamentares Impositivas" (Instituto i10), consolidando
STF (ADI 7697, ADPF 854), MP-SP e TCE-SP (SDG 28/2025, Resolução 17/2025,
GP 43/2025, Audesp 55/2025 e 09/2026).

### P0 — o TCE já aponta como impropriedade

| # | Gap | Situação |
| --- | --- | --- |
| 1 | Portal público pesquisável | ✅ **entregue** no commit `824eb53` (`/publica/emendas` com filtros) |
| 2 | Beneficiário final identificado | ✅ **entregue** (`Beneficiario` + dedup) |
| 3 | Manual orientativo + checklist de conformidade | ✅ **entregue** (`/publica/manual`, `/conformidade`) |

Os três P0 foram fechados. É o commit mais recente e substantivo do repo.

### P1 — ciclo de vida ainda não modelado ⚠️ **abertos**

| # | Gap | Impacto |
| --- | --- | --- |
| 4 | **Impedimento técnico** (CF art. 166 §11) | Conceito **central** do regime impositivo, totalmente ausente. Falta entidade com fundamento, quem declarou, prazo para sanar, notificação ao autor, remanejamento. |
| 5 | **Plano de trabalho por emenda** | TCE exige metas mensuráveis, custos e cronograma físico-financeiro. Falta entidade + checagem no motor. |
| 6 | **Parecer como documento** | Hoje é texto solto dentro do `AuditLog`. Deveria ser entidade (autor, fundamento, resultado, PDF). |
| 7 | **Anexos por emenda** | Projeto técnico, plano de trabalho, ofícios. Depende de storage (Vercel Blob). |

### P2 — fase de acompanhamento ⚠️ **abertos**

| # | Gap |
| --- | --- |
| 8 | Execução financeira por emenda (conta bancária específica — Audesp 09/2026, empenho/liquidação/pagamento) |
| 9 | Acompanhamento físico da obra/serviço (% execução, marcos) |
| 10 | Alertas de controle interno: **pulverização** de verbas, concentração em poucas entidades, sobrepreço |
| 11 | Prestação de contas no padrão **Audesp** (Comunicado 55/2025) |
| 12 | Prazos regimentais (agenda e farol de prazos por etapa) |

### P3 — integridade ⚠️ **aberto**

| # | Gap |
| --- | --- |
| 13 | Módulo terceiro setor / conflito de interesses: dirigentes da entidade, declaração de vínculo do parlamentar, dossiê exportável para inquérito civil |

**Leitura estratégica do próprio deck:** o sistema cobre bem a primeira metade
da fase 1 (indicação, limites, compatibilidade, tramitação) e a transparência.
Os vazios são o **fim da fase 1** e **toda a fase 2**.

---

## Parte B — Dívidas técnicas e riscos (nossa leitura)

### 🔴 Alto — endereçar antes ou junto do redesign

| # | Item | Por quê importa para UX |
| --- | --- | --- |
| B1 | **Navegação dupla** (vistas 360 × ferramentas legadas) | A ação principal do produto atravessa duas linguagens visuais. É a decisão de arquitetura de informação nº 1. |
| B2 | **Cascata com `<select>` nativo** em `nova-emenda-form.tsx` | **Medido** com a base de volume: o seletor de remanejamento tem **2.375 opções num `<select>` nativo sem busca**, e o rótulo mostra só natureza/fonte/saldo — **2.375 opções para 2.334 rótulos distintos**, sem órgão, programa ou ação. Não há busca por texto em nenhum nível. Bloqueia adoção real. Baseline travado em `e2e/nova-emenda.spec.ts`. |
| ~~B3~~ | ~~**Zero testes de UI/E2E**~~ | ✅ **Resolvido (18/08/2026).** 45 testes Playwright contra build de produção e banco próprio. Ver [`e2e/README.md`](../../e2e/README.md). |
| B4 | **Acessibilidade não endereçada** | Sistema de governo tem exigência legal (LBI/eMAG). Retrofit é caro; incorporar no redesign é barato. Um caso já corrigido: os campos da cascata não tinham `label`/`id` associados e não eram anunciados por leitor de tela. |
| B5 | **Mobile não projetado** | Vereador em plenário é caso de uso plausível. |

### 🟡 Médio

| # | Item | Nota |
| --- | --- | --- |
| B6 | `valorAtual` da `Dotacao` nunca atualizado | Emendas não movem o saldo. A checagem de `ANULACAO` compara contra um valor estático, e a UI não consegue mostrar "quanto sobra". |
| B7 | Rate limit **em memória** | `src/lib/rate-limit.ts` não funciona em serverless multi-instância. Dívida já reconhecida (migrar p/ Upstash/Redis). |
| B8 | Parecer dentro do `AuditLog` | Ver gap regulatório #6. Também é problema de produto: não dá para listar pareceres. |
| B8b | **Parecer coletado por `window.prompt`** | Documento com peso jurídico capturado num diálogo nativo: sem múltiplas linhas, sem validação, sem rascunho, sem estilo do produto. Ver observação 4c do [documento 04](04-mapa-de-telas.md). |
| B8c | **"Minhas emendas" não mostra o objeto** | A listagem traz nº, programa, ação, valor, tipo e situação. O autor não reconhece a própria emenda pelo que ela faz. |
| B9 | Estados mortos no enum | `EM_VALIDACAO` e `EM_TRAMITACAO` (de `StatusEmenda`) nunca são atribuídos. Ou se usam, ou se removem. |
| B10 | `ui/sidebar.tsx` sem uso | 702 linhas — o maior arquivo do projeto, órfão desde o redesign para abas. |
| B11 | Tema escuro completo, sem alternador | `next-themes` instalado e não usado; paleta `.dark` definida e inalcançável. |
| B12 | **Assistente não é IA** | Q&A pré-calculado, com perguntas fixas. A interface sugere um chat. Ou se rotula honestamente, ou se implementa de verdade (há AI SDK/AI Gateway disponíveis na stack Vercel). |
| B13 | Região `iad1` | Funções nos EUA para co-localizar com o Neon. Custo: latência para usuários brasileiros. Reavaliar Neon em São Paulo + funções em `gru1`. |
| B14 | Sem biblioteca de gráficos | Tokens `--chart-1..5` existem e não são usados. Dados ricos, visualização pobre. |

### 🟢 Baixo / higiene

| # | Item |
| --- | --- |
| B15 | Logo é texto (`logo-emendas360.tsx`) — falta o arquivo oficial do Instituto i10 |
| B16 | `Source Serif 4` carregada e praticamente não usada (custo de fonte à toa) |
| B17 | Seed cria 8 contas demo com senha conhecida — precisa de trava para não rodar em produção real |
| B18 | Caminho Windows (`G:\Meu Drive\...`) hardcoded num comentário de `docs/analise-regulatoria-gaps.md` |
| B19 | Nenhuma observabilidade (sem Sentry/Analytics) |

---

## Riscos específicos para o trabalho de UX

1. **Não quebrar regras codificadas.** O motor, os guards e os schemas Zod são
   a parte validada com o time jurídico. Redesign de interface **não pode**
   contornar `submeterEmenda` (que revalida no servidor) nem burlar
   `podeGerirEmenda`.

2. **A linguagem importa.** Os textos foram escritos por quem entende do
   domínio, e algumas frases são juridicamente carregadas — o rodapé
   *"a plataforma confere requisitos formais e organiza; a decisão de mérito e
   a assinatura são do parlamentar e da comissão"* é uma **delimitação de
   responsabilidade**, não copy decorativa. Idem "reserva é limite, não
   obrigação". Confirmar qualquer reescrita com o time jurídico.

3. **Contexto global de exercício.** Trocar o ano na topbar muda o significado
   de toda a tela. Qualquer redesign precisa manter isso óbvio e persistente —
   hoje está discreto demais.

4. **O fallback de dev mascara a experiência real.** Sem login e com
   `SUPER_ADMIN` por padrão, é fácil desenhar telas que nenhum usuário real vê
   assim. Testar cada persona com o `PerfilSwitcher` (ou com login real) é
   obrigatório.

5. **Sem banco, as telas mentem.** Estados vazios não revelam problemas de
   densidade, paginação ou performance. O ambiente local já sobe com dados —
   ver [06](06-ambiente-local.md), incluindo a base com volume de LOA real.

6. **Rode a suíte E2E antes e depois de cada mudança de interface.**
   `npm run test:e2e` (~1 min). Ela trava justamente o que um redesign quebra
   sem querer: quem vê o quê, o que a submissão exige, o que o portal público
   expõe sem login.
