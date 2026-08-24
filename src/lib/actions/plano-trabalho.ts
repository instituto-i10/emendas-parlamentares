"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { podeGerirEmenda } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { planoTrabalhoSchema } from "@/lib/validation/schemas";
import type { CategoriaBeneficiario } from "@/lib/plano-trabalho";

export type PlanoResult =
  | { ok: true; message?: string; url?: string }
  | { ok: false; error: string };

// Validade do link enviado à entidade. Curto de propósito: é um endereço sem
// login, que dá acesso de escrita a uma peça do processo.
const DIAS_VALIDADE_LINK = 30;

function audUser(id: string) {
  return id === "dev-user" ? null : id;
}

async function emendaComPlano(emendaId: string) {
  return prisma.emenda.findUnique({
    where: { id: emendaId },
    select: {
      id: true,
      valor: true,
      status: true,
      autor: { select: { usuarioId: true } },
      beneficiario: { select: { tipo: true } },
      planoTrabalho: { select: { id: true, token: true } },
    },
  });
}

// Grava o plano. Sempre permissivo: o plano pode ser salvo pela metade, do
// mesmo jeito que o rascunho da emenda. Quem cobra o preenchimento é a
// pré-checagem, na hora da remessa.
async function gravar(
  emendaId: string,
  input: unknown,
  preenchidoPor: string
): Promise<PlanoResult> {
  const parsed = planoTrabalhoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const itens = d.itens
    .filter((i) => i.descricao.trim())
    .map((i, ordem) => ({
      ordem,
      descricao: i.descricao.trim(),
      quantidade: i.quantidade,
      valorUnitario: i.valorUnitario,
    }));

  try {
    // Os itens são substituídos em bloco: a planilha é editada como um todo na
    // tela, e casar linha a linha só criaria estados intermediários inválidos.
    await prisma.$transaction(async (tx) => {
      const plano = await tx.planoTrabalho.upsert({
        where: { emendaId },
        create: {
          emendaId,
          justificativa: d.justificativa,
          objetivo: d.objetivo,
          declaracaoAceita: d.declaracaoAceita,
          preenchidoPor,
          preenchidoEm: new Date(),
        },
        update: {
          justificativa: d.justificativa,
          objetivo: d.objetivo,
          declaracaoAceita: d.declaracaoAceita,
          preenchidoPor,
          preenchidoEm: new Date(),
        },
      });
      await tx.itemPlanoTrabalho.deleteMany({ where: { planoId: plano.id } });
      if (itens.length > 0) {
        await tx.itemPlanoTrabalho.createMany({
          data: itens.map((i) => ({ ...i, planoId: plano.id })),
        });
      }
    });
    return { ok: true, message: "Plano de trabalho salvo." };
  } catch {
    return { ok: false, error: "Não foi possível salvar o plano de trabalho." };
  }
}

// ---------------------------------------------------------------- pelo autor

export async function salvarPlanoTrabalho(
  emendaId: string,
  input: unknown
): Promise<PlanoResult> {
  const u = await getCurrentUser();
  const emenda = await emendaComPlano(emendaId);
  if (!emenda) return { ok: false, error: "Emenda não encontrada." };
  if (!podeGerirEmenda(u, { autorUsuarioId: emenda.autor.usuarioId }))
    return { ok: false, error: "Sem permissão para editar esta emenda." };

  const r = await gravar(emendaId, input, u.nome);
  if (r.ok) {
    await registrarAuditoria({
      usuarioId: audUser(u.id),
      entidade: "PlanoTrabalho",
      entidadeId: emendaId,
      acao: "SALVAR",
    });
    revalidatePath(`/legislativo/emendas/${emendaId}`);
  }
  return r;
}

// Gera (ou renova) o link que a entidade usa para preencher sem ter conta.
export async function gerarLinkEntidade(emendaId: string): Promise<PlanoResult> {
  const u = await getCurrentUser();
  const emenda = await emendaComPlano(emendaId);
  if (!emenda) return { ok: false, error: "Emenda não encontrada." };
  if (!podeGerirEmenda(u, { autorUsuarioId: emenda.autor.usuarioId }))
    return { ok: false, error: "Sem permissão para editar esta emenda." };

  if (!rateLimit(`link-plano:${u.id}`, 10, 60_000))
    return { ok: false, error: "Muitas tentativas. Aguarde um minuto." };

  // 32 bytes de entropia em base64url: o link é a única credencial da entidade.
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + DIAS_VALIDADE_LINK * 24 * 60 * 60 * 1000);

  try {
    await prisma.planoTrabalho.upsert({
      where: { emendaId },
      create: { emendaId, token, tokenExpiraEm: expira },
      update: { token, tokenExpiraEm: expira },
    });
    await registrarAuditoria({
      usuarioId: audUser(u.id),
      entidade: "PlanoTrabalho",
      entidadeId: emendaId,
      acao: "GERAR_LINK",
      dadosDepois: { expiraEm: expira.toISOString() },
    });
    revalidatePath(`/legislativo/emendas/${emendaId}`);
    return { ok: true, url: `/plano-trabalho/${token}`, message: "Link gerado." };
  } catch {
    return { ok: false, error: "Não foi possível gerar o link." };
  }
}

export async function revogarLinkEntidade(emendaId: string): Promise<PlanoResult> {
  const u = await getCurrentUser();
  const emenda = await emendaComPlano(emendaId);
  if (!emenda) return { ok: false, error: "Emenda não encontrada." };
  if (!podeGerirEmenda(u, { autorUsuarioId: emenda.autor.usuarioId }))
    return { ok: false, error: "Sem permissão." };
  if (!emenda.planoTrabalho?.token) return { ok: true, message: "Não havia link ativo." };

  await prisma.planoTrabalho.update({
    where: { emendaId },
    data: { token: null, tokenExpiraEm: null },
  });
  await registrarAuditoria({
    usuarioId: audUser(u.id),
    entidade: "PlanoTrabalho",
    entidadeId: emendaId,
    acao: "REVOGAR_LINK",
  });
  revalidatePath(`/legislativo/emendas/${emendaId}`);
  return { ok: true, message: "Link revogado." };
}

// -------------------------------------------------------------- pela entidade

export type PlanoPorToken = {
  emendaId: string;
  numero: string;
  objeto: string;
  justificativaEmenda: string;
  valor: number;
  autor: string;
  beneficiario: string | null;
  categoria: CategoriaBeneficiario | null;
  justificativa: string;
  objetivo: string;
  declaracaoAceita: boolean;
  itens: { descricao: string; quantidade: number; valorUnitario: number }[];
};

// Busca o plano pelo token. Retorna null para token inexistente OU expirado —
// de fora, os dois casos são o mesmo, e distingui-los só ajudaria quem estivesse
// sondando tokens.
export async function buscarPlanoPorToken(
  token: string
): Promise<PlanoPorToken | null> {
  if (!token || token.length < 20) return null;
  const plano = await prisma.planoTrabalho.findUnique({
    where: { token },
    include: {
      itens: { orderBy: { ordem: "asc" } },
      emenda: {
        select: {
          id: true,
          numero: true,
          objeto: true,
          justificativa: true,
          valor: true,
          status: true,
          autor: { select: { nome: true } },
          beneficiario: { select: { nome: true, tipo: true } },
        },
      },
    },
  });
  if (!plano || !plano.tokenExpiraEm || plano.tokenExpiraEm < new Date()) return null;
  // Depois de remetida, a emenda não é mais editável por ninguém — nem pela
  // entidade com link válido.
  if (plano.emenda.status !== "RASCUNHO" && plano.emenda.status !== "INVALIDA") return null;

  return {
    emendaId: plano.emenda.id,
    numero: plano.emenda.numero,
    objeto: plano.emenda.objeto,
    justificativaEmenda: plano.emenda.justificativa,
    valor: Number(plano.emenda.valor),
    autor: plano.emenda.autor.nome,
    beneficiario: plano.emenda.beneficiario?.nome ?? null,
    categoria: (plano.emenda.beneficiario?.tipo as CategoriaBeneficiario) ?? null,
    justificativa: plano.justificativa,
    objetivo: plano.objetivo,
    declaracaoAceita: plano.declaracaoAceita,
    itens: plano.itens.map((i) => ({
      descricao: i.descricao,
      quantidade: Number(i.quantidade),
      valorUnitario: Number(i.valorUnitario),
    })),
  };
}

export async function salvarPlanoPorToken(
  token: string,
  nomeResponsavel: string,
  input: unknown
): Promise<PlanoResult> {
  const alvo = await buscarPlanoPorToken(token);
  if (!alvo) return { ok: false, error: "Link inválido ou expirado. Peça um novo ao gabinete." };

  // O token é público: sem limite, ele vira um endpoint de escrita aberto.
  if (!rateLimit(`plano-token:${token}`, 20, 60_000))
    return { ok: false, error: "Muitas tentativas. Aguarde um minuto." };

  const nome = nomeResponsavel.trim().slice(0, 120);
  if (nome.length < 3) return { ok: false, error: "Informe o nome de quem está preenchendo." };

  const r = await gravar(alvo.emendaId, input, nome);
  if (r.ok) {
    await registrarAuditoria({
      usuarioId: null,
      entidade: "PlanoTrabalho",
      entidadeId: alvo.emendaId,
      acao: "SALVAR_PELA_ENTIDADE",
      dadosDepois: { preenchidoPor: nome },
    });
    revalidatePath(`/legislativo/emendas/${alvo.emendaId}`);
  }
  return r;
}
