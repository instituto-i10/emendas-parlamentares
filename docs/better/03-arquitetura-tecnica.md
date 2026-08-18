# 03 — Arquitetura técnica

## Stack

| Camada | Tecnologia | Versão no repo |
| --- | --- | --- |
| Framework | Next.js (App Router, **Turbopack**) | `16.2.10` |
| UI | React | `19.2.4` |
| Linguagem | TypeScript | `^5` |
| Banco | PostgreSQL (Neon) | — |
| ORM | Prisma **7** com driver adapter `@prisma/adapter-pg` | `^7.8.0` |
| Auth | Auth.js / `next-auth` v5 (beta) + `@auth/prisma-adapter` | `^5.0.0-beta.31` |
| Estilo | Tailwind CSS **v4** (CSS-first, sem `tailwind.config`) | `^4` |
| Componentes | shadcn/ui (style `radix-nova`) + `radix-ui` | `^4.12.0` / `^1.6.1` |
| Ícones | `lucide-react` | `^1.23.0` |
| Formulários | `react-hook-form` + `@hookform/resolvers` | `^7.80` |
| Validação | **Zod 4** | `^4.4.3` |
| Toasts | `sonner` | `^2.0.7` |
| Planilhas | `xlsx` (SheetJS) | `^0.18.5` |
| Testes | **Vitest 4** | `^4.1.9` |
| Deploy | Vercel (região `iad1`) | — |
| CI | GitHub Actions (lint + typecheck + test + build) | — |

> ⚠️ **Next.js 16 é recente e tem breaking changes.** O próprio repo avisa em
> `AGENTS.md`: consulte `node_modules/next/dist/docs/` antes de assumir APIs.
> Diferenças que já aparecem no código: `searchParams` e `params` são
> **Promises** (precisam de `await`), e o middleware chama-se **`proxy.ts`**
> na raiz de `src/`.

## Estrutura de diretórios

```
src/
├─ app/
│  ├─ layout.tsx              fontes (Inter, Source Serif, Geist Mono), Tooltip, Toaster
│  ├─ page.tsx                redirect → /painel
│  ├─ globals.css             design tokens (ver 04-mapa-de-telas.md)
│  ├─ login/                  tela de login
│  ├─ publica/                PORTAL PÚBLICO (sem autenticação)
│  ├─ (dashboard)/            casca autenticada (AppShell)
│  │   ├─ painel, tramitacao, emendas, vereador360, analise,
│  │   │  placar, assistente, conformidade, pitch, hub    ← vistas "360"
│  │   ├─ legislativo/…       ← ferramentas legadas
│  │   ├─ executivo/…         ← ferramentas legadas
│  │   └─ config/             ← configurações (6 abas)
│  └─ api/
│     ├─ auth/[...nextauth]/  handler do Auth.js
│     └─ export/emendas/      exportação CSV/XLSX
├─ components/
│  ├─ ui/                     shadcn/ui (21 componentes)
│  ├─ e360/                   design system "Emendas 360" (11 componentes)
│  ├─ config/                 abas e diálogos das Configurações
│  ├─ emendas/                formulário, tabela, relatório de validação
│  └─ *.tsx                   AppShell, NavTabs360, PerfilSwitcher, …
├─ config/
│  ├─ navegacao.ts            mapa das FERRAMENTAS (hub/sidebar legado)
│  └─ vistas360.ts            mapa das VISTAS 360 (abas horizontais)
├─ lib/
│  ├─ actions/                server actions ("use server") — 9 arquivos
│  ├─ import/                 pipeline de importação de planilha
│  ├─ validation/             motor + schemas Zod
│  ├─ queries*.ts             leituras/agregações (server-only)
│  ├─ auth.ts / auth.config.ts / session.ts / access.ts / authz.ts
│  ├─ prisma.ts, audit.ts, rate-limit.ts, exercicio.ts, rotulos.ts
│  └─ beneficiarios-dedup.ts
├─ hooks/use-mobile.ts
├─ types/next-auth.d.ts       augmentation da sessão (role, poder)
└─ proxy.ts                   middleware (Next 16)
```

## Padrão de camadas — o que rege todo o código

```
Server Component (page.tsx)
   │  lê ─────────────► src/lib/queries*.ts   ("server-only", Prisma direto)
   │  muta ───────────► src/lib/actions/*.ts  ("use server")
   │                        ├─ getCurrentUser()       ← quem é
   │                        ├─ authz / access guards  ← pode?
   │                        ├─ Zod schema             ← dados válidos?
   │                        ├─ rateLimit()            ← em ações sensíveis
   │                        ├─ prisma.<op>            ← executa
   │                        ├─ registrarAuditoria()   ← trilha
   │                        └─ revalidatePath()       ← invalida cache
   └─ Client Component só onde há interação (formulários, tabs, chat)
```

Praticamente **tudo é Server Component**. Client Components (`"use client"`)
são a minoria: `nova-emenda-form`, `nav-tabs-360`, `perfil-switcher`,
`exercicio-selector`, `chat-assistente`, `form-dialog`, `action-button`,
`mesclar-duplicados`, `tramitacao-actions`, `print-button`, `login-form`.

**Não há API REST interna** além de `/api/export/emendas` e o handler do
Auth.js. Toda mutação é server action. Isso é relevante para o redesign: um
front mais interativo pode precisar de endpoints, ou pode continuar usando
server actions chamadas do cliente (é o que `cascata.ts` já faz — actions de
**leitura** chamadas pelo formulário para popular os selects em cascata).

## Resiliência sem banco — `safe()`

`src/lib/queries.ts` expõe:

```ts
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T>
```

Toda leitura de painel passa por aí. Se o banco estiver fora ou não migrado, a
tela renderiza o **estado vazio** em vez de estourar. Confirmado nesta máquina:
`next dev` **sem `DATABASE_URL`** serve todas as 35 rotas com HTTP 200.

Ótimo para iterar UI. Ruim para avaliar densidade de informação — para isso é
preciso um banco com o seed.

## Sessão e autenticação — atenção ao fallback de dev

`src/lib/session.ts → getCurrentUser()` tem **três caminhos**:

1. sessão real do Auth.js (`auth()`);
2. **fora de produção**, um *fallback por cookie* (`dev-role`, `dev-poder`) que
   fabrica um usuário — permite navegar sem login e **trocar de papel pelo
   `PerfilSwitcher` na topbar**. Padrão: `SUPER_ADMIN`;
3. em produção sem sessão → `redirect("/login")`.

O `authorized` do `auth.config.ts` também **libera tudo fora de produção**.
Ou seja: **em dev não há autenticação.** Excelente para testar personas
rapidamente; perigoso se alguém confundir com o comportamento real.

Rotas públicas em produção: `/login`, `/publica`, `/publica/*`, `/api/auth/*`.

## Conexão Prisma 7 (pegadinha)

Prisma 7 usa **driver adapters** e **não lê `DATABASE_URL` implicitamente**:

- **runtime** → `src/lib/prisma.ts` com `@prisma/adapter-pg` e `DATABASE_URL`
  (conexão *pooled* do Neon);
- **CLI/migrations** → `prisma.config.ts` com `DIRECT_URL` (não-pooled).

O client é gerado em `src/generated/prisma/` (não em `node_modules`) — por isso
os imports são `@/generated/prisma/client` e `@/generated/prisma/enums`. Esse
diretório é gerado por `postinstall`/`build`, **não está versionado**.

## Segurança

| Medida | Onde |
| --- | --- |
| Zod em todas as bordas | `src/lib/validation/schemas.ts` |
| Guards por Poder/papel no servidor | `src/lib/access.ts` (`requireAccess`, redirect ao hub) |
| Proxy/middleware bloqueando rotas | `src/proxy.ts` |
| Nunca confiar em ID do cliente | actions recarregam o recurso e checam autoria |
| Revalidação do motor antes de submeter | `submeterEmenda` |
| Headers de segurança | `next.config.ts` (nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy) |
| `poweredByHeader: false` | `next.config.ts` |
| Rate limiting | `src/lib/rate-limit.ts` — ⚠️ **em memória, por instância**. Não funciona em serverless multi-instância. Dívida reconhecida (migrar p/ Upstash/Redis). |
| Hash de senha | `bcryptjs` |

## Deploy

`vercel.json`:

```json
{
  "regions": ["iad1"],
  "buildCommand": "prisma generate && if [ -n \"$Emendas_POSTGRES_URL_NON_POOLING\" ] || [ -n \"$DIRECT_URL\" ]; then prisma migrate deploy; fi && next build"
}
```

- Região `iad1` (EUA) escolhida deliberadamente para **co-localizar com o Neon**
  (commit `ffbb551`) — havia timeout quando as funções rodavam em `gru1` e o
  banco nos EUA. **Custo:** latência maior para usuários no Brasil. Vale
  reavaliar (mover o Neon para São Paulo e as funções para `gru1`).
- As variáveis prefixadas `Emendas_*` vêm da integração Neon↔Vercel.
- CI (`.github/workflows/ci.yml`): Node 24, `npm ci`, lint, typecheck, test,
  build — **sem banco** (vars vazias).

## Qualidade

- **39 testes** em 6 arquivos, todos passando. Cobrem o que importa e é puro:
  motor de validação (14), dedup de beneficiários (9), validação de importação
  (7), authz (5), integridade (2), parser CSV (2).
- **Zero testes de componente / E2E.** Nenhum Playwright, nenhum Testing
  Library. Isso é um risco direto para o redesign de UI: não há rede de
  segurança automatizada para mudanças de interface.
