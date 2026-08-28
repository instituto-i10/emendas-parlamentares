"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { podeGerirPlanejamento } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/audit";

type R = { ok: true } | { ok: false; error: string };

const STATUS_VALIDOS = new Set([
  "EM_ELABORACAO",
  "ENVIADO",
  "EM_TRAMITACAO",
  "APROVADO",
  "SANCIONADO",
  "VIGENTE",
  "ENCERRADO",
]);

async function gate() {
  const u = await getCurrentUser();
  const ok =
    podeGerirPlanejamento(u);
  return { ok, u };
}

// Conduz o ciclo de vida do instrumento (EM_TRAMITACAO → … → VIGENTE) e a
// abertura para emendas.
export async function definirStatusInstrumento(
  id: string,
  status: string
): Promise<R> {
  const { ok, u } = await gate();
  if (!ok) return { ok: false, error: "Sem permissão." };
  if (!STATUS_VALIDOS.has(status)) return { ok: false, error: "Status inválido." };
  try {
    await prisma.instrumentoPlanejamento.update({
      where: { id },
      data: { status: status as never },
    });
    await registrarAuditoria({
      usuarioId: u.id === "dev-user" ? null : u.id,
      entidade: "InstrumentoPlanejamento",
      entidadeId: id,
      acao: "STATUS",
      dadosDepois: { status },
    });
    revalidatePath("/executivo/planejamento");
    revalidatePath("/config");
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível atualizar o instrumento." };
  }
}
