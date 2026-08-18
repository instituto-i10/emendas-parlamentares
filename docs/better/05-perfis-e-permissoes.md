# 05 — Perfis, permissões e personas

## Os 8 papéis

| Poder | Papel | Persona real | Faz o quê |
| --- | --- | --- | --- |
| Transversal | `SUPER_ADMIN` | administrador da plataforma | tudo, em todos os Poderes |
| Executivo | `EXEC_ADMIN` | Secretário de Governo / Planejamento | tudo do Executivo + Configurações |
| Executivo | `EXEC_PLANEJAMENTO` | técnico de orçamento da Prefeitura | instrumentos, base de dotações, lei aprovada |
| Executivo | `EXEC_CONSULTA` | demais servidores do Executivo | somente leitura |
| Legislativo | `LEG_ADMIN` | Mesa Diretora da Câmara | tudo do Legislativo + tramitar + Configurações |
| Legislativo | `LEG_TECNICO` | analista/assessoria técnica da Câmara | apresentar, validar, tramitar (sem Configurações) |
| Legislativo | `LEG_AUTOR` | **vereador(a)** | apresenta e gere **as próprias** emendas |
| Legislativo | `LEG_CONSULTA` | demais servidores da Câmara | somente leitura |

Sem papel: **Cidadão** — acessa `/publica/*` sem login.

## Três camadas de controle (todas no servidor)

1. **Visibilidade** — `podeVerModulo` / `podeVerFerramenta`
   (`src/config/navegacao.ts`) e `vistasVisiveis` (`src/config/vistas360.ts`).
   Filtram o que aparece. *"Mínimo aparente" é regra de dados: o usuário só vê
   o que seu Poder/papel permite.*
2. **Guards de rota** — `requireAccess`, `requirePoderAcesso`, `requireRole`
   (`src/lib/access.ts`). Acesso indevido → `redirect("/hub?erro=acesso-negado")`.
3. **Autorização de ação** — funções puras em `src/lib/authz.ts`, chamadas
   dentro de cada server action, **sempre recarregando o recurso do banco**.

O `proxy.ts` (middleware) é a quarta barreira, em produção.

## Vistas 360 por papel

| Vista | `LEG_ADMIN` | `LEG_TECNICO` | `LEG_AUTOR` | `LEG_CONSULTA` | `EXEC_*` | `SUPER_ADMIN` |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| Painel | ✅ | ✅ | ➡️* | ✅ | ✅ | ✅ |
| Tramitação | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Emendas & Beneficiários | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vereador 360 | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Análise Técnica | ✅ | ✅ | ✅ | — | — | ✅ |
| Resumo Consolidado | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Assistente | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Conformidade | ✅ | ✅ | — | — | `EXEC_ADMIN` | ✅ |
| Ferramentas | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pitch | ✅ | — | — | — | `EXEC_ADMIN` | ✅ |

\* `LEG_AUTOR` que acessa `/painel` é **redirecionado** para `/vereador360`
(`vistaInicial()` e o `redirect` no topo de `painel/page.tsx`). O gabinete cai
direto na própria cota.

## Ferramentas por papel

| Ferramenta | Papéis |
| --- | --- |
| Nova emenda / Minhas emendas | `LEG_ADMIN`, `LEG_TECNICO`, `LEG_AUTOR` |
| Todas as emendas | `LEG_ADMIN`, `LEG_TECNICO`, `LEG_CONSULTA` |
| Tramitação (status / acatadas / relatórios) | todos os `LEG_*` |
| Instrumentos | todos os `EXEC_*` |
| Base de dotações · Lei aprovada | `EXEC_ADMIN`, `EXEC_PLANEJAMENTO` |
| Acompanhamento (comparação / execução) | todos os `EXEC_*` |
| Configurações | `SUPER_ADMIN`, `EXEC_ADMIN`, `LEG_ADMIN` |

## Contas de demonstração

Senha de todas: **`mudar@123`**. O campo do formulário é **`senha`**, não
`password`.

| Papel | E-mail |
| --- | --- |
| Super Admin | `super@municipio.gov.br` |
| Executivo · Admin | `exec.admin@municipio.gov.br` |
| Executivo · Planejamento | `planejamento@municipio.gov.br` |
| Executivo · Consulta | `exec.consulta@municipio.gov.br` |
| Legislativo · Mesa | `mesa@camara.gov.br` |
| Legislativo · Técnico | `analista@camara.gov.br` |
| Legislativo · Vereador(a) | `vereador@camara.gov.br` |
| Legislativo · Consulta | `leg.consulta@camara.gov.br` |

Detalhe: **só o perfil Vereador tem um `Autor` vinculado**. Os demais não
apresentam emendas em nome próprio — se você logar como Mesa e criar uma
emenda, precisa escolher um autor existente.

## Personas para o trabalho de UX

| Persona | Objetivo dominante | Frequência de uso | Tela âncora hoje |
| --- | --- | --- | --- |
| **Vereador(a)** | "Quanto ainda tenho de cota? Minha emenda passou?" | picos na janela de emendas (dias) | `/vereador360` |
| **Assessoria técnica da Câmara** | "O que precisa de saneamento ou parecer hoje?" | diária na janela | `/analise` |
| **Mesa Diretora** | "O conjunto está conforme? Onde estão os riscos?" | semanal | `/painel` |
| **Técnico de orçamento (Prefeitura)** | "Subir o PL, gerar a base, subir a lei aprovada" | pontual (poucas vezes/ano) | `/executivo/planejamento/*` |
| **Controle interno / TCE** | "Isso resiste a uma auditoria?" | anual | `/conformidade`, `/config` → Auditoria |
| **Cidadão / imprensa** | "Para onde foi o dinheiro do meu vereador?" | esporádica | `/publica/emendas` |

Observação: as duas personas de **maior volume de uso** (vereador e assessoria)
são exatamente as que hoje atravessam as duas camadas de navegação para
completar sua tarefa principal.
