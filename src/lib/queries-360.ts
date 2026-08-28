import "server-only";
import { cache } from "react";
import { prisma } from "./prisma";
import { safe } from "./queries";

// ============================================================================
// Agregações das vistas "Emendas 360" (Painel, Emendas & Beneficiários,
// Vereador 360, Resumo Consolidado, Tramitação, Visão Pública).
//
// Convenções de dados reais:
//  - "Saúde" = dotações cuja Função tem o código do parâmetro FUNCAO_SAUDE
//    (padrão "10", classificação funcional federal).
//  - "Cota por vereador" = parâmetro TETO_VALOR_AUTOR (o mesmo do motor).
//  - Piso de saúde por autor = cota × RESERVA_SAUDE_PERCENTUAL (se definido).
//  - "Destino" da emenda = Órgão/Unidade Orçamentária da dotação.
//  - RCL e PERCENTUAL_IMPOSITIVO são parâmetros informativos opcionais.
// ============================================================================

export type Parametros360 = {
  cotaPorAutor: number | null;
  reservaSaudePct: number | null;
  rcl: number | null;
  percentualImpositivo: number | null;
  funcaoSaudeCodigo: string;
  // Nº de parlamentares do exercício (param NUMERO_AUTORES). Quando ausente,
  // cai na contagem de Autor cadastrados — que pode incluir contas demo.
  numeroAutores: number | null;
};

export type Emenda360 = {
  id: string;
  numero: string;
  valor: number;
  status: string;
  tipo: string;
  objeto: string;
  autorId: string;
  autorNome: string;
  funcaoCodigo: string;
  funcaoNome: string;
  orgaoNome: string;
  unidadeNome: string;
  beneficiarioNome: string | null;
  // Manifestação mais recente do Executivo sobre a viabilidade técnica, quando
  // houver. Informativa: acompanha a emenda, não altera o seu status.
  parecerExecutivo: { resultado: string; justificativa: string } | null;
};

export type AutorResumo = {
  autorId: string;
  nome: string;
  itens: number;
  itensSaude: number;
  valorSaude: number;
  valorDemais: number;
  valorTotal: number;
};

export type DestinoResumo = {
  nome: string;
  itens: number;
  valor: number;
  valorSaude: number;
};

export type StatusResumo = { status: string; qtd: number; valor: number };

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function getParametros360(ano: number | null): Promise<Parametros360> {
  const chaves = [
    "TETO_VALOR_AUTOR",
    "RESERVA_SAUDE_PERCENTUAL",
    "RCL",
    "PERCENTUAL_IMPOSITIVO",
    "FUNCAO_SAUDE",
    "NUMERO_AUTORES",
  ];
  const rows = await safe(
    () =>
      prisma.parametroValidacao.findMany({
        where: {
          chave: { in: chaves },
          OR: [
            ano ? { exercicio: { ano } } : { exercicioId: null },
            { escopo: "GERAL", exercicioId: null },
          ],
        },
        include: { exercicio: { select: { ano: true } } },
      }),
    []
  );
  // Prioriza o parâmetro do exercício; cai no GERAL.
  const pick = (chave: string) =>
    rows.find((p) => p.chave === chave && p.exercicio?.ano === ano) ??
    rows.find((p) => p.chave === chave && p.exercicioId === null);

  return {
    cotaPorAutor: num(pick("TETO_VALOR_AUTOR")?.valor),
    reservaSaudePct: num(pick("RESERVA_SAUDE_PERCENTUAL")?.valor),
    rcl: num(pick("RCL")?.valor),
    percentualImpositivo: num(pick("PERCENTUAL_IMPOSITIVO")?.valor),
    funcaoSaudeCodigo: pick("FUNCAO_SAUDE")?.valor?.trim() || "10",
    numeroAutores: num(pick("NUMERO_AUTORES")?.valor),
  };
}

export async function getEmendas360(ano: number | null): Promise<Emenda360[]> {
  if (!ano) return [];
  const rows = await safe(
    () =>
      prisma.emenda.findMany({
        where: { exercicio: { ano } },
        select: {
          id: true,
          numero: true,
          valor: true,
          status: true,
          tipo: true,
          objeto: true,
          autor: { select: { id: true, nome: true } },
          beneficiario: { select: { nome: true } },
          pareceres: {
            orderBy: { criadoEm: "desc" },
            take: 1,
            select: { resultado: true, justificativa: true },
          },
          dotacao: {
            select: {
              funcao: { select: { codigo: true, nome: true } },
              orgao: { select: { nome: true } },
              unidadeOrcamentaria: { select: { nome: true } },
            },
          },
        },
        orderBy: [{ autor: { nome: "asc" } }, { numero: "asc" }],
      }),
    []
  );
  return rows.map((e) => ({
    id: e.id,
    numero: e.numero,
    valor: Number(e.valor),
    status: e.status,
    tipo: e.tipo,
    objeto: e.objeto,
    autorId: e.autor.id,
    autorNome: e.autor.nome,
    funcaoCodigo: e.dotacao.funcao.codigo,
    funcaoNome: e.dotacao.funcao.nome,
    orgaoNome: e.dotacao.orgao.nome,
    unidadeNome: e.dotacao.unidadeOrcamentaria.nome,
    beneficiarioNome: e.beneficiario?.nome ?? null,
    parecerExecutivo: e.pareceres[0]
      ? {
          resultado: e.pareceres[0].resultado as string,
          justificativa: e.pareceres[0].justificativa,
        }
      : null,
  }));
}

export async function contarAutores(): Promise<number> {
  return safe(() => prisma.autor.count(), 0);
}

export async function listarAutores() {
  return safe(
    () =>
      prisma.autor.findMany({
        select: { id: true, nome: true, cargo: true, usuarioId: true },
        orderBy: { nome: "asc" },
      }),
    []
  );
}

// ------------------------------------------------------------- agregadores
// Funções puras sobre Emenda360[] — fáceis de testar e reusar entre vistas.

export const ehSaude = (e: Emenda360, p: Parametros360) =>
  e.funcaoCodigo === p.funcaoSaudeCodigo;

export function resumoPorAutor(
  emendas: Emenda360[],
  p: Parametros360
): AutorResumo[] {
  const mapa = new Map<string, AutorResumo>();
  for (const e of emendas) {
    const r =
      mapa.get(e.autorId) ??
      ({
        autorId: e.autorId,
        nome: e.autorNome,
        itens: 0,
        itensSaude: 0,
        valorSaude: 0,
        valorDemais: 0,
        valorTotal: 0,
      } satisfies AutorResumo);
    r.itens += 1;
    r.valorTotal += e.valor;
    if (ehSaude(e, p)) {
      r.itensSaude += 1;
      r.valorSaude += e.valor;
    } else {
      r.valorDemais += e.valor;
    }
    mapa.set(e.autorId, r);
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

// Destino: o beneficiário final quando vinculado (rastreabilidade P0);
// senão, o órgão/unidade da dotação como aproximação.
export function resumoPorDestino(
  emendas: Emenda360[],
  p: Parametros360,
  nivel: "beneficiario" | "orgao" | "unidade" = "beneficiario"
): DestinoResumo[] {
  const mapa = new Map<string, DestinoResumo>();
  for (const e of emendas) {
    const nome =
      nivel === "beneficiario"
        ? (e.beneficiarioNome ?? e.orgaoNome)
        : nivel === "orgao"
          ? e.orgaoNome
          : e.unidadeNome;
    const r = mapa.get(nome) ?? { nome, itens: 0, valor: 0, valorSaude: 0 };
    r.itens += 1;
    r.valor += e.valor;
    if (ehSaude(e, p)) r.valorSaude += e.valor;
    mapa.set(nome, r);
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

export function resumoPorStatus(emendas: Emenda360[]): StatusResumo[] {
  const mapa = new Map<string, StatusResumo>();
  for (const e of emendas) {
    const r = mapa.get(e.status) ?? { status: e.status, qtd: 0, valor: 0 };
    r.qtd += 1;
    r.valor += e.valor;
    mapa.set(e.status, r);
  }
  return [...mapa.values()];
}

export function resumoPorTipo(emendas: Emenda360[]): StatusResumo[] {
  const mapa = new Map<string, StatusResumo>();
  for (const e of emendas) {
    const r = mapa.get(e.tipo) ?? { status: e.tipo, qtd: 0, valor: 0 };
    r.qtd += 1;
    r.valor += e.valor;
    mapa.set(e.tipo, r);
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

export type Consolidado360 = {
  qtd: number;
  valor: number;
  qtdSaude: number;
  valorSaude: number;
  qtdDemais: number;
  valorDemais: number;
  tetoGlobal: number | null;
  // Reserva da saúde: parcela da cota/teto que SÓ pode ir para a saúde.
  // Apresentar emenda é faculdade — a regra é limite, não obrigação: as
  // demais áreas não podem ultrapassar (cota − reserva).
  pisoSaudeGlobal: number | null;
  pisoSaudeAutor: number | null;
  limiteDemaisGlobal: number | null;
  limiteDemaisAutor: number | null;
  totalAutores: number;
  autoresComEmenda: number;
};

export function consolidar(
  emendas: Emenda360[],
  p: Parametros360,
  totalAutores: number
): Consolidado360 {
  let valorSaude = 0;
  let qtdSaude = 0;
  let valor = 0;
  const autores = new Set<string>();
  for (const e of emendas) {
    valor += e.valor;
    autores.add(e.autorId);
    if (ehSaude(e, p)) {
      valorSaude += e.valor;
      qtdSaude += 1;
    }
  }
  const tetoGlobal =
    p.cotaPorAutor != null && totalAutores > 0 ? p.cotaPorAutor * totalAutores : null;
  const pisoSaudeAutor =
    p.cotaPorAutor != null && p.reservaSaudePct != null
      ? (p.cotaPorAutor * p.reservaSaudePct) / 100
      : null;
  const pisoSaudeGlobal =
    tetoGlobal != null && p.reservaSaudePct != null
      ? (tetoGlobal * p.reservaSaudePct) / 100
      : null;
  return {
    qtd: emendas.length,
    valor,
    qtdSaude,
    valorSaude,
    qtdDemais: emendas.length - qtdSaude,
    valorDemais: valor - valorSaude,
    tetoGlobal,
    pisoSaudeGlobal,
    pisoSaudeAutor,
    limiteDemaisGlobal:
      tetoGlobal != null && pisoSaudeGlobal != null
        ? tetoGlobal - pisoSaudeGlobal
        : null,
    limiteDemaisAutor:
      p.cotaPorAutor != null && pisoSaudeAutor != null
        ? p.cotaPorAutor - pisoSaudeAutor
        : null,
    totalAutores,
    autoresComEmenda: autores.size,
  };
}

// Pacote completo para as vistas (uma chamada por página).
// `cache` por requisição: a casca (contadores do menu) e a página pedem o
// mesmo consolidado, e sem isso seriam duas rodadas de query por navegação.
export const getDados360 = cache(async function getDados360(ano: number | null) {
  const [params, emendas, autoresCadastrados] = await Promise.all([
    getParametros360(ano),
    getEmendas360(ano),
    contarAutores(),
  ]);
  const totalAutores =
    params.numeroAutores != null && params.numeroAutores > 0
      ? params.numeroAutores
      : autoresCadastrados;
  return {
    params,
    emendas,
    totalAutores,
    consolidado: consolidar(emendas, params, totalAutores),
    porAutor: resumoPorAutor(emendas, params),
    porDestino: resumoPorDestino(emendas, params),
    porStatus: resumoPorStatus(emendas),
    porTipo: resumoPorTipo(emendas),
  };
});

export type Dados360 = Awaited<ReturnType<typeof getDados360>>;

// ------------------------------------------------------------- formatação
export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const brlCompacto = (n: number) => {
  if (Math.abs(n) >= 1e6)
    return `R$ ${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (Math.abs(n) >= 1e3)
    return `R$ ${(n / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return brl(n);
};
