"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { registrarAuditoria } from "@/lib/audit";
import { beneficiarioSchema } from "@/lib/validation/schemas";
import { categoriaPeloNome } from "@/lib/beneficiarios-classificacao";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const PAPEIS_GESTAO: Role[] = [Role.LEG_ADMIN, Role.LEG_TECNICO, Role.EXEC_ADMIN];

async function exigirGestao() {
  const user = await getCurrentUser();
  if (user.role !== Role.SUPER_ADMIN && !PAPEIS_GESTAO.includes(user.role)) {
    return { erro: "Você não tem permissão para esta ação." as const, user: null };
  }
  return { erro: null, user };
}

function audUser(id: string) {
  return id === "dev-user" ? null : id;
}

export async function criarBeneficiario(input: unknown): Promise<ActionResult> {
  const gate = await exigirGestao();
  if (gate.erro) return { ok: false, error: gate.erro };

  const parsed = beneficiarioSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const criado = await prisma.beneficiario.create({
      data: {
        nome: parsed.data.nome,
        tipo: parsed.data.tipo as never,
        cnpj: parsed.data.cnpj,
        observacao: parsed.data.observacao,
      },
    });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "Beneficiario",
      entidadeId: criado.id,
      acao: "CRIAR",
      dadosDepois: criado,
    });
    revalidatePath("/config");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível salvar (nome já cadastrado?)." };
  }
}

// Mescla `duplicadosIds` no beneficiário `canonicalId`: reaponta as emendas e
// remove as variantes. Idempotente e transacional por lote.
export async function mesclarBeneficiarios(
  canonicalId: string,
  duplicadosIds: string[]
): Promise<ActionResult> {
  const gate = await exigirGestao();
  if (gate.erro) return { ok: false, error: gate.erro };

  const ids = duplicadosIds.filter((id) => id && id !== canonicalId);
  if (ids.length === 0) return { ok: false, error: "Nada para mesclar." };

  try {
    const canonical = await prisma.beneficiario.findUnique({
      where: { id: canonicalId },
      select: { id: true, nome: true },
    });
    if (!canonical) return { ok: false, error: "Beneficiário de destino não encontrado." };

    const [reapontadas] = await prisma.$transaction([
      prisma.emenda.updateMany({
        where: { beneficiarioId: { in: ids } },
        data: { beneficiarioId: canonicalId },
      }),
      prisma.beneficiario.deleteMany({ where: { id: { in: ids } } }),
    ]);

    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "Beneficiario",
      entidadeId: canonicalId,
      acao: "MESCLAR",
      dadosDepois: {
        canonical: canonical.nome,
        removidos: ids.length,
        emendasReapontadas: reapontadas.count,
      },
    });
    revalidatePath("/config");
    revalidatePath("/emendas");
    return {
      ok: true,
      message: `${ids.length} variante(s) mesclada(s) em "${canonical.nome}"; ${reapontadas.count} emenda(s) reapontada(s).`,
    };
  } catch {
    return { ok: false, error: "Falha ao mesclar beneficiários." };
  }
}

export async function excluirBeneficiario(id: string): Promise<ActionResult> {
  const gate = await exigirGestao();
  if (gate.erro) return { ok: false, error: gate.erro };
  try {
    const antes = await prisma.beneficiario.delete({ where: { id } });
    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "Beneficiario",
      entidadeId: id,
      acao: "EXCLUIR",
      dadosAntes: antes,
    });
    revalidatePath("/config");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível excluir o beneficiário." };
  }
}

// Extrai o nome do beneficiário do objeto da emenda: o trecho antes do
// separador " - " ("SAAMA - Custeio" → "SAAMA"; sem separador, o objeto todo).
function nomeDoObjeto(objeto: string): string {
  const nome = objeto.split(/\s+[-–—]\s+/)[0]?.trim() ?? objeto.trim();
  return nome.replace(/\s+/g, " ");
}

// Deriva beneficiários a partir do objeto das emendas sem vínculo e vincula.
// Idempotente — roda quantas vezes for preciso; só toca emendas sem beneficiário.
export async function derivarBeneficiarios(): Promise<ActionResult> {
  const gate = await exigirGestao();
  if (gate.erro) return { ok: false, error: gate.erro };

  try {
    const soltas = await prisma.emenda.findMany({
      where: { beneficiarioId: null },
      select: { id: true, objeto: true },
    });
    if (soltas.length === 0)
      return { ok: true, message: "Todas as emendas já têm beneficiário." };

    // Agrupa por nome extraído e garante os cadastros.
    const porNome = new Map<string, string[]>();
    for (const e of soltas) {
      const nome = nomeDoObjeto(e.objeto);
      if (!nome) continue;
      porNome.set(nome, [...(porNome.get(nome) ?? []), e.id]);
    }

    const existentes = await prisma.beneficiario.findMany({
      where: { nome: { in: [...porNome.keys()] } },
      select: { id: true, nome: true },
    });
    const idPorNome = new Map(existentes.map((b) => [b.nome, b.id]));

    const novos = [...porNome.keys()].filter((n) => !idPorNome.has(n));
    // Lotes paralelos — banco remoto, evita estourar o tempo da action.
    const LOTE = 15;
    for (let i = 0; i < novos.length; i += LOTE) {
      const criados = await Promise.all(
        novos.slice(i, i + LOTE).map((nome) =>
          prisma.beneficiario.create({
            data: { nome, tipo: categoriaPeloNome(nome) as never },
          })
        )
      );
      for (const b of criados) idPorNome.set(b.nome, b.id);
    }

    let vinculadas = 0;
    const vinculos = [...porNome.entries()];
    for (let i = 0; i < vinculos.length; i += LOTE) {
      const rs = await Promise.all(
        vinculos.slice(i, i + LOTE).map(([nome, ids]) =>
          prisma.emenda.updateMany({
            where: { id: { in: ids } },
            data: { beneficiarioId: idPorNome.get(nome)! },
          })
        )
      );
      for (const r of rs) vinculadas += r.count;
    }

    await registrarAuditoria({
      usuarioId: audUser(gate.user.id),
      entidade: "Beneficiario",
      entidadeId: "derivacao",
      acao: "DERIVAR_DOS_OBJETOS",
      dadosDepois: { criados: novos.length, vinculadas },
    });
    revalidatePath("/config");
    revalidatePath("/emendas");
    return {
      ok: true,
      message: `${novos.length} beneficiário(s) criado(s); ${vinculadas} emenda(s) vinculada(s).`,
    };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Falha ao derivar beneficiários." };
  }
}
