import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

// Helpers de ciclo vivem em ./ciclo (módulo puro): a topbar é client component
// e não pode importar deste arquivo, que é server-only.
export { anoElaboracao, rotuloCiclo, descricaoCiclo } from "./ciclo";

// ============================================================================
// Contexto de Exercício (ano orçamentário) que controla os dados de toda a app.
// O ano ativo é guardado em cookie; a lista vem do banco de forma resiliente
// (sem Neon ainda → estado vazio, sem quebrar a UI — PROMPT 2).
// ============================================================================

export const COOKIE_EXERCICIO = "exercicio-ativo";

export type ExercicioOpcao = {
  id: string;
  ano: number;
  status: string;
};

export async function listarExercicios(): Promise<ExercicioOpcao[]> {
  try {
    const rows = await prisma.exercicio.findMany({
      orderBy: { ano: "desc" },
      select: { id: true, ano: true, status: true },
    });
    return rows.map((r) => ({ id: r.id, ano: r.ano, status: r.status }));
  } catch {
    // Banco indisponível/não migrado: degrada para estado vazio.
    return [];
  }
}

// Ano ativo: cookie se válido; senão o exercício mais recente disponível.
export async function getAnoAtivo(
  exercicios?: ExercicioOpcao[]
): Promise<number | null> {
  const lista = exercicios ?? (await listarExercicios());
  const jar = await cookies();
  const cookieAno = Number(jar.get(COOKIE_EXERCICIO)?.value);
  if (cookieAno && lista.some((e) => e.ano === cookieAno)) return cookieAno;
  return lista[0]?.ano ?? null;
}
