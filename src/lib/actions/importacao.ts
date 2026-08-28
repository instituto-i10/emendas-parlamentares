"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { podeGerirPlanejamento } from "@/lib/authz";
import { importarBaseDeArquivo } from "@/lib/import/importar";
import { registrarAuditoria } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import type { ErroLinha } from "@/lib/import/tipos";

export type ImportState =
  | { ok: true; mensagem: string }
  | { ok: false; mensagem: string; erros?: ErroLinha[] }
  | null;

// Recebe a planilha por upload (processada em memória — sem storage) e gera a
// base de dotações vinculada ao instrumento. Restrito a EXEC_PLANEJAMENTO/ADMIN.
export async function importarBaseAction(
  instrumentoId: string,
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const user = await getCurrentUser();
  const permitido =
    podeGerirPlanejamento(user);
  if (!permitido) return { ok: false, mensagem: "Você não tem permissão para gerar a base." };
  if (!rateLimit(`importar:${user.id}`, 10, 60_000))
    return { ok: false, mensagem: "Muitas importações em pouco tempo. Aguarde um instante." };

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, mensagem: "Selecione um arquivo CSV ou XLSX." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const res = await importarBaseDeArquivo(instrumentoId, buffer);
    if (!res.ok) {
      return {
        ok: false,
        mensagem: "Importação rejeitada. Corrija os erros e tente novamente.",
        erros: res.erros.slice(0, 50),
      };
    }
    await registrarAuditoria({
      usuarioId: user.id === "dev-user" ? null : user.id,
      entidade: "InstrumentoPlanejamento",
      entidadeId: instrumentoId,
      acao: "GERAR_BASE",
      dadosDepois: res.resumo,
    });
    revalidatePath("/config");
    return {
      ok: true,
      mensagem: `Base gerada: ${res.resumo.dotacoes} dotações, ${res.resumo.programas} programas, ${res.resumo.acoes} ações.`,
    };
  } catch (e) {
    console.error(e);
    return { ok: false, mensagem: "Falha ao processar o arquivo." };
  }
}
