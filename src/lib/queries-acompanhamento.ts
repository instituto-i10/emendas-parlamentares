import "server-only";
import { prisma } from "./prisma";
import { safe } from "./queries";

// Resumo de tramitação: quantidade e valor por status no exercício.
export async function resumoTramitacao(ano: number | null) {
  if (!ano) return [];
  const rows = await safe(
    () =>
      prisma.emenda.groupBy({
        by: ["status"],
        where: { exercicio: { ano } },
        _count: { _all: true },
        _sum: { valor: true },
      }),
    [] as { status: string; _count: { _all: number }; _sum: { valor: unknown } }[]
  );
  return rows.map((r) => ({
    status: r.status,
    quantidade: r._count._all,
    total: Number(r._sum.valor ?? 0),
  }));
}

// Consumo do teto por autor (emendas válidas/submetidas/aprovadas).
export async function consumoTetoPorAutor(ano: number | null) {
  if (!ano) return { teto: null as number | null, autores: [] };
  const teto = await safe(
    () =>
      prisma.parametroValidacao.findFirst({
        where: {
          chave: "TETO_VALOR_AUTOR",
          OR: [{ exercicio: { ano } }, { escopo: "GERAL", exercicioId: null }],
        },
      }),
    null
  );
  const tetoNum = teto ? Number(teto.valor) : null;

  const rows = await safe(
    () =>
      prisma.emenda.groupBy({
        by: ["autorId"],
        where: { exercicio: { ano }, status: { in: ["VALIDA", "SUBMETIDA", "APROVADA"] } },
        _sum: { valor: true },
      }),
    [] as { autorId: string; _sum: { valor: unknown } }[]
  );
  const autores = await safe(
    () =>
      prisma.autor.findMany({
        where: { id: { in: rows.map((r) => r.autorId) } },
        select: { id: true, nome: true },
      }),
    [] as { id: string; nome: string }[]
  );
  const nome = new Map(autores.map((a) => [a.id, a.nome]));

  return {
    teto: tetoNum,
    autores: rows
      .map((r) => ({
        autorId: r.autorId,
        nome: nome.get(r.autorId) ?? "—",
        total: Number(r._sum.valor ?? 0),
      }))
      .sort((a, b) => b.total - a.total),
  };
}

// Leis aprovadas com PL de origem (candidatas a comparação).
export async function listarComparacoes(ano: number | null) {
  return safe(
    () =>
      prisma.instrumentoPlanejamento.findMany({
        where: {
          especie: "LEI_APROVADA",
          instrumentoOrigemId: { not: null },
          exercicio: ano ? { ano } : undefined,
        },
        select: {
          id: true,
          numero: true,
          instrumentoOrigem: { select: { id: true, numero: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    []
  );
}

// Relatório consolidado: emendas por programa (contagem, total, acatadas).
export async function emendasPorPrograma(ano: number | null) {
  if (!ano) return [];
  const rows = await safe(
    () =>
      prisma.emenda.findMany({
        where: { exercicio: { ano } },
        select: {
          valor: true,
          status: true,
          dotacao: { select: { programa: { select: { codigo: true, nome: true } } } },
        },
      }),
    []
  );
  const mapa = new Map<
    string,
    { programa: string; quantidade: number; total: number; acatadas: number }
  >();
  for (const e of rows) {
    const chave = `${e.dotacao.programa.codigo} — ${e.dotacao.programa.nome}`;
    const atual = mapa.get(chave) ?? { programa: chave, quantidade: 0, total: 0, acatadas: 0 };
    atual.quantidade += 1;
    atual.total += Number(e.valor);
    if (e.status === "APROVADA") atual.acatadas += Number(e.valor);
    mapa.set(chave, atual);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

async function somaInstrumento(instrumentoId: string) {
  const r = await safe(
    () =>
      prisma.dotacao.aggregate({
        _sum: { valorInicial: true, valorAtual: true },
        where: { instrumentoId },
      }),
    { _sum: { valorInicial: null, valorAtual: null } }
  );
  return {
    inicial: Number(r._sum.valorInicial ?? 0),
    atual: Number(r._sum.valorAtual ?? 0),
  };
}

// Comparativo PL × lei aprovada + emendas incorporadas (acatadas).
export async function compararPLxLei(leiId: string) {
  const lei = await safe(
    () =>
      prisma.instrumentoPlanejamento.findUnique({
        where: { id: leiId },
        select: { id: true, numero: true, instrumentoOrigemId: true },
      }),
    null
  );
  if (!lei || !lei.instrumentoOrigemId) return null;

  const [pl, totalPL, totalLei, emendas] = await Promise.all([
    safe(
      () =>
        prisma.instrumentoPlanejamento.findUnique({
          where: { id: lei.instrumentoOrigemId! },
          select: { id: true, numero: true },
        }),
      null
    ),
    somaInstrumento(lei.instrumentoOrigemId),
    somaInstrumento(lei.id),
    safe(
      () =>
        prisma.emenda.findMany({
          where: { instrumentoBaseId: lei.instrumentoOrigemId!, status: "APROVADA" },
          include: {
            autor: { select: { nome: true } },
            dotacao: { select: { programa: { select: { codigo: true, nome: true } } } },
          },
          orderBy: { numero: "asc" },
        }),
      []
    ),
  ]);

  return {
    lei,
    pl,
    totalPL,
    totalLei,
    emendasAcatadas: emendas.map((e) => ({
      id: e.id,
      numero: e.numero,
      autor: e.autor.nome,
      valor: Number(e.valor),
      programa: `${e.dotacao.programa.codigo} — ${e.dotacao.programa.nome}`,
    })),
  };
}

// ------------------------------- Viabilidade técnica e execução (PROMPT 12)

// Emendas já submetidas, com o parecer de viabilidade mais recente de cada uma.
export async function emendasParaViabilidade(ano: number | null) {
  if (ano == null) return [];
  return prisma.emenda.findMany({
    where: {
      exercicio: { ano },
      status: { in: ["SUBMETIDA", "EM_TRAMITACAO", "APROVADA", "REJEITADA"] },
    },
    select: {
      id: true,
      numero: true,
      objeto: true,
      valor: true,
      status: true,
      autor: { select: { nome: true } },
      pareceres: {
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: {
          id: true,
          resultado: true,
          justificativa: true,
          criadoEm: true,
          usuario: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { numero: "asc" },
  });
}

// Emendas aprovadas com os lançamentos de execução já registrados.
export async function emendasParaExecucao(ano: number | null) {
  if (ano == null) return [];
  return prisma.emenda.findMany({
    where: { exercicio: { ano }, status: "APROVADA" },
    select: {
      id: true,
      numero: true,
      objeto: true,
      valor: true,
      autor: { select: { nome: true } },
      beneficiario: { select: { nome: true } },
      andamentos: {
        orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
        select: {
          id: true,
          etapa: true,
          data: true,
          valor: true,
          numeroDocumento: true,
          observacao: true,
        },
      },
    },
    orderBy: { numero: "asc" },
  });
}
