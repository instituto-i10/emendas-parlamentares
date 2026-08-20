import { z } from "zod";
import {
  EscopoParametro,
  EspecieInstrumento,
  ModoValidacao,
  Poder,
  Role,
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
  poder: enumOpcional(Poder),
  role: z.enum(valores(Role)),
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

export const planoTrabalhoSchema = z.object({
  justificativa: z.string().trim().max(5000).default(""),
  objetivo: z.string().trim().max(5000).default(""),
  declaracaoAceita: z.coerce.boolean().default(false),
  itens: z
    .array(
      z.object({
        descricao: z.string().trim().max(300).default(""),
        quantidade: numeroPlanilha,
        valorUnitario: numeroPlanilha,
      })
    )
    .max(50, "No máximo 50 linhas na planilha.")
    .default([]),
});

export type PlanoTrabalhoInput = z.input<typeof planoTrabalhoSchema>;

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
