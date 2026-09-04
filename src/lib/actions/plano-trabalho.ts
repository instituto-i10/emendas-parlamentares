"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { podeGerirEmenda } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { assinaturaSchema, planoTrabalhoSchema } from "@/lib/validation/schemas";
import { headers } from "next/headers";
import { hashDoPlano } from "@/lib/assinatura";
import { planoDoBanco } from "@/lib/plano-db";
import { derivarModeloPlano, type ModeloPlano } from "@/lib/plano-modelo";
import { DECLARACOES, type DadosPlano } from "@/lib/plano-trabalho";

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
      // A natureza da despesa entra porque é dela que sai o modelo do plano.
      dotacao: {
        select: {
          naturezaDespesa: {
            select: { grupo: true, modalidadeAplicacao: true, elemento: true },
          },
        },
      },
      planoTrabalho: { select: { id: true, token: true } },
    },
  });
}

// O modelo é derivado no SERVIDOR e gravado junto: o cliente pode mandar o
// que quiser, e é a dotação no banco que manda.
function modeloDaEmenda(emenda: {
  beneficiario: { tipo: string } | null;
  dotacao: {
    naturezaDespesa: {
      grupo: string;
      modalidadeAplicacao: string;
      elemento: string;
    } | null;
  } | null;
}): ModeloPlano | null {
  return derivarModeloPlano(
    emenda.dotacao?.naturezaDespesa ?? null,
    emenda.beneficiario?.tipo ?? null
  );
}

// Grava o plano. Sempre permissivo: o plano pode ser salvo pela metade, do
// mesmo jeito que o rascunho da emenda. Quem cobra o preenchimento é a
// pré-checagem, na hora da remessa.
//
// As três listas são substituídas EM BLOCO: são editadas como um todo na tela,
// e casar linha a linha só criaria estados intermediários inválidos.
async function gravar(
  emendaId: string,
  input: unknown,
  preenchidoPor: string,
  modelo: ModeloPlano | null
): Promise<PlanoResult> {
  const parsed = planoTrabalhoSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const metas = d.metas
    .filter((m) => m.beneficiarios.trim())
    .map((m, ordem) => ({ ordem, ...m }));
  const itens = d.itens
    .filter((i) => i.beneficiarios.trim())
    .map((i, ordem) => ({ ordem, ...i }));
  const parcelas = d.parcelas
    .filter((p) => p.valor > 0)
    .map((p, ordem) => ({ ordem, valor: p.valor }));

  // Fora do terceiro setor nada disto se aplica; gravar em branco evita que um
  // cliente malicioso plante uma entidade numa emenda de obra.
  const terceiroSetor = modelo === "TERCEIRO_SETOR";
  const doTerceiroSetor = terceiroSetor
    ? {
        entidadeRazaoSocial: d.entidadeRazaoSocial,
        entidadeCnpj: d.entidadeCnpj.replace(/\D/g, ""),
        entidadeAnos: d.entidadeAnos,
        orgaoRepassador: d.orgaoRepassador,
        ...d.declaracoes,
      }
    : {
        entidadeRazaoSocial: null,
        entidadeCnpj: null,
        entidadeAnos: null,
        orgaoRepassador: null,
        ...Object.fromEntries(DECLARACOES.map((k) => [k, false])),
      };

  try {
    await prisma.$transaction(async (tx) => {
      const plano = await tx.planoTrabalho.upsert({
        where: { emendaId },
        create: {
          emendaId,
          modelo,
          preenchidoPor,
          preenchidoEm: new Date(),
          ...doTerceiroSetor,
        },
        update: {
          modelo,
          preenchidoPor,
          preenchidoEm: new Date(),
          ...doTerceiroSetor,
          // Editar o plano derruba a assinatura: ela vale para o conteúdo que
          // foi assinado, não para o próximo. Manter seria dizer que a entidade
          // assinou o que ela não viu.
          assinanteNome: null,
          assinanteCpf: null,
          assinanteCargo: null,
          assinanteEmail: null,
          assinadoEm: null,
          assinaturaIp: null,
          assinaturaAgente: null,
          assinaturaHash: null,
        },
      });

      await tx.metaPlanoTrabalho.deleteMany({ where: { planoId: plano.id } });
      await tx.itemPlanoTrabalho.deleteMany({ where: { planoId: plano.id } });
      await tx.parcelaPlanoTrabalho.deleteMany({ where: { planoId: plano.id } });

      if (metas.length > 0)
        await tx.metaPlanoTrabalho.createMany({
          data: metas.map((m) => ({ ...m, planoId: plano.id })),
        });
      if (itens.length > 0)
        await tx.itemPlanoTrabalho.createMany({
          data: itens.map((i) => ({ ...i, planoId: plano.id })),
        });
      if (parcelas.length > 0)
        await tx.parcelaPlanoTrabalho.createMany({
          data: parcelas.map((p) => ({ ...p, planoId: plano.id })),
        });
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

  const r = await gravar(emendaId, input, u.nome, modeloDaEmenda(emenda));
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
  /** O que a entidade já preencheu, no formato das regras puras. */
  dados: DadosPlano;
  /** Quando e por quem, se já houve assinatura. */
  assinadoEm: string | null;
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
      metas: { orderBy: { ordem: "asc" } },
      itens: { orderBy: { ordem: "asc" } },
      parcelas: { orderBy: { ordem: "asc" } },
      emenda: {
        select: {
          id: true,
          numero: true,
          objeto: true,
          justificativa: true,
          valor: true,
          status: true,
          autor: { select: { nome: true } },
          beneficiario: { select: { nome: true } },
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
    dados: planoDoBanco(plano)!,
    assinadoEm: plano.assinadoEm?.toISOString() ?? null,
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

  // O link só existe no Modelo III — mas o modelo é reconferido no banco, e não
  // deduzido do fato de haver token: trocar a dotação depois de gerar o link
  // deixaria os dois em desacordo.
  const emenda = await emendaComPlano(alvo.emendaId);
  if (!emenda) return { ok: false, error: "Emenda não encontrada." };

  const r = await gravar(alvo.emendaId, input, nome, modeloDaEmenda(emenda));
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

// ------------------------------------------------------------- assinatura ---

/**
 * Assinatura eletrônica simples do representante legal — Lei 14.063/2020,
 * art. 4º, I.
 *
 * Só o servidor pode assinar com honestidade: o hash é calculado sobre o que
 * ESTÁ NO BANCO (não sobre o que o cliente mandou junto), e a trilha usa a hora
 * do servidor e o IP do request. Aceitar qualquer um dos dois do navegador
 * tornaria o comprovante uma declaração do próprio signatário sobre si mesmo.
 */
export async function assinarPlanoPorToken(
  token: string,
  input: unknown
): Promise<PlanoResult> {
  const alvo = await buscarPlanoPorToken(token);
  if (!alvo) return { ok: false, error: "Link inválido ou expirado. Peça um novo ao gabinete." };

  if (!rateLimit(`assinar-plano:${token}`, 10, 60_000))
    return { ok: false, error: "Muitas tentativas. Aguarde um minuto." };

  const parsed = assinaturaSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const a = parsed.data;

  const emenda = await emendaComPlano(alvo.emendaId);
  if (!emenda) return { ok: false, error: "Emenda não encontrada." };
  if (modeloDaEmenda(emenda) !== "TERCEIRO_SETOR")
    return { ok: false, error: "Esta emenda não exige assinatura da entidade." };

  const cabecalhos = await headers();
  // `x-forwarded-for` é o que o proxy da Vercel entrega; o primeiro da lista é
  // o cliente. Sem proxy não há IP algum, e gravar null é mais honesto do que
  // gravar o do servidor.
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    await prisma.planoTrabalho.update({
      where: { emendaId: alvo.emendaId },
      data: {
        assinanteNome: a.nome,
        assinanteCpf: a.cpf,
        assinanteCargo: a.cargo,
        assinanteEmail: a.email,
        assinadoEm: new Date(),
        assinaturaIp: ip,
        assinaturaAgente: cabecalhos.get("user-agent")?.slice(0, 300) ?? null,
        assinaturaHash: hashDoPlano(alvo.dados, alvo.valor),
      },
    });
    await registrarAuditoria({
      usuarioId: null,
      entidade: "PlanoTrabalho",
      entidadeId: alvo.emendaId,
      acao: "ASSINAR_PELA_ENTIDADE",
      dadosDepois: { assinante: a.nome, cargo: a.cargo },
    });
    revalidatePath(`/legislativo/emendas/${alvo.emendaId}`);
    return { ok: true, message: "Plano assinado e enviado à Câmara." };
  } catch {
    return { ok: false, error: "Não foi possível registrar a assinatura." };
  }
}
