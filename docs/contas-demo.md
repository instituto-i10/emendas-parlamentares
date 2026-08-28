# Contas de demonstração — Emendas360

Repertório de usuários de demonstração criados pelo seed (`src/lib/seed-data.ts`),
um para cada **perfil de acesso** base. **Senha padrão de todos: `mudar@123`.**

> Estas contas são fictícias, para demonstração. Troque as senhas antes de
> qualquer uso com dados reais.

## O que mudou (PROMPT 12)

Os 8 papéis fixos do código deram lugar a **perfis de acesso registrados em
banco**: um Poder de atuação somado a permissões atômicas marcadas por caixa de
seleção. O Administrador Geral compõe perfis novos em Configurações → Perfis,
sem alteração de código.

As 6 contas antigas (`exec.admin`, `planejamento`, `exec.consulta`, `mesa`,
`analista`, `leg.consulta`) foram removidas. Restaram 5, uma por perfil.

## Contas

| Perfil | Usuário (e-mail) | Poder | O que faz |
| --- | --- | --- | --- |
| Administrador Geral | `super@municipio.gov.br` | transversal | Acesso total. Único que compõe perfis de acesso. |
| Poder Executivo | `executivo@municipio.gov.br` | Executivo | Instrumentos, base de dotações e lei aprovada; analisa a viabilidade técnica e lança a execução das emendas. |
| Presidente da Câmara | `presidente@camara.gov.br` | Legislativo | Apresenta, gere todas, tramita, abre/encerra exercícios e administra configurações. |
| Comissão de Finanças e Orçamento | `comissao@camara.gov.br` | Legislativo | Gere qualquer emenda e conduz a Análise Técnica. **Não** apresenta emenda em nome próprio. |
| Vereador | `vereador@camara.gov.br` | Legislativo | Gabinete: apresenta e gere as próprias emendas. Cai direto no Vereador 360, travado na própria cota. |

## As 8 permissões

| Permissão | O que autoriza |
| --- | --- |
| Apresentar emendas | Criar emendas e gerir as de própria autoria. |
| Gerir todas as emendas | Editar, validar e submeter qualquer emenda do exercício. |
| Tramitar emendas | Aprovar ou rejeitar emendas submetidas, com parecer. |
| Gerir planejamento | Instrumentos PPA/LDO/LOA, base de dotações e lei aprovada. |
| Abrir/encerrar exercícios | Ciclo do exercício orçamentário. |
| Administrar configurações | Parâmetros, normas, beneficiários e usuários. |
| Analisar viabilidade técnica | Registrar parecer de viabilidade nas emendas (Executivo). |
| Registrar execução | Lançar empenho, liquidação e pagamento (Executivo). |

## Regras que valem para todos

- **Poder antes de permissão.** Um módulo do Legislativo é inacessível a perfil
  do Executivo e vice-versa, ainda que a permissão exista no perfil.
- **Consulta é livre dentro do Poder.** Painéis, resumos e relatórios não
  exigem permissão. A lista item a item das emendas de terceiros exige
  *gerir todas* ou *tramitar* — o gabinete acompanha pelos agregados.
- **Perfil sem permissão de escrita** é perfil de consulta: enxerga os painéis
  do seu Poder, sem botões de ação.
- **Sem perfil, sem acesso.** A conta autentica, mas volta ao login com o aviso
  "Sua conta ainda não tem um perfil de acesso".
- **Mudança de perfil vale no próximo login** da pessoa afetada: o perfil é
  gravado na sessão no momento do login.
- **Só o Administrador Geral** atribui o perfil Administrador Geral ou perfis de
  outro Poder — o Executivo não cadastra gente da Câmara.

## Visão sem login

| Persona | Acesso |
| --- | --- |
| Cidadão | `/publica` — agregados em linguagem simples, sem autenticação |

## Notas

- O campo do formulário/API de login é **`senha`** (não `password`).
- Apenas o perfil Vereador tem um `Autor` vinculado (Vereador Exemplo) — é o
  único que apresenta emendas em nome próprio nas contas de demonstração.
- As contas são recriadas/atualizadas de forma idempotente pelo seed; alterar a
  senha pelo banco será sobrescrito se o seed rodar de novo.
