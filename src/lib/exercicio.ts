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

// Ano ativo: cookie se válido; senão o padrão abaixo.
export async function getAnoAtivo(
  exercicios?: ExercicioOpcao[]
): Promise<number | null> {
  const lista = exercicios ?? (await listarExercicios());
  const jar = await cookies();
  const cookieAno = Number(jar.get(COOKIE_EXERCICIO)?.value);
  if (cookieAno && lista.some((e) => e.ano === cookieAno)) return cookieAno;
  return anoPadrao(lista);
}

/**
 * O exercício mais recente QUE TEM EMENDAS.
 *
 * Cair sempre no mais recente levava quem abre o sistema a uma tela vazia: no
 * começo de um ciclo o exercício-alvo existe — com sua LOA e suas dotações —
 * mas ainda não tem emenda nenhuma. O padrão útil é o último ciclo com
 * trabalho feito; o novo continua a um clique no seletor da topbar.
 */
async function anoPadrao(lista: ExercicioOpcao[]): Promise<number | null> {
  if (lista.length === 0) return null;
  try {
    const grupos = await prisma.emenda.groupBy({
      by: ["exercicioId"],
      _count: { _all: true },
    });
    const comEmendas = new Set(
      grupos.filter((g) => g._count._all > 0).map((g) => g.exercicioId)
    );
    // `lista` já vem ordenada por ano desc.
    return (lista.find((e) => comEmendas.has(e.id)) ?? lista[0]).ano;
  } catch {
    return lista[0].ano;
  }
}
