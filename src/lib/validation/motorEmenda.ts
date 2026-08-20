import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  avaliarEmenda,
  type ContextoEmenda,
  type DotacaoCtx,
  type ResultadoMotor,
} from "./motor";
import {
  pendenciasDoPlano,
  type CategoriaBeneficiario,
} from "@/lib/plano-trabalho";

export { avaliarEmenda } from "./motor";
export type { ResultadoMotor, ItemValidacao } from "./motor";

type DotacaoDb = {
  id: string;
  instrumentoId: string;
  exercicioId: string;
  orgaoId: string;
  unidadeOrcamentariaId: string;
  funcaoId: string;
  subfuncaoId: string;
  programaId: string;
  acaoId: string;
  naturezaDespesaId: string;
  fonteRecursoId: string;
  valorAtual: Prisma.Decimal;
  acao: { programaId: string } | null;
  naturezaDespesa: { grupo: string } | null;
};

function toCtx(d: DotacaoDb | null): DotacaoCtx | null {
  if (!d) return null;
  return {
    id: d.id,
    instrumentoId: d.instrumentoId,
    exercicioId: d.exercicioId,
    orgaoId: d.orgaoId,
    unidadeOrcamentariaId: d.unidadeOrcamentariaId,
    funcaoId: d.funcaoId,
    subfuncaoId: d.subfuncaoId,
    programaId: d.programaId,
    acaoId: d.acaoId,
    naturezaDespesaId: d.naturezaDespesaId,
    fonteRecursoId: d.fonteRecursoId,
    valorAtual: Number(d.valorAtual),
    acaoProgramaId: d.acao?.programaId ?? d.programaId,
    // Sem grupo não dá para aplicar a vedação do art. 140 §7º; "" não casa com
    // "1", então a checagem passa — e a dotação sem natureza já cai antes, em
    // CLASSIFICACAO_COMPLETA.
    naturezaGrupo: d.naturezaDespesa?.grupo ?? "",
  };
}

// Carrega o contexto da emenda, roda o motor, persiste ValidacaoEmenda e
// atualiza Emenda.status. Retorna o relatório item a item.
export async function validarEmenda(emendaId: string): Promise<ResultadoMotor> {
  const emenda = await prisma.emenda.findUnique({
    where: { id: emendaId },
    include: {
      exercicio: { select: { status: true } },
      instrumentoBase: { select: { status: true } },
      dotacao: {
        include: {
          acao: { select: { programaId: true } },
          funcao: { select: { codigo: true } },
          naturezaDespesa: { select: { grupo: true } },
        },
      },
      dotacaoOrigem: {
        include: {
          acao: { select: { programaId: true } },
          naturezaDespesa: { select: { grupo: true } },
        },
      },
      dotacaoDestino: {
        include: {
          acao: { select: { programaId: true } },
          naturezaDespesa: { select: { grupo: true } },
        },
      },
      beneficiario: { select: { tipo: true } },
      planoTrabalho: { include: { itens: true } },
    },
  });
  if (!emenda) throw new Error("Emenda não encontrada.");

  // PPA do exercício e seus programas.
  //
  // Vem da flag `Programa.constaNoPPA`, não de dotações: PPA não tem dotação —
  // tem programas, ações e metas plurianuais. Derivar de dotação fazia o
  // conjunto chegar sempre vazio, e a checagem reprovava toda emenda nova.
  const ppa = await prisma.instrumentoPlanejamento.findFirst({
    where: { exercicioId: emenda.exercicioId, tipo: "PPA" },
    select: { id: true },
  });
  const programasNoPPA = new Set<string>(
    ppa
      ? (
          await prisma.programa.findMany({
            where: { exercicioId: emenda.exercicioId, constaNoPPA: true },
            select: { id: true },
          })
        ).map((x) => x.id)
      : []
  );

  // Prioridades da LDO.
  const prioridades = await prisma.prioridadeLDO.findMany({
    where: { exercicioId: emenda.exercicioId },
    select: { programaId: true, acaoId: true },
  });
  const prioridadesPrograma = new Set(prioridades.map((p) => p.programaId));
  const prioridadesAcao = new Set(
    prioridades.filter((p) => p.acaoId).map((p) => p.acaoId as string)
  );

  // Parâmetros (o do exercício sobrepõe o GERAL).
  const params = await prisma.parametroValidacao.findMany({
    where: {
      chave: {
        in: [
          "TETO_VALOR_AUTOR",
          "ADERENCIA_LDO",
          "RESERVA_SAUDE_PERCENTUAL",
          "FUNCAO_SAUDE",
        ],
      },
      OR: [{ exercicioId: emenda.exercicioId }, { escopo: "GERAL", exercicioId: null }],
    },
  });
  const pick = (chave: string) =>
    params.find((p) => p.chave === chave && p.exercicioId === emenda.exercicioId) ??
    params.find((p) => p.chave === chave && p.escopo === "GERAL");

  const teto = pick("TETO_VALOR_AUTOR");
  const tetoNum = teto ? Number(teto.valor) : NaN;
  const tetoValorAutor = Number.isFinite(tetoNum) ? tetoNum : null;

  const ldo = pick("ADERENCIA_LDO");
  const modoAderenciaLDO =
    ldo?.modo === "BLOQUEANTE" ? "BLOQUEANTE" : ldo?.modo === "ALERTA" ? "ALERTA" : null;

  // Reserva da saúde: pct da cota reservado à saúde (limite p/ demais áreas).
  const reserva = pick("RESERVA_SAUDE_PERCENTUAL");
  const reservaNum = reserva ? Number(reserva.valor) : NaN;
  const reservaSaudePct = Number.isFinite(reservaNum) ? reservaNum : null;
  const modoReservaSaude =
    reservaSaudePct == null
      ? null
      : reserva?.modo === "BLOQUEANTE"
        ? "BLOQUEANTE"
        : "ALERTA";
  const funcaoSaudeCodigo = pick("FUNCAO_SAUDE")?.valor?.trim() || "10";
  const emendaEhSaude =
    (emenda.dotacao as { funcao?: { codigo: string } } | null)?.funcao
      ?.codigo === funcaoSaudeCodigo;

  // Soma das emendas VÁLIDAS/SUBMETIDAS do autor no exercício (exceto esta).
  const soma = await prisma.emenda.aggregate({
    _sum: { valor: true },
    where: {
      autorId: emenda.autorId,
      exercicioId: emenda.exercicioId,
      status: { in: ["VALIDA", "SUBMETIDA"] },
      id: { not: emendaId },
    },
  });
  const somaAutorExistente = soma._sum.valor ? Number(soma._sum.valor) : 0;

  // Idem, apenas das emendas FORA da saúde (consomem o limite das demais áreas).
  const somaDemais = await prisma.emenda.aggregate({
    _sum: { valor: true },
    where: {
      autorId: emenda.autorId,
      exercicioId: emenda.exercicioId,
      status: { in: ["VALIDA", "SUBMETIDA"] },
      id: { not: emendaId },
      dotacao: { funcao: { codigo: { not: funcaoSaudeCodigo } } },
    },
  });
  const somaAutorDemaisExistente = somaDemais._sum.valor
    ? Number(somaDemais._sum.valor)
    : 0;

  // Plano de trabalho simplificado: o que ele exige depende da categoria do
  // beneficiário final.
  const beneficiarioCategoria =
    (emenda.beneficiario?.tipo as CategoriaBeneficiario | undefined) ?? null;
  const plano = emenda.planoTrabalho;
  const pendenciasPlanoTrabalho = beneficiarioCategoria
    ? pendenciasDoPlano(
        plano
          ? {
              justificativa: plano.justificativa,
              objetivo: plano.objetivo,
              declaracaoAceita: plano.declaracaoAceita,
              itens: plano.itens.map((i) => ({
                descricao: i.descricao,
                quantidade: Number(i.quantidade),
                valorUnitario: Number(i.valorUnitario),
              })),
            }
          : null,
        beneficiarioCategoria,
        Number(emenda.valor)
      )
    : [];

  const ctx: ContextoEmenda = {
    emenda: {
      tipo: emenda.tipo,
      valor: Number(emenda.valor),
      exercicioId: emenda.exercicioId,
      instrumentoBaseId: emenda.instrumentoBaseId,
      autorId: emenda.autorId,
      objeto: emenda.objeto,
      justificativa: emenda.justificativa,
    },
    exercicioStatus: emenda.exercicio.status,
    instrumentoBaseStatus: emenda.instrumentoBase.status,
    dotacao: toCtx(emenda.dotacao as DotacaoDb | null),
    dotacaoOrigem: toCtx(emenda.dotacaoOrigem as DotacaoDb | null),
    dotacaoDestino: toCtx(emenda.dotacaoDestino as DotacaoDb | null),
    ppaCadastrado: !!ppa,
    programasNoPPA,
    prioridadesPrograma,
    prioridadesAcao,
    modoAderenciaLDO,
    tetoValorAutor,
    somaAutorExistente,
    reservaSaudePct,
    modoReservaSaude,
    emendaEhSaude,
    somaAutorDemaisExistente,
    beneficiarioCategoria,
    pendenciasPlanoTrabalho,
  };

  const resultado = avaliarEmenda(ctx);

  await prisma.$transaction([
    prisma.validacaoEmenda.create({
      data: {
        emendaId,
        resultado: resultado.resultado,
        itens: resultado.itens as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.emenda.update({
      where: { id: emendaId },
      data: { status: resultado.resultado },
    }),
  ]);

  return resultado;
}
