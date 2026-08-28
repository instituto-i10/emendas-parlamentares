"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { podeAnalisarViabilidade, podeRegistrarExecucao } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/audit";
import {
  andamentoExecucaoSchema,
  parecerViabilidadeSchema,
} from "@/lib/validation/schemas";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

function primeiraMensagem(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos.";
}

// Sessão de dev não é um User real — evita ruído de FK na auditoria.
function audUser(id: string): string | null {
  return id === "dev-user" ? null : id;
}

// Estados em que a emenda já saiu da mesa do gabinete e pode receber
// manifestação do Executivo. Antes da submissão a emenda ainda é rascunho do
// autor: opinar sobre ela seria interferir na elaboração.
const ABERTA_A_PARECER = new Set([
  "SUBMETIDA",
  "EM_TRAMITACAO",
  "APROVADA",
  "REJEITADA",
]);

// ==================================================== VIABILIDADE TÉCNICA
//
// O parecer é INFORMATIVO: registra a manifestação do Executivo sem alterar a
// emenda e sem travar a tramitação. Serve aos dois momentos do processo —
// subsídio à Comissão antes da votação e impedimento técnico depois de
// aprovada. O histórico fica: vale o mais recente, os anteriores permanecem.
export async function registrarParecerViabilidade(
  input: unknown
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!podeAnalisarViabilidade(user)) {
    return { ok: false, error: "Você não tem permissão para esta ação." };
  }

  const parsed = parecerViabilidadeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };
  const d = parsed.data;

  const emenda = await prisma.emenda.findUnique({
    where: { id: d.emendaId },
    select: { id: true, numero: true, status: true },
  });
  if (!emenda) return { ok: false, error: "Emenda não encontrada." };
  if (!ABERTA_A_PARECER.has(emenda.status)) {
    return {
      ok: false,
      error: "A emenda ainda não foi submetida: não cabe parecer nesta fase.",
    };
  }

  try {
    const criado = await prisma.parecerViabilidade.create({
      data: {
        emendaId: emenda.id,
        resultado: d.resultado as never,
        justificativa: d.justificativa,
        usuarioId: audUser(user.id),
      },
    });
    await registrarAuditoria({
      usuarioId: audUser(user.id),
      entidade: "ParecerViabilidade",
      entidadeId: criado.id,
      acao: "CRIAR",
      dadosDepois: {
        emenda: emenda.numero,
        resultado: d.resultado,
      },
    });
    revalidatePath("/executivo/acompanhamento/viabilidade");
    revalidatePath("/analise");
    return { ok: true, message: "Parecer registrado." };
  } catch {
    return { ok: false, error: "Não foi possível registrar o parecer." };
  }
}

// ================================================= EXECUÇÃO ORÇAMENTÁRIA
//
// Uma linha por etapa da despesa. Lançamento manual nesta versão; os campos
// seguem a Lei 4.320/1964 para que uma integração futura com o sistema
// financeiro do município substitua a digitação sem trocar o modelo.
export async function registrarAndamentoExecucao(
  input: unknown
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!podeRegistrarExecucao(user)) {
    return { ok: false, error: "Você não tem permissão para esta ação." };
  }

  const parsed = andamentoExecucaoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: primeiraMensagem(parsed.error) };
  const d = parsed.data;

  const emenda = await prisma.emenda.findUnique({
    where: { id: d.emendaId },
    select: { id: true, numero: true, status: true },
  });
  if (!emenda) return { ok: false, error: "Emenda não encontrada." };
  // Execução orçamentária pressupõe emenda acatada: o que não foi aprovado não
  // entra na lei e, portanto, não tem o que empenhar.
  if (emenda.status !== "APROVADA") {
    return {
      ok: false,
      error: "Só emendas aprovadas têm execução orçamentária a lançar.",
    };
  }

  try {
    const criado = await prisma.andamentoExecucao.create({
      data: {
        emendaId: emenda.id,
        etapa: d.etapa as never,
        data: d.data,
        valor: d.valor,
        numeroDocumento: d.numeroDocumento ?? null,
        observacao: d.observacao ?? null,
        usuarioId: audUser(user.id),
      },
    });
    await registrarAuditoria({
      usuarioId: audUser(user.id),
      entidade: "AndamentoExecucao",
      entidadeId: criado.id,
      acao: "CRIAR",
      dadosDepois: {
        emenda: emenda.numero,
        etapa: d.etapa,
        valor: d.valor,
        documento: d.numeroDocumento ?? null,
      },
    });
    revalidatePath("/executivo/acompanhamento/lancamentos");
    revalidatePath("/executivo/acompanhamento/execucao");
    return { ok: true, message: "Lançamento registrado." };
  } catch {
    return { ok: false, error: "Não foi possível registrar o lançamento." };
  }
}
