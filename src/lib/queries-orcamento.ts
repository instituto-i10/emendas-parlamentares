import "server-only";
import { prisma } from "./prisma";
import { safe } from "./queries";
import { elegivel, type Finalidade } from "./finalidade";

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
  /** "50" = transferência a instituição privada sem fins lucrativos. */
  naturezaModalidade: string;
  /** "51" = obras · "52" = equipamentos · "43" = subvenções… */
  naturezaElemento: string;
  fonteCodigo: string;
  fonteNome: string;
  /** Id do órgão — o filtro de órgão da lista elegível trabalha por id. */
  orgaoId: string;
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
  /** PROJETO · ATIVIDADE · OPERACAO_ESPECIAL — entra na regra do discricionário. */
  acaoTipo: string;
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
            select: {
              codigo: true,
              elemento: true,
              nome: true,
              grupo: true,
              modalidadeAplicacao: true,
            },
          },
          fonteRecurso: { select: { codigo: true, nome: true } },
          orgao: { select: { codigo: true, nome: true } },
          unidadeOrcamentaria: { select: { codigo: true, nome: true } },
          funcao: { select: { codigo: true, nome: true } },
          subfuncao: { select: { codigo: true, nome: true } },
          programa: { select: { codigo: true, nome: true } },
          acao: { select: { codigo: true, nome: true, tipo: true } },
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
    // Modalidade e elemento vão para a tela porque é deles que sai o MODELO do
    // plano de trabalho — ver `derivarModeloPlano`. Sem eles, o bloco 3 não
    // saberia qual formulário mostrar.
    naturezaModalidade: d.naturezaDespesa.modalidadeAplicacao,
    naturezaElemento: d.naturezaDespesa.elemento,
    fonteCodigo: d.fonteRecurso.codigo,
    fonteNome: d.fonteRecurso.nome,
    orgaoId: d.orgaoId,
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
    acaoTipo: d.acao.tipo,
  }));
}

// ============================================================================
// DOTAÇÕES ELEGÍVEIS — a lista já filtrada por quem recebe e para que serve.
//
// A cascata de cinco níveis saiu do caminho: em vez de o vereador montar a
// classificação orçamentária e descobrir na análise que a combinação não existe,
// o sistema lista só o que aceita as duas escolhas que ele já fez. A regra é
// pura e mora em lib/finalidade.ts; aqui só se aplica sobre a base.
//
// O filtro roda em JavaScript, não em SQL, por dois motivos: a natureza precisa
// ser lida por partes (com tolerância a zero à esquerda) e a busca por texto
// precisa ignorar acento — "saude" tem de achar "Saúde". Uma LOA municipal tem
// alguns milhares de dotações; é uma consulta só, e o que volta para o
// navegador é a página, não a base.
// ============================================================================

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export type ResultadoElegiveis = {
  /** A página de resultados — no máximo `limite` linhas. */
  dotacoes: DotacaoOpcao[];
  /** Quantas atendem à combinação, antes do corte da página. */
  total: number;
  /** Quantas a combinação deixou de fora, com o motivo agrupado. */
  excluidas: number;
  motivos: { motivo: string; qtd: number }[];
  /** Só os órgãos que têm dotação elegível — o filtro não oferece beco sem saída. */
  orgaos: { id: string; codigo: string; nome: string; qtd: number }[];
};

// Doze linhas cabem numa tela sem rolagem. A lista não é para ser percorrida
// inteira: ela é a prova de que o filtro funcionou, e quem procura uma dotação
// específica chega nela pela busca, não descendo a página.
const LIMITE_PAGINA = 12;

export async function listarDotacoesElegiveis(filtros: {
  instrumentoId: string;
  tipoBeneficiario: string;
  finalidade: Finalidade | null;
  orgaoId?: string;
  busca?: string;
  limite?: number;
}): Promise<ResultadoElegiveis> {
  const todas = await listarDotacoesBase({ instrumentoId: filtros.instrumentoId });

  const motivos = new Map<string, number>();
  const elegiveis: DotacaoOpcao[] = [];

  for (const d of todas) {
    const r = elegivel(
      {
        grupo: d.naturezaGrupo,
        modalidadeAplicacao: d.naturezaModalidade,
        elemento: d.naturezaElemento,
        tipoAcao: d.acaoTipo,
      },
      filtros.tipoBeneficiario,
      filtros.finalidade
    );
    if (r.ok) elegiveis.push(d);
    else motivos.set(r.motivo, (motivos.get(r.motivo) ?? 0) + 1);
  }

  // Os órgãos saem da lista elegível INTEIRA, não da página: o filtro precisa
  // enxergar o que existe além das quarenta primeiras linhas.
  const porOrgao = new Map<string, { id: string; codigo: string; nome: string; qtd: number }>();
  for (const d of elegiveis) {
    const atual = porOrgao.get(d.orgaoId);
    if (atual) atual.qtd += 1;
    else
      porOrgao.set(d.orgaoId, {
        id: d.orgaoId,
        codigo: d.orgaoCodigo,
        nome: d.orgaoNome,
        qtd: 1,
      });
  }

  const busca = normalizar(filtros.busca ?? "");
  const termos = busca ? busca.split(/\s+/) : [];
  const achados = elegiveis.filter((d) => {
    if (filtros.orgaoId && d.orgaoId !== filtros.orgaoId) return false;
    if (termos.length === 0) return true;
    const alvo = normalizar(
      [d.orgaoNome, d.unidadeNome, d.programaNome, d.acaoNome, d.naturezaNome, d.funcaoNome]
        .join(" ")
    );
    return termos.every((t) => alvo.includes(t));
  });

  // Maior saldo primeiro: com saldo curto a emenda nasce condenada ao
  // remanejamento, e essa é a informação que decide a escolha.
  achados.sort((a, b) => b.valorAtual - a.valorAtual);

  return {
    dotacoes: achados.slice(0, filtros.limite ?? LIMITE_PAGINA),
    total: achados.length,
    excluidas: todas.length - elegiveis.length,
    motivos: [...motivos.entries()]
      .map(([motivo, qtd]) => ({ motivo, qtd }))
      .sort((a, b) => b.qtd - a.qtd),
    orgaos: [...porOrgao.values()].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR")),
  };
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
