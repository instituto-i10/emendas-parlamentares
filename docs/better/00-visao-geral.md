# 00 — Visão geral

## O problema que o sistema resolve

**Emendas parlamentares impositivas ao orçamento municipal.** No Brasil, o
Executivo municipal envia à Câmara os projetos de lei do **PPA**, **LDO** e
**LOA**. Os vereadores podem apresentar **emendas** a esses projetos —
redirecionando ou acrescentando recursos a dotações específicas. Desde a EC
86/2015 e reforçado pelo STF (ADI 7697, ADPF 854 — arts. 163-A e 166 §§9º/11
da CF), boa parte dessas emendas é **impositiva**: o Executivo é obrigado a
executá-las, e todo o ciclo precisa ser rastreável.

Isso criou um problema operacional real para Câmaras Municipais:

- as emendas eram feitas em **planilha e Word**, com classificação orçamentária
  digitada à mão (e portanto errada);
- não havia como conferir automaticamente se a emenda respeitava PPA/LDO/LOA,
  a **cota por vereador**, a **reserva mínima de saúde** ou o teto global;
- o **TCE-SP** passou a apontar como *impropriedade* nas contas anuais a
  ausência de manual orientativo, de portal público pesquisável e de
  rastreabilidade até o beneficiário final.

O sistema é a resposta: uma plataforma onde a emenda **nasce válida**, porque
o vereador não digita classificação — ele **seleciona** de uma base estruturada
gerada a partir do próprio projeto de lei do Executivo.

## A tese central do produto (não perder isso no redesign)

> **Impossível apresentar uma emenda fora do orçamento.**
>
> Nenhum campo de classificação orçamentária é digitação livre. A emenda
> referencia por chave estrangeira uma `Dotacao` que já existe na base do
> projeto de lei. O que o autor escreve é apenas **objeto**, **justificativa**
> e **valor**.

Isso é o coração da proposta de valor e está codificado no schema
(`Emenda.dotacaoId` é FK obrigatória), na UI (cascata de `<select>`) e no motor
de validação (checagem `DOTACAO_EXISTE`).

## O fluxo institucional, ponta a ponta

```
┌────────────┐   1. sobe o PROJETO_LEI (PPA/LDO/LOA)
│ EXECUTIVO  │──────────────────────────────────────────┐
└────────────┘                                          ▼
                                          ┌──────────────────────────┐
       2. importa planilha CSV/XLSX  ───► │ BASE ESTRUTURADA         │
          (Configurações → Instrumentos)  │ de Dotações (por FK)     │
                                          └──────────────────────────┘
                                                        │
┌────────────┐   3. apresenta emendas SOBRE a base      │
│LEGISLATIVO │◄───────────────────────────────────────--┘
└────────────┘   cascata Órgão→UO→Programa→Ação→Dotação
       │
       │ 4. MOTOR DE VALIDAÇÃO (10 checagens) → VÁLIDA / INVÁLIDA
       │ 5. submete (servidor REVALIDA — não confia no cliente)
       │ 6. Mesa/Técnico emite parecer → APROVADA / REJEITADA
       ▼
┌────────────┐   7. após sanção, sobe a LEI_APROVADA
│ EXECUTIVO  │      vinculada ao PL de origem
└────────────┘
       │
       ▼
  8. ACOMPANHAMENTO: comparativo PL × Lei, emendas acatadas,
     consumo de cota por autor, portal público do cidadão
```

## O que já existe e funciona

| Área | Situação |
| --- | --- |
| Base estruturada por importação de planilha | ✅ CSV/XLSX, validação linha a linha, checagem de integridade |
| Cascata sem digitação livre | ✅ 5 níveis dependentes, sempre restrita ao instrumento base |
| Motor de validação | ✅ 10 checagens, núcleo puro e testado (14 casos) |
| Tramitação (submeter → parecer → aprovar/rejeitar) | ✅ com revalidação no servidor |
| Autenticação e autorização por Poder/papel | ✅ Auth.js v5 + guards de servidor + proxy (middleware) |
| Trilha de auditoria | ✅ `AuditLog` antes/depois em toda mutação |
| Portal público sem login | ✅ agregados, lista pesquisável e página por emenda |
| Manual orientativo público | ✅ `/publica/manual`, com limites vindos dos parâmetros reais |
| Checklist de conformidade TCE | ✅ `/conformidade`, derivado do estado real do banco |
| Exportação CSV/XLSX | ✅ `/api/export/emendas` |
| Deploy em produção | ✅ Vercel + Neon (região `iad1`) |

## Duas gerações de interface convivendo

Este é o fato mais importante para o trabalho de UX. O sistema tem **duas
camadas de navegação sobrepostas**, resultado de um redesign feito no meio do
caminho (commits `4104697` e `712366d`, "identidade visual Emendas360" e
"front-end completo no padrão do mockup"):

1. **Camada "Emendas 360"** (nova, é a que o usuário vê primeiro) — topbar
   escura + abas horizontais. Vistas: Painel, Tramitação, Emendas &
   Beneficiários, Vereador 360, Análise Técnica, Resumo Consolidado,
   Assistente, Conformidade, Ferramentas, Pitch. Configurada em
   `src/config/vistas360.ts`.

2. **Camada "Ferramentas" / hub** (original, ainda ativa) — hub com cards de
   macro-módulos → landing do módulo → ferramenta. Rotas `/legislativo/*`,
   `/executivo/*`, `/config`, `/hub`. Configurada em
   `src/config/navegacao.ts`.

A camada 2 foi *escondida* atrás de uma única aba chamada "Ferramentas", mas
não foi removida — e é onde vivem as operações reais (apresentar emenda,
importar base, subir lei aprovada, configurar parâmetros). Ver
[04-mapa-de-telas.md](04-mapa-de-telas.md) para o inventário completo e a
análise de sobreposição.
