<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Como publicar as alterações neste projeto

Quem trabalha aqui quer **ver a mudança no ar**, não montar ambiente. Leia esta
seção antes de propor qualquer coisa que envolva rodar o sistema.

## Publicar é dar push na `main`

```
git add -A
git commit -m "descrição curta do que mudou"
git push origin main
```

É só isso. O push na `main` dispara o deploy de produção na Vercel
automaticamente — leva de 1 a 3 minutos. Depois abra:

**https://emendas-parlamentares-eight.vercel.app**

Não existe passo manual de deploy. Não rode `vercel --prod`, não peça para
ninguém apertar botão: o push É a publicação.

Enquanto o deploy roda, dá para acompanhar em
https://vercel.com/ti-7875s-projects/emendas-parlamentares

## Mudou o banco de dados? Já vai junto

Se você alterou `prisma/schema.prisma`, crie a migração normalmente
(`npx prisma migrate dev --name descricao-curta`) e **commite a pasta gerada em
`prisma/migrations/`**. O build da Vercel aplica as migrações pendentes sozinho,
antes de subir o código. Não é preciso mexer no banco de produção à mão — e não
se deve.

Atenção ao contrário disso: uma migração destrutiva (apagar coluna, apagar
tabela) chega à produção no mesmo push, sem revisão de ninguém. Migração que
remove dado precisa ser combinada com o responsável antes.

## Não há banco de dados nesta máquina

O ambiente local completo pede Docker e um Postgres, e **isso não está montado
aqui**. Portanto:

- **Não sugira** `npm run dev`, `npm run seed`, `npx prisma migrate dev` contra
  um banco local, nem `docker compose up`. Vai falhar por falta de conexão.
- **Não tente** rodar a suíte end-to-end (`npm run test:e2e`): ela levanta um
  banco de teste próprio e um build de produção.

O que **funciona sem banco** e deve ser usado para conferir o trabalho:

```
npx tsc --noEmit      # erros de tipo
npx eslint .          # padrão de código
npx vitest run        # testes de regra de negócio (puros, sem banco)
```

Rode os três antes de dar push. Se algum reclamar, conserte antes de publicar —
o que vai para a `main` vai para a produção.

## O que nunca entra no repositório

Vídeo, tutorial gravado, apresentação e material de divulgação ficam fora. Se
existirem as pastas `video/`, `video-final/` ou `apresentacoes/`, ignore-as: elas
não são versionadas de propósito, e commitá-las deixa o repositório pesado sem
necessidade.

Segredo nenhum vai para o código. As chaves e as URLs de banco vivem nas
variáveis de ambiente da Vercel; o `.env` local é ignorado pelo git e deve
continuar assim.

## Onde ficam as regras do domínio

Antes de mexer na lógica de emendas, leia:

- `src/lib/finalidade.ts` — o que cada dotação aceita: quem recebe define a
  modalidade de aplicação, para que serve define o grupo e o elemento, e emenda
  impositiva só entra em despesa discricionária.
- `src/lib/plano-modelo.ts` — qual dos quatro modelos de plano de trabalho vale.
- `src/lib/validation/motor.ts` — a pré-checagem item a item da emenda.

Os três são regra pura, sem banco, e têm teste em `src/lib/__tests__/`. Mudou a
regra, atualize o teste no mesmo commit.

## Documentação do sistema

`docs/better/` descreve domínio, modelo de dados, telas, perfis e o caminho de
publicação. `docs/contas-demo.md` lista as contas de demonstração para entrar no
sistema publicado.
