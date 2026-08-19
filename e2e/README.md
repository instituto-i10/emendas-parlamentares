# Testes end-to-end

Rede de segurança para o redesign de interface. Antes desta suíte o projeto
tinha 39 testes unitários — todos sobre lógica pura (motor de validação,
deduplicação, importação, autorização) — e **nada** cobrindo a interface.

## Como rodar

```bash
npm run test:e2e          # suíte completa (~1 min)
npm run test:e2e:ui       # modo interativo, para depurar
npm run test:e2e:report   # abre o último relatório HTML
```

Pré-requisito: o Postgres local rodando (`docker start emendas-pg`). O resto —
banco de teste, migrations, dados e build — é preparado sozinho.

## Duas decisões que valem entender

**Roda contra um build de produção, não contra o `next dev`.** Fora de produção
o sistema desliga a autenticação: `getCurrentUser` cai num fallback por cookie
que fabrica um `SUPER_ADMIN`, e o callback `authorized` libera todas as rotas.
Testar em modo dev validaria uma aplicação que não existe em produção — os
testes de permissão passariam sem exercitar guard nenhum. Por isso o
`webServer` do Playwright roda `next build && next start`.

**Banco separado.** Tudo acontece em `emendas_test`, nunca no banco de
desenvolvimento. O `global-setup` aplica as migrations e roda os três seeds em
sequência, o que devolve o banco ao mesmo estado a cada execução — inclusive
apagando as emendas que os próprios testes criaram.

Não usamos `prisma migrate reset`: é destrutivo e desnecessário, já que os
seeds são idempotentes. Se algum dia for preciso um reset de verdade (mudança
incompatível de migration), rode conscientemente:

```bash
DIRECT_URL=postgresql://postgres:emendas@localhost:5433/emendas_test \
  npx prisma migrate reset --force
```

## O que está coberto

| Arquivo | Cobre |
| --- | --- |
| `publico.spec.ts` | Portal do cidadão sem login: rotas abertas, busca, filtros, página da emenda, manual. Trava a transparência ativa exigida pelo STF/TCE. |
| `auth.spec.ts` | Login das 8 contas, credenciais inválidas, rota protegida sem sessão, persistência e o redirecionamento do gabinete para o Vereador 360. |
| `permissoes.spec.ts` | Abas visíveis por papel, guards de servidor contra acesso cruzado entre Poderes e ações restritas por papel. |
| `nova-emenda.spec.ts` | A cascata de cinco níveis (dependência, limpeza em cascata, natureza/fonte em leitura), rascunho → validar → submeter, e a ausência de campo livre de classificação. |
| `tramitacao.spec.ts` | Fila de emendas submetidas, parecer obrigatório para decidir, decisão tirando a emenda da fila, e o que o perfil de consulta não pode fazer. |
| `painel.spec.ts` | Consolidação do exercício, parâmetros nos indicadores, itens do farol, Vereador 360, checklist de conformidade e exportação CSV. |

45 testes.

## Os testes de regressão de UX

Em `nova-emenda.spec.ts`, o bloco **"cascata sob volume realista"** não verifica
que algo funciona — mede o quanto **não** funciona, com a base cheia
(~2.300 dotações, gerada por `prisma/seed-volume.ts`):

```
⚠️  Dotação de origem: 2375 <option> num select nativo sem busca
⚠️  2375 opções para 2334 rótulos distintos
```

O rótulo de cada opção mostra apenas natureza, fonte e saldo — nunca órgão,
programa ou ação. O teste afirma isso explicitamente. É o baseline do risco B2
do [documento 07](../docs/better/07-lacunas-e-riscos.md): quando o redesign
trocar o `<select>` por um combobox com busca, estes testes mudam de propósito
e passam a documentar a melhoria.

## Ao mexer na interface

Os testes usam papéis e textos visíveis (`getByRole`, `getByLabel`), não
classes CSS nem `data-testid`. Reorganizar layout, trocar cores ou refatorar
componentes não deveria quebrá-los. O que quebra de propósito é mudar **texto
de interface**, **rótulo de campo** ou **quem pode ver o quê** — e nesses casos
a quebra é a informação que se quer.

Dois cuidados ao escrever teste novo:

- `getByLabel` casa por substring. "Ação" também casa com "Dot**ação**" e com a
  trilha de "nav**egação**" — use sempre `{ exact: true }`.
- `getByRole("alert")` casa também com o *route announcer* do Next. Prefira o
  texto da mensagem.
