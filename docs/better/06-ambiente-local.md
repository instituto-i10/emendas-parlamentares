# 06 — Ambiente local

Verificado em **2026-08-18** (macOS, Node 25.8.0, npm 11.11.0).

## Clonar

```bash
git clone git@github.com:instituto-i10/emendas-parlamentares.git
cd emendas-parlamentares
npm install        # o postinstall gera o Prisma client em src/generated/prisma/
```

## Modo A — UI sem banco (o mais rápido)

Funciona hoje, sem nenhuma configuração. Todas as leituras passam por `safe()`
e degradam para estado vazio.

```bash
AUTH_SECRET=dev npx next dev
# http://localhost:3000
```

✅ Verificado: as 35 rotas respondem **HTTP 200**.
⚠️ Todas as telas em estado vazio — bom para trabalhar layout e casca, ruim
para avaliar densidade de informação.

Em dev **não há autenticação**: o `PerfilSwitcher` na topbar troca o papel via
cookie. Padrão `SUPER_ADMIN`.

## Modo B — banco local com dados (**já montado nesta máquina**)

Container Postgres **`emendas-pg`** rodando na porta **5433** (5432 e 5435 já
estavam ocupadas por outros projetos), `.env` criado, migrations aplicadas e
dados populados. Para recomeçar do zero em outra máquina:

```bash
# 1. subir Postgres
docker run -d --name emendas-pg \
  -e POSTGRES_PASSWORD=emendas \
  -e POSTGRES_DB=emendas \
  -p 5433:5432 postgres:17

# 2. criar o .env
cat > .env <<'ENV'
DATABASE_URL="postgresql://postgres:emendas@localhost:5433/emendas"
DIRECT_URL="postgresql://postgres:emendas@localhost:5433/emendas"
AUTH_SECRET="dev-local-emendas-ux-nao-usar-em-producao"
AUTH_URL="http://localhost:3000"
ENV

# 3. aplicar migrations e popular
npx prisma migrate deploy
npm run seed                    # base + 8 usuários (0 emendas)
npx tsx prisma/seed-demo.ts     # dataset de UX (ver abaixo)

# 4. rodar
npm run dev
```

Gerenciar o container: `docker start emendas-pg` / `docker stop emendas-pg`.

Login: qualquer conta de `docs/contas-demo.md`, senha `mudar@123`.

> `DATABASE_URL` e `DIRECT_URL` iguais é aceitável em Postgres local (não há
> pooler). Em produção, `DATABASE_URL` é a *pooled* do Neon e `DIRECT_URL` a
> direta.

### Por que o seed oficial não basta

`npm run seed` cria a base de dotações e os 8 usuários, mas **zero emendas e um
único autor** — todos os painéis continuam em estado vazio. Sem emendas não há
farol, KPI, Vereador 360, fila de análise nem portal público com conteúdo.

### `prisma/seed-demo.ts` — o dataset de UX (nosso)

Script que escrevemos para completar o cenário. **Idempotente** (apaga e recria
as emendas do exercício) e **recusa rodar** contra connection string que pareça
de produção.

| | |
| --- | --- |
| Vereadores | 13 (`NUMERO_AUTORES` = 13 → teto global R$ 6,5 mi) |
| Emendas | 41 · R$ 4,935 mi |
| Status | 15 aprovadas · 16 submetidas · 4 inválidas · 3 rascunho · 3 rejeitadas |
| Beneficiários | 14, **com variantes de grafia** de propósito ("Santa Casa" × "Santa Casa de Misericórdia" × "…de Mogi Guaçu"; "APAE" × "APAE Mogi Guaçu") para exercitar a mesclagem de duplicados |
| Normas | LOM, Regimento Interno e Manual → `/conformidade` acende |
| Parâmetros | acrescenta `NUMERO_AUTORES`, `RCL` (R$ 433 mi) e `FUNCAO_SAUDE` |

O status de cada emenda é decidido pelo **motor real** (`avaliarEmenda`
importado de `src/lib/validation/motor.ts`), não escrito à mão — o histórico de
`ValidacaoEmenda` fica coerente com o relatório item a item que a UI mostra.

**Cenários plantados de propósito**, para que cada estado do farol tenha o que
mostrar:

| Cenário | Autor | Efeito na interface |
| --- | --- | --- |
| Invade a reserva da saúde | Edmilson Ferraz (R$ 290 mil fora da saúde) | farol âmbar por autor |
| Invade a reserva da saúde | Fabiana Kobayashi | idem |
| Acima da cota individual | Ivo Salgueiro (R$ 650 mil) | farol **vermelho** + 1 emenda `INVALIDA` por `LIMITE_VALOR_AUTOR` |
| Anulação acima do saldo | 3 emendas | 3 `INVALIDA` por `TIPO_COERENTE` → fila de saneamento da Análise Técnica |
| Cota subutilizada | Helena Vasconcelos, Neusa Bezerra | contraste nas barras por autor |

Verificado renderizando: `/painel` mostra 41 emendas · 13 autores · R$ 4,94 mi ·
teto R$ 6,5 mi · "1 autor(es) acima da cota" · "3 autor(es) usando a reserva da
saúde em outras áreas"; `/analise` lista as filas de saneamento e parecer;
`/publica/emendas` lista as 41 com beneficiários.

### O que o dataset **não** cobre

O volume. São **20 dotações** — a cascata de seleção da Nova Emenda parece
confortável nesse tamanho e é justamente onde está o risco B2 (`<select>`
nativo sem busca). Para avaliar a cascata de verdade é preciso uma base na
ordem de milhares de dotações. **Pendente.**

## Modo C — apontar para o Neon de produção

**Não recomendado para trabalho de UI.** Só se precisar de dados reais, e
sempre em modo leitura consciente — as server actions escrevem no banco real.
Exigiria credenciais do projeto Neon da equipe do protótipo.

## Comandos

| Comando | O que faz | Status verificado |
| --- | --- | --- |
| `npm run dev` | Next dev (Turbopack) | ✅ pronto em 0,4s |
| `npm run build` | `prisma generate && next build` | ✅ 35 rotas |
| `npm run typecheck` | `tsc --noEmit` | ✅ sem erros |
| `npm run lint` | ESLint 9 | — |
| `npm test` | Vitest run | ✅ 39/39 |
| `npm run test:watch` | Vitest watch | — |
| `npm run seed` | `tsx prisma/seed.ts` | requer banco |

## Variáveis de ambiente

| Variável | Uso | Obrigatória? |
| --- | --- | --- |
| `DATABASE_URL` | Postgres *pooled* — runtime, via `@prisma/adapter-pg` | para ter dados |
| `DIRECT_URL` | Postgres direto — migrations (Prisma CLI, `prisma.config.ts`) | para migrar |
| `AUTH_SECRET` | segredo do Auth.js (`npx auth secret`) | sim (build reclama sem) |
| `AUTH_URL` | URL base | produção |

Na Vercel também existem variáveis `Emendas_*` da integração Neon — o
`vercel.json` checa `Emendas_POSTGRES_URL_NON_POOLING`.

## Notas de plataforma

- Node **25** funciona; o CI usa **24**. Se algo divergir, alinhe pelo CI.
- `next.config.ts` fixa `turbopack.root` porque o autor tinha múltiplos
  `package-lock.json` no Windows. Inofensivo no macOS.
- O Prisma client é gerado em `src/generated/prisma/` (fora de `node_modules`),
  por `postinstall`. Se aparecer erro de import em `@/generated/prisma/...`,
  rode `npx prisma generate`.

## Git — decidido em 2026-08-18

**O trabalho vai para o repositório da i10.** `origin` continua apontando para
`legapontes-ai/emendas-parlamentares`; trabalhamos em branch e entregamos por
pull request.

- branch de trabalho: **`feat/ux-redesign`** (criada a partir de `main`)
- ⚠️ **bloqueio:** a conta `diegoramos-dev` tem apenas `pull` no repositório
  (`push: false`). Não dá para publicar a branch direto. Resolver por uma das
  duas vias antes do primeiro push — pedir acesso de escrita à i10, ou
  trabalhar em fork e abrir PR de lá.
- ⚠️ `git config user.email` local é `diegohenriqueinfo@gmail.com`. Os commits
  no repositório do parceiro sairão com esse e-mail. Se a atribuição deve ser
  institucional, ajustar antes do primeiro commit.
