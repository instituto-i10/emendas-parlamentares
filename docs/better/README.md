# Documentação de engenharia reversa — Better

Levantamento feito pela **Better** em **18 de agosto de 2026** sobre o
protótipo, antes de começar o trabalho de otimização de experiência e
interface. O objetivo é que nenhuma regra de negócio se perca quando a UI for
redesenhada.

> **Origem.** O código nasceu no repositório pessoal
> [`legapontes-ai/emendas-parlamentares`](https://github.com/legapontes-ai/emendas-parlamentares)
> (39 commits, autor Emerson Pontes), a partir do trabalho do time
> comercial/jurídico do Instituto i10. Este repositório da organização é onde o
> trabalho de UX/UI continua; `main` é um espelho fiel do original no commit
> `2393ca8` e o remote `upstream` aponta para lá.

Esta pasta é **nossa**. A pasta `docs/` acima contém a documentação do time do
protótipo — a [análise regulatória](../analise-regulatoria-gaps.md) e as
[contas de demonstração](../contas-demo.md) — e deve ser lida como fonte
primária sobre as exigências do STF, do MP-SP e do TCE-SP.

## Índice

| | Documento | Do que trata |
| --- | --- | --- |
| 00 | [Visão geral](00-visao-geral.md) | O problema, a tese do produto, o fluxo institucional e o que já funciona |
| 01 | [Domínio e regras](01-dominio-e-regras.md) | Glossário do orçamento público, ciclo de vida da emenda, as dez checagens do motor, parâmetros e importação |
| 02 | [Modelo de dados](02-modelo-de-dados.md) | Schema Prisma comentado, convenções, enums e dados de demonstração |
| 03 | [Arquitetura técnica](03-arquitetura-tecnica.md) | Stack, camadas, sessão, conexão Prisma 7, segurança, deploy e qualidade |
| 04 | [Mapa de telas e design system](04-mapa-de-telas.md) | As 35 rotas, tokens, componentes e onze observações de UX — **a base do redesign** |
| 05 | [Perfis e permissões](05-perfis-e-permissoes.md) | Os oito papéis, três camadas de controle, matriz de visibilidade e personas |
| 06 | [Ambiente local](06-ambiente-local.md) | Três modos de rodar, os datasets (demonstração e volume real) e os testes E2E |
| 07 | [Lacunas e riscos](07-lacunas-e-riscos.md) | Gaps regulatórios mapeados pelo time do protótipo mais dezenove dívidas técnicas |

## Se você só tem cinco minutos

Leia o [00](00-visao-geral.md) inteiro e a seção "Observações de UX" do
[04](04-mapa-de-telas.md). Os três achados que mais importam:

1. **O protótipo não é estático.** É uma aplicação Next.js 16 full-stack com
   PostgreSQL, Prisma, Auth.js e deploy em produção na Vercel. O trabalho é
   redesenhar a interface de um sistema que funciona — sem quebrar regras já
   codificadas, testadas e validadas com o time jurídico.

2. **Existem duas gerações de interface convivendo.** A camada "Emendas 360"
   (abas horizontais) foi sobreposta à camada anterior (hub → módulo →
   ferramenta) sem removê-la. A ação mais importante do produto — apresentar
   uma emenda — atravessa as duas.

3. **A cascata de seleção da dotação usa `<select>` nativo em cinco níveis,
   sem busca.** Com a base no tamanho real (~2.300 dotações), o seletor de
   remanejamento chega a **2.375 opções num `<select>` nativo** cujos rótulos
   não dizem órgão, programa nem ação. É a tela crítica de conversão do
   produto e o item de maior prioridade.

## Estado verificado

Rodado localmente em 18/08/2026:

| Verificação | Resultado |
| --- | --- |
| `npm install` | ok (Node 25.8, npm 11.11) |
| `npm run typecheck` | sem erros |
| `npm test` | 39 testes unitários |
| `npm run test:e2e` | 45 testes end-to-end |
| `next build` | 35 rotas |
| `next dev` sem banco | todas as rotas em HTTP 200 (estados vazios) |

Ambiente: Postgres em Docker, com o dataset de demonstração (41 emendas,
13 vereadores) e a base com volume de LOA real (~2.300 dotações). Ver
[06](06-ambiente-local.md).

## Manutenção

Estes documentos descrevem o sistema a partir do commit `2393ca8`. Ao mexer em
regra de negócio, motor de validação, schema ou navegação, atualize o
documento correspondente no mesmo pull request — documentação que diverge do
código é pior do que documentação nenhuma.

Antes e depois de qualquer mudança de interface, rode `npm run test:e2e`
(~1 min). A suíte trava justamente o que um redesign quebra sem querer: quem vê
o quê, o que a submissão exige e o que o portal público expõe sem login.
