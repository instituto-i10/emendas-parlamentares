import { z } from "zod";
import {
  EscopoParametro,
  EspecieInstrumento,
  EtapaExecucao,
  ModoValidacao,
  ResultadoViabilidade,
  Poder,
  StatusInstrumento,
  TipoBeneficiario,
  TipoEmenda,
  TipoInstrumento,
  TipoNorma,
} from "@/generated/prisma/enums";

// Helper: transforma um enum-objeto do Prisma em tupla para z.enum (compatível
// entre versões do zod, sem depender de nativeEnum).
function valores<T extends Record<string, string>>(e: T): [string, ...string[]] {
  return Object.values(e) as [string, ...string[]];
}

// Enum opcional que aceita "" (select nativo vazio) como ausência.
function enumOpcional<T extends Record<string, string>>(e: T) {
  return z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(valores(e)).optional()
  );
}

const textoOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const dataOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

// ---------------------------------------------------------------- Parâmetros
export const parametroSchema = z
  .object({
    escopo: z.enum(valores(EscopoParametro)),
    exercicioId: textoOpcional,
    chave: z.string().trim().min(1, "Informe a chave."),
    valor: z.string().trim().min(1, "Informe o valor."),
    modo: enumOpcional(ModoValidacao),
    fundamentoNormaId: textoOpcional,
    fundamentoDescricao: textoOpcional,
  })
  .refine(
    (d) => d.escopo !== EscopoParametro.EXERCICIO || !!d.exercicioId,
    { message: "Escopo por exercício exige selecionar o exercício.", path: ["exercicioId"] }
  );

export type ParametroInput = z.input<typeof parametroSchema>;

// ------------------------------------------------------------- Documento normativo
export const normaSchema = z.object({
  tipo: z.enum(valores(TipoNorma)),
  titulo: z.string().trim().min(1, "Informe o título."),
  numero: textoOpcional,
  arquivoUrl: z.string().trim().url("Informe uma URL válida do PDF."),
  dataVigencia: dataOpcional,
  ativo: z.boolean().default(true),
});

export type NormaInput = z.input<typeof normaSchema>;

// ------------------------------------------------- Instrumento: Projeto de Lei
export const instrumentoPLSchema = z.object({
  tipo: z.enum(valores(TipoInstrumento)),
  numero: z.string().trim().min(1, "Informe o número."),
  ementa: z.string().trim().min(1, "Informe a ementa."),
  exercicioId: z.string().trim().min(1, "Selecione o exercício."),
  arquivoUrl: z
    .string()
    .trim()
    .url("URL inválida.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  dataEnvio: dataOpcional,
});

export type InstrumentoPLInput = z.input<typeof instrumentoPLSchema>;

// ------------------------------------------------- Instrumento: Lei aprovada
export const leiAprovadaSchema = z.object({
  instrumentoOrigemId: z.string().trim().min(1, "Selecione o projeto de lei de origem."),
  numero: z.string().trim().min(1, "Informe o número."),
  ementa: z.string().trim().min(1, "Informe a ementa."),
  arquivoUrl: z
    .string()
    .trim()
    .url("URL inválida.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  status: z.enum(valores(StatusInstrumento)).default(StatusInstrumento.SANCIONADO),
  dataAprovacao: dataOpcional,
  dataVigencia: dataOpcional,
});

export type LeiAprovadaInput = z.input<typeof leiAprovadaSchema>;

// ----------------------------------------------------------------- Usuários
export const usuarioSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  email: z.string().trim().email("E-mail inválido."),
  // O Poder do usuário passa a vir do perfil — não é mais escolhido à mão.
  perfilId: z.string().trim().min(1, "Atribua um perfil de acesso."),
  // Senha opcional (mín. 8). Se ausente, o usuário fica sem credencial até definir.
  senha: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type UsuarioInput = z.input<typeof usuarioSchema>;

// Espécie usada ao criar instrumento base (sempre PROJETO_LEI na aba 3).
export const ESPECIE_BASE = EspecieInstrumento.PROJETO_LEI;

// ------------------------------------------------------------------ Emendas
// Valor de rascunho: aceita vazio e vira 0. Um rascunho pode não ter valor
// ainda — quem cobra o valor preenchido é o motor, na hora de validar.
const valorRascunho = z.preprocess((v) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}, z.number({ message: "Valor inválido." }).min(0, "O valor não pode ser negativo."));

// ---------------------------------------------------------------------------
// Rascunho PERMISSIVO de propósito.
//
// O vereador monta a emenda ao longo de dias e precisa poder guardar o que já
// escreveu. Só a dotação é exigida — é ela que ancora a emenda a uma linha do
// orçamento e não é digitada, vem da cascata. Objeto, justificativa e valor
// entram vazios e são cobrados pelo motor (item CAMPOS_PREENCHIDOS) antes da
// remessa. Regra dada pelo jurídico do cliente: "sempre salvar rascunho
// independente de estar completa a emenda; somente não habilitar a remessa".
// ---------------------------------------------------------------------------
export const emendaRascunhoSchema = z
  .object({
    instrumentoBaseId: z.string().trim().min(1, "Selecione o projeto de lei base."),
    dotacaoId: z.string().trim().min(1, "Selecione a dotação."),
    tipo: z.enum(valores(TipoEmenda)),
    objeto: z.string().trim().default(""),
    justificativa: z.string().trim().default(""),
    valor: valorRascunho,
    // Beneficiário final (rastreabilidade ponta a ponta — STF/TCE).
    beneficiarioId: textoOpcional,
    dotacaoOrigemId: textoOpcional,
    dotacaoDestinoId: textoOpcional,
  })
  .refine(
    (d) =>
      d.tipo !== TipoEmenda.REMANEJAMENTO ||
      (!!d.dotacaoOrigemId && !!d.dotacaoDestinoId),
    { message: "Remanejamento exige dotação de origem e destino.", path: ["dotacaoOrigemId"] }
  );

export type EmendaRascunhoInput = z.input<typeof emendaRascunhoSchema>;

// --------------------------------------------------- Plano de trabalho
// Permissivo como o rascunho da emenda: aceita campos vazios e planilha
// incompleta. O que cobra o preenchimento é a pré-checagem (motor), na hora da
// remessa — não o formulário, enquanto o autor ainda está trabalhando.
const numeroPlanilha = z.preprocess((v) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}, z.number({ message: "Valor inválido." }).min(0, "Não pode ser negativo."));

// Plano de trabalho nos quatro modelos. O núcleo — metas, memória de cálculo e
// cronograma — é comum; os campos do terceiro setor chegam vazios nos demais
// modelos e são gravados vazios, sem erro: quem esconde os campos é o
// formulário, e o schema não precisa saber de qual modelo veio a submissão.
export const planoTrabalhoSchema = z.object({
  metas: z
    .array(
      z.object({
        beneficiarios: z.string().trim().max(300).default(""),
        unidade: z.string().trim().max(60).default(""),
        metaFisica: numeroPlanilha,
        comprovacao: z.string().trim().max(300).default(""),
      })
    )
    .max(50, "No máximo 50 metas.")
    .default([]),

  itens: z
    .array(
      z.object({
        beneficiarios: z.string().trim().max(300).default(""),
        metaFisica: numeroPlanilha,
        valorUnitario: numeroPlanilha,
        origemPreco: z.string().trim().max(300).default(""),
      })
    )
    .max(50, "No máximo 50 linhas na memória de cálculo.")
    .default([]),

  parcelas: z
    .array(z.object({ valor: numeroPlanilha }))
    .max(36, "No máximo 36 parcelas.")
    .default([]),

  entidadeRazaoSocial: z.string().trim().max(300).default(""),
  entidadeCnpj: z.string().trim().max(20).default(""),
  entidadeAnos: z.coerce.number().int().min(0).max(500).nullable().default(null),
  orgaoRepassador: z.string().trim().max(300).default(""),

  // Escritas uma a uma, e não geradas da constante: o schema é o contrato de
  // entrada, e um contrato que se lê inteiro vale mais do que um gerado.
  declaracoes: z
    .object({
      declIdentificacao: z.coerce.boolean().default(false),
      declConstituicao: z.coerce.boolean().default(false),
      declAdimplencia: z.coerce.boolean().default(false),
      declParentesco: z.coerce.boolean().default(false),
      declSancoes: z.coerce.boolean().default(false),
      declFichaLimpa: z.coerce.boolean().default(false),
      declResponsabilidade: z.coerce.boolean().default(false),
    })
    .default({
      declIdentificacao: false,
      declConstituicao: false,
      declAdimplencia: false,
      declParentesco: false,
      declSancoes: false,
      declFichaLimpa: false,
      declResponsabilidade: false,
    }),

  // A assinatura NÃO entra por aqui: tem action própria, porque depende do hash
  // do conteúdo e da trilha (IP, agente, hora do servidor) — coisas que só o
  // servidor produz com honestidade.
});

export type PlanoTrabalhoInput = z.input<typeof planoTrabalhoSchema>;

// Identificação de quem assina — Lei 14.063/2020, art. 4º, I.
export const assinaturaSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo de quem assina."),
  cpf: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11, "CPF incompleto."),
  cargo: z.string().trim().min(2, "Informe o cargo na entidade."),
  email: z.email("E-mail inválido."),
});

export type AssinaturaInput = z.input<typeof assinaturaSchema>;

export const parecerSchema = z.object({
  parecer: z.string().trim().min(1, "Informe o parecer."),
});

// ------------------------------------------------------------- Beneficiários
export const beneficiarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do beneficiário."),
  tipo: z.enum(valores(TipoBeneficiario)),
  cnpj: textoOpcional,
  observacao: textoOpcional,
});

export type BeneficiarioInput = z.input<typeof beneficiarioSchema>;

// ------------------------------------------------- Perfis de acesso (PROMPT 12)
export const PERMISSOES_PERFIL = [
  "apresentarEmendas",
  "gerirTodasEmendas",
  "tramitarEmendas",
  "gerirPlanejamento",
  "gerirExercicios",
  "administrarConfiguracoes",
  "analisarViabilidade",
  "registrarExecucao",
] as const;

export const perfilSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome do perfil."),
    descricao: z
      .string()
      .trim()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    poder: enumOpcional(Poder),
    apresentarEmendas: z.coerce.boolean().default(false),
    gerirTodasEmendas: z.coerce.boolean().default(false),
    tramitarEmendas: z.coerce.boolean().default(false),
    gerirPlanejamento: z.coerce.boolean().default(false),
    gerirExercicios: z.coerce.boolean().default(false),
    administrarConfiguracoes: z.coerce.boolean().default(false),
    analisarViabilidade: z.coerce.boolean().default(false),
    registrarExecucao: z.coerce.boolean().default(false),
  })
  // Perfil sem nenhuma permissão é perfil de CONSULTA e é legítimo — mas o
  // formulário exige uma marcação para que a consulta seja escolha explícita,
  // e não esquecimento de quem estava compondo o perfil.
  .refine((d) => PERMISSOES_PERFIL.some((p) => d[p]), {
    message: "Marque ao menos uma permissão.",
    path: ["apresentarEmendas"],
  });

export type PerfilInput = z.input<typeof perfilSchema>;

// Reatribuição de perfil na própria linha da tabela de usuários.
export const reatribuirPerfilSchema = z.object({
  usuarioId: z.string().trim().min(1),
  perfilId: z.string().trim().min(1, "Escolha um perfil."),
});

// ------------------------------- Viabilidade técnica e execução (Executivo)
export const parecerViabilidadeSchema = z.object({
  emendaId: z.string().trim().min(1),
  resultado: z.enum(valores(ResultadoViabilidade)),
  justificativa: z
    .string()
    .trim()
    .min(20, "Descreva a justificativa (ao menos 20 caracteres)."),
});

export const andamentoExecucaoSchema = z.object({
  emendaId: z.string().trim().min(1),
  etapa: z.enum(valores(EtapaExecucao)),
  data: z.coerce.date({ message: "Informe a data do lançamento." }),
  valor: z.coerce
    .number()
    .positive("O valor deve ser maior que zero."),
  numeroDocumento: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  observacao: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
