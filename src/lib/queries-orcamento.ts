import "server-only";
import { prisma } from "./prisma";
import { safe } from "./queries";

// ============================================================================
// Cascata de seleção assistida (sempre restrita ao instrumento base). Nenhum
// valor é digitado — tudo vem da base do instrumento.
// ============================================================================

export async function listarOrgaosBase(instrumentoId: string) {
  return safe(
    () =>
      prisma.orgao.findMany({
        where: { dotacoes: { some: { instrumentoId } } },
        select: { id: true, codigo: true, nome: true },
        orderBy: { codigo: "asc" },
      }),
    []
  );
}

export async function listarUnidadesBase(instrumentoId: string, orgaoId: string) {
  return safe(
    () =>
      prisma.unidadeOrcamentaria.findMany({
        where: { orgaoId, dotacoes: { some: { instrumentoId } } },
        select: { id: true, codigo: true, nome: true },
        orderBy: { codigo: "asc" },
      }),
    []
  );
}

export async function listarProgramasBase(
  instrumentoId: string,
  filtros: { orgaoId?: string; unidadeId?: string } = {}
) {
  return safe(
    () =>
      prisma.programa.findMany({
        where: {
          dotacoes: {
            some: {
              instrumentoId,
              orgaoId: filtros.orgaoId,
              unidadeOrcamentariaId: filtros.unidadeId,
            },
          },
        },
        select: { id: true, codigo: true, nome: true },
        orderBy: { codigo: "asc" },
      }),
    []
  );
}

export async function listarAcoesBase(
  instrumentoId: string,
  programaId: string,
  filtros: { orgaoId?: string; unidadeId?: string } = {}
) {
  return safe(
    () =>
      prisma.acao.findMany({
        where: {
          programaId,
          dotacoes: {
            some: {
              instrumentoId,
              programaId,
              orgaoId: filtros.orgaoId,
              unidadeOrcamentariaId: filtros.unidadeId,
            },
          },
        },
        select: { id: true, codigo: true, nome: true, tipo: true },
        orderBy: { codigo: "asc" },
      }),
    []
  );
}

// A dotação apresentada ao vereador precisa dizer O QUE É, não só o código.
// Por isso a opção carrega a classificação inteira por extenso — órgão,
// unidade, função, subfunção, programa, ação, natureza e fonte.
export type DotacaoOpcao = {
  id: string;
  valorAtual: number;
  naturezaCodigo: string;
  /** Nome por extenso do elemento; cai no código quando a base não o traz. */
  naturezaNome: string;
  /** Grupo da natureza ("1" = pessoal e encargos — vedado à parcela da saúde). */
  naturezaGrupo: string;
  fonteCodigo: string;
  fonteNome: string;
  orgaoCodigo: string;
  orgaoNome: string;
  unidadeCodigo: string;
  unidadeNome: string;
  funcaoCodigo: string;
  funcaoNome: string;
  subfuncaoCodigo: string;
  subfuncaoNome: string;
  programaCodigo: string;
  programaNome: string;
  acaoCodigo: string;
  acaoNome: string;
};

export async function listarDotacoesBase(filtros: {
  instrumentoId: string;
  orgaoId?: string;
  unidadeId?: string;
  programaId?: string;
  acaoId?: string;
}): Promise<DotacaoOpcao[]> {
  const rows = await safe(
    () =>
      prisma.dotacao.findMany({
        where: {
          instrumentoId: filtros.instrumentoId,
          orgaoId: filtros.orgaoId,
          unidadeOrcamentariaId: filtros.unidadeId,
          programaId: filtros.programaId,
          acaoId: filtros.acaoId,
        },
        include: {
          naturezaDespesa: {
            select: { codigo: true, elemento: true, nome: true, grupo: true },
          },
          fonteRecurso: { select: { codigo: true, nome: true } },
          orgao: { select: { codigo: true, nome: true } },
          unidadeOrcamentaria: { select: { codigo: true, nome: true } },
          funcao: { select: { codigo: true, nome: true } },
          subfuncao: { select: { codigo: true, nome: true } },
          programa: { select: { codigo: true, nome: true } },
          acao: { select: { codigo: true, nome: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    []
  );
  return rows.map((d) => ({
    id: d.id,
    valorAtual: Number(d.valorAtual),
    naturezaCodigo: d.naturezaDespesa.codigo,
    // Bases antigas (e importações de códigos fora da tabela) não têm o nome:
    // melhor repetir o código do que mostrar campo vazio.
    naturezaNome: d.naturezaDespesa.nome ?? d.naturezaDespesa.elemento,
    naturezaGrupo: d.naturezaDespesa.grupo,
    fonteCodigo: d.fonteRecurso.codigo,
    fonteNome: d.fonteRecurso.nome,
    orgaoCodigo: d.orgao.codigo,
    orgaoNome: d.orgao.nome,
    unidadeCodigo: d.unidadeOrcamentaria.codigo,
    unidadeNome: d.unidadeOrcamentaria.nome,
    funcaoCodigo: d.funcao.codigo,
    funcaoNome: d.funcao.nome,
    subfuncaoCodigo: d.subfuncao.codigo,
    subfuncaoNome: d.subfuncao.nome,
    programaCodigo: d.programa.codigo,
    programaNome: d.programa.nome,
    acaoCodigo: d.acao.codigo,
    acaoNome: d.acao.nome,
  }));
}

// PROJETO_LEI aberto para emendas no exercício (status EM_TRAMITACAO).
export async function getInstrumentoBaseAberto(exercicioAno: number | null) {
  if (!exercicioAno) return null;
  return safe(
    () =>
      prisma.instrumentoPlanejamento.findFirst({
        where: {
          especie: "PROJETO_LEI",
          status: "EM_TRAMITACAO",
          exercicio: { ano: exercicioAno },
        },
        select: {
          id: true,
          numero: true,
          tipo: true,
          exercicioId: true,
          exercicio: { select: { ano: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    null
  );
}

// ============================================================================
// Emendas — listagem e detalhe (Decimal → number).
// ============================================================================

export async function listarEmendas(filtros: {
  exercicioAno?: number | null;
  autorUsuarioId?: string;
  status?: string;
}) {
  const rows = await safe(
    () =>
      prisma.emenda.findMany({
        where: {
          exercicio: filtros.exercicioAno ? { ano: filtros.exercicioAno } : undefined,
          autor: filtros.autorUsuarioId ? { usuarioId: filtros.autorUsuarioId } : undefined,
          status: filtros.status as never,
        },
        include: {
          autor: { select: { nome: true } },
          dotacao: {
            select: {
              programa: { select: { codigo: true, nome: true } },
              acao: { select: { codigo: true, nome: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    []
  );
  return rows.map((e) => ({
    id: e.id,
    numero: e.numero,
    tipo: e.tipo,
    status: e.status,
    valor: Number(e.valor),
    objeto: e.objeto,
    autor: e.autor.nome,
    programa: `${e.dotacao.programa.codigo} — ${e.dotacao.programa.nome}`,
    acao: `${e.dotacao.acao.codigo} — ${e.dotacao.acao.nome}`,
  }));
}

// Emenda completa (classificação por extenso + última validação) para PDF/detalhe.
export async function getEmendaCompleta(id: string) {
  return safe(
    () =>
      prisma.emenda.findUnique({
        where: { id },
        include: {
          autor: { select: { nome: true, cargo: true } },
          exercicio: { select: { ano: true } },
          instrumentoBase: { select: { numero: true, tipo: true } },
          dotacao: {
            include: {
              orgao: true,
              unidadeOrcamentaria: true,
              funcao: true,
              subfuncao: true,
              programa: true,
              acao: true,
              naturezaDespesa: true,
              fonteRecurso: true,
            },
          },
          validacoes: { orderBy: { executadaEm: "desc" }, take: 1 },
        },
      }),
    null
  );
}

export async function getEmendaDetalhe(id: string) {
  return safe(
    () =>
      prisma.emenda.findUnique({
        where: { id },
        include: {
          autor: { select: { nome: true, usuarioId: true } },
          validacoes: { orderBy: { executadaEm: "desc" }, take: 1 },
        },
      }),
    null
  );
}
