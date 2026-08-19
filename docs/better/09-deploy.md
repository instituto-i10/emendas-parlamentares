# 09 — Deploy da demonstração (Vercel + Neon, conta Instituto i10)

Como a demonstração de Mogi Guaçu vai ao ar e como repor a base quando
precisar. Montado em 19/08/2026.

## Coordenadas

| | |
| --- | --- |
| Repositório | `instituto-i10/emendas-parlamentares` (privado) |
| Branch publicado | **`feat/ux-redesign`** |
| Time Vercel | Instituto i10 — `ti-7875s-projects` |
| Projeto Vercel | `emendas-parlamentares` (`prj_TgiSC0vRiyHRlAHig09PtptfG4dj`) |
| URL estável | https://emendas-parlamentares-ti-7875s-projects.vercel.app |

> ⚠️ **`emendas-parlamentares.vercel.app` (sem sufixo) NÃO é nosso.** É o deploy
> do Emerson, na conta dele. Dá para abrir e responde 200 — mas mostra
> "exercício 2026", os dados de teste dele. O nosso é o endereço **com**
> `-ti-7875s-projects`. Não confundir ao mandar o link.

## Armadilhas já encontradas (não repetir)

1. **`vercel link` oferece o remote errado.** O repo local tem dois remotes e o
   CLI sugere o `upstream` (`legapontes-ai`, do Emerson) como primeira opção.
   Conectar ali publicaria na conta errada. Sempre explicitar:
   ```bash
   vercel git connect https://github.com/instituto-i10/emendas-parlamentares \
     --scope ti-7875s-projects --yes
   ```

2. **`main` não pode ir a produção.** `main` é espelho fiel do commit original
   do Emerson (`2393ca8`) — publicá-lo seria voltar ao código pré-redesign.
   Bloqueado no `vercel.json`:
   ```json
   "git": { "deploymentEnabled": { "main": false } }
   ```

3. **A integração Neon do marketplace cria variável duplicada.** Ela também
   define `DATABASE_URL`/`POSTGRES_URL` **sem prefixo apontando para outro
   banco** (o Neon Auth) — usá-las dá `table does not exist`. Está documentado
   em `src/lib/prisma.ts:16-22`. Por isso usamos o **Neon i10 direto**, com as
   variáveis definidas à mão.

4. **Os seeds recusam banco remoto por padrão.** Guard proposital: qualquer
   connection string com `neon.tech`/`vercel` é rejeitada. Para semear a
   demonstração hospedada, é preciso dizer que é de propósito:
   `PERMITIR_BANCO_REMOTO=1`.

## Estado atual

| Passo | Situação |
| --- | --- |
| Projeto Vercel criado no i10 | ✅ |
| Conectado ao GitHub do i10 | ✅ |
| `main` bloqueado para deploy | ✅ |
| `AUTH_SECRET` (production, preview, development) | ✅ |
| Vercel Authentication desligada (link público) | ✅ |
| Build passando na Vercel | ✅ |
| **Banco Neon** | ⏳ falta criar |
| **Base 2027 carregada** | ⏳ depende do banco |
| Branch de produção no painel da Vercel | ⏳ ainda `main` — ver abaixo |

Sem banco o app **não quebra**: degrada para estado vazio ("Exercício —",
R$ 0,00), pelo `safe()` em `src/lib/queries.ts`.

## O que falta

### 1. Criar o banco no Neon i10

No console do Neon (conta do Instituto i10) → **New Project**. Região sugerida:
`us-east-2` (mesma do `iad1` da Vercel, definido no `vercel.json`).

Copiar as duas connection strings do projeto:

- **Direct** — o host **sem** `-pooler`
- **Pooled** — o host **com** `-pooler`

### 2. Definir as variáveis

```bash
cd prototipo
printf '%s' 'postgresql://…SEM-pooler…' | vercel env add DATABASE_URL production --scope ti-7875s-projects --force
printf '%s' 'postgresql://…SEM-pooler…' | vercel env add DIRECT_URL   production --scope ti-7875s-projects --force
```

**As duas recebem a string DIRECT (sem `-pooler`), de propósito.** O
`src/lib/prisma.ts:12-18` explica: o pooler (PgBouncer) do Neon com o
`adapter-pg` causava "tabela não existe" e confusão de sessão. Migrar para
`@prisma/adapter-neon` fica como melhoria futura — aí a pooled passa a valer
para o runtime.

### 3. Publicar (as migrações rodam sozinhas)

```bash
vercel --prod --scope ti-7875s-projects --yes
```

O `buildCommand` do `vercel.json` roda `prisma migrate deploy` sempre que
existir `DIRECT_URL`. Não precisa fazer nada à mão.

### 4. Carregar a base

O build **não** semeia. A carga é feita da máquina, apontando para o Neon —
assim não existe rota de seed exposta em produção:

```bash
cd prototipo
DIRECT_URL='postgresql://…SEM-pooler…' \
DATABASE_URL='postgresql://…SEM-pooler…' \
PERMITIR_BANCO_REMOTO=1 npm run db:deploy
```

`db:deploy` roda, nesta ordem:

| | O quê | Natureza |
| --- | --- | --- |
| `seed.ts` | exercício 2025, 8 usuários, parâmetros gerais | base do protótipo |
| `seed-2027.ts` | 28 órgãos, 45 unidades, 183 ações, 1.163 dotações, R$ 993,3 mi | **base real** + dotações simuladas |
| `seed-2027-emendas.ts` | 44 emendas de 13 vereadores | demonstração |

O `seed-2027` confere a soma lendo de volta do banco e **aborta** se não fechar
com os R$ 993.305.344,00 do Anexo V da LDO.

### 5. Um clique no painel (opcional, mas recomendado)

A branch de produção do projeto ainda é `main`, e a API da Vercel não expõe esse
campo. Em **Project → Settings → Git → Production Branch**, trocar para
`feat/ux-redesign`. Sem isso, `git push` na branch gera *preview* em vez de
produção — e a produção só sai por `vercel --prod` da máquina.

## Repor a demonstração

Se alguém bagunçar os dados durante a apresentação (aprovar, rejeitar,
apresentar emendas), a base volta assim:

```bash
DIRECT_URL='…' DATABASE_URL='…' PERMITIR_BANCO_REMOTO=1 npm run db:deploy
```

Os seeds são idempotentes nas partes de catálogo (`upsert`) e pulam o que já
existe nas partes de volume. Para uma reposição **limpa** das emendas, apagar
antes o exercício 2027:

```sql
DELETE FROM "ValidacaoEmenda" v USING "Emenda" m JOIN "Exercicio" e
  ON e.id = m."exercicioId" WHERE v."emendaId" = m.id AND e.ano = 2027;
DELETE FROM "Exercicio" WHERE ano = 2027;
```

A geração é determinística: a mesma recarga dá exatamente os mesmos
R$ 10.596.131,45 em 44 emendas.

## Quem consegue entrar

O link é **público** — landing e portal de consulta abrem sem login, que é o
comportamento correto (é dado orçamentário público).

O sistema interno pede login, com as contas de demonstração de
[`../contas-demo.md`](../contas-demo.md), senha `mudar@123`.

> **Consequência assumida:** quem descobrir a URL pode entrar como Mesa Diretora
> e aprovar ou rejeitar emendas. Para uma demonstração é aceitável — os dados
> são fictícios e reponíveis pelo comando acima. Se o link vazar mais do que se
> quer, dá para ligar a proteção de volta:
> ```bash
> curl -X PATCH "https://api.vercel.com/v9/projects/prj_TgiSC0vRiyHRlAHig09PtptfG4dj?teamId=team_aolG1eOXoVl3vxINUg70WjC9" \
>   -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
>   -d '{"ssoProtection":{"deploymentType":"all_except_custom_domains"}}'
> ```

## Assistente (opcional)

O botão flutuante responde sobre o exercício ativo mesmo sem chave. Para
conversar de verdade:

```bash
printf '%s' 'sk-…' | vercel env add OPENAI_API_KEY production --scope ti-7875s-projects --force
```
