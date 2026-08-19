import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// ============================================================================
// EXERCÍCIO 2027 — Mogi Guaçu/SP
//
// Monta o exercício-alvo do produto sobre a base orçamentária REAL do
// município, extraída dos documentos que o autor enviou em 19/08/2026.
// Ver docs/better/08-dados-reais-mogi-guacu.md.
//
// ─── O QUE É REAL ───────────────────────────────────────────────────────────
//   Órgãos, unidades orçamentárias, funções, subfunções, programas, ações,
//   metas físicas, custos estimados e as prioridades da LDO.
//   Fonte: Lei 6.393/2026 (LDO 2027), Anexo V — relatório PLR00547 — e o
//   Demonstrativo de Funções/Subfunções/Programas/Ações dos anexos do PPA
//   2026-2029 (Lei 6.245/2025), relatório PLR00342.
//   Extraído por OCR e conferido contra os totais impressos em cada bloco.
//   Os dados vivem em docs/better/dados/base-2027.json.
//
// ─── O QUE É SIMULADO ───────────────────────────────────────────────────────
//   As DOTAÇÕES, e só elas — com natureza da despesa e fonte de recurso.
//   Não há como ser diferente: a dotação nasce na LOA, e a PLOA 2027 ainda não
//   foi enviada à Câmara (chega perto de 30/09/2026). Nenhum documento existente
//   poderia trazê-la.
//
//   A simulação não inventa dinheiro: o custo estimado REAL de cada ação é
//   repartido entre as dotações geradas, de modo que a soma de todas elas bate
//   exatamente com os R$ 993.305.344,00 do Anexo V. O que se inventa é só a
//   REPARTIÇÃO — quanto de cada ação vai para pessoal, custeio ou capital, e
//   sob qual fonte.
//
//   Natureza da despesa segue a Portaria Interministerial STN/SOF 163/2001;
//   fontes seguem o padrão da Portaria STN 710/2021 (adotado em SP desde 2023).
//   Os catálogos são reais; o que é fictício é o casamento com cada ação.
//
//   O instrumento que recebe as dotações é marcado como simulado na ementa,
//   para que ninguém confunda com a PLOA de verdade quando ela chegar.
//
//   Geração DETERMINÍSTICA (PRNG com semente fixa): rodar duas vezes dá
//   exatamente o mesmo resultado.
//
// Uso:  npm run db:2027
// ============================================================================

const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  process.env.Emendas_POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error("Defina DATABASE_URL/DIRECT_URL no .env antes de rodar.");
  process.exit(1);
}
// Guard: por padrão recusa banco remoto, para ninguém semear produção sem
// querer. Para popular a demonstração hospedada (Vercel/Neon) de propósito:
//   PERMITIR_BANCO_REMOTO=1 npm run db:deploy
if (/neon\.tech|vercel/.test(url) && process.env.PERMITIR_BANCO_REMOTO !== "1") {
  console.error(
    "Recusando rodar: a connection string parece ser de um banco remoto.\n" +
    "Se a intenção é semear a demonstração hospedada, repita com " +
    "PERMITIR_BANCO_REMOTO=1.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const ANO = 2027;

// ---------------------------------------------------------------------------
// Base real
// ---------------------------------------------------------------------------

type Linha = {
  orgaoCodigo: string; orgaoNome: string;
  unidadeCodigo: string; unidadeNome: string;
  funcaoCodigo: string; funcaoNome: string;
  subfuncaoCodigo: string; subfuncaoNome: string;
  programaCodigo: string; programaNome: string;
  acaoCodigo: string; acaoNome: string; acaoTipo: string;
  orgaoExecutor: string | null; metaFisica: string | null;
  custoEstimado: number;
  funcaoOrigem: string;
};

type Base = {
  exercicio: number;
  municipio: string;
  fonte: string;
  orgaos: { codigo: string; nome: string }[];
  unidades: { orgaoCodigo: string; codigo: string; nome: string }[];
  funcoes: { codigo: string; nome: string }[];
  subfuncoes: { codigo: string; nome: string; funcaoCodigo: string }[];
  programas: { codigo: string; nome: string }[];
  acoes: { programaCodigo: string; codigo: string; nome: string; tipo: string }[];
  prioridadesLDO: { programaCodigo: string; acaoCodigo: string; descricao: string }[];
  linhas: Linha[];
};

const base: Base = JSON.parse(
  readFileSync(join(__dirname, "../docs/better/dados/base-2027.json"), "utf-8"),
);

// ---------------------------------------------------------------------------
// Catálogos padronizados (reais — tabelas nacionais/estaduais)
// ---------------------------------------------------------------------------

// Natureza da despesa — Portaria Interministerial STN/SOF 163/2001.
// codigo = categoria.grupo.modalidade.elemento
const NATUREZAS: { codigo: string; elemNome: string }[] = [
  { codigo: "3.1.90.04", elemNome: "Contratação por Tempo Determinado" },
  { codigo: "3.1.90.11", elemNome: "Vencimentos e Vantagens Fixas — Pessoal Civil" },
  { codigo: "3.1.90.13", elemNome: "Obrigações Patronais" },
  { codigo: "3.1.90.16", elemNome: "Outras Despesas Variáveis — Pessoal Civil" },
  { codigo: "3.1.91.13", elemNome: "Obrigações Patronais — Intra-Orçamentárias" },
  { codigo: "3.3.90.08", elemNome: "Outros Benefícios Assistenciais" },
  { codigo: "3.3.90.14", elemNome: "Diárias — Pessoal Civil" },
  { codigo: "3.3.90.30", elemNome: "Material de Consumo" },
  { codigo: "3.3.90.32", elemNome: "Material de Distribuição Gratuita" },
  { codigo: "3.3.90.33", elemNome: "Passagens e Despesas com Locomoção" },
  { codigo: "3.3.90.35", elemNome: "Serviços de Consultoria" },
  { codigo: "3.3.90.36", elemNome: "Outros Serviços de Terceiros — Pessoa Física" },
  { codigo: "3.3.90.37", elemNome: "Locação de Mão de Obra" },
  { codigo: "3.3.90.39", elemNome: "Outros Serviços de Terceiros — Pessoa Jurídica" },
  { codigo: "3.3.90.40", elemNome: "Serviços de Tecnologia da Informação" },
  { codigo: "3.3.90.46", elemNome: "Auxílio-Alimentação" },
  { codigo: "3.3.90.47", elemNome: "Obrigações Tributárias e Contributivas" },
  { codigo: "3.3.90.48", elemNome: "Outros Auxílios Financeiros a Pessoas Físicas" },
  { codigo: "3.3.90.49", elemNome: "Auxílio-Transporte" },
  { codigo: "3.3.90.93", elemNome: "Indenizações e Restituições" },
  { codigo: "3.3.50.39", elemNome: "Outros Serviços de Terceiros — PJ (Entidades sem fins lucrativos)" },
  { codigo: "3.3.50.43", elemNome: "Subvenções Sociais" },
  { codigo: "3.3.71.70", elemNome: "Rateio pela Participação em Consórcio Público" },
  { codigo: "3.2.90.21", elemNome: "Juros sobre a Dívida por Contrato" },
  { codigo: "4.4.90.51", elemNome: "Obras e Instalações" },
  { codigo: "4.4.90.52", elemNome: "Equipamentos e Material Permanente" },
  { codigo: "4.4.90.61", elemNome: "Aquisição de Imóveis" },
  { codigo: "4.4.50.42", elemNome: "Auxílios (Entidades sem fins lucrativos)" },
  { codigo: "4.6.90.71", elemNome: "Principal da Dívida Contratual Resgatado" },
];

// Fonte de recurso — padrão da Portaria STN 710/2021, adotado em SP desde 2023.
const FONTES: { codigo: string; nome: string }[] = [
  { codigo: "500", nome: "Recursos não Vinculados de Impostos" },
  { codigo: "501", nome: "Outros Recursos não Vinculados" },
  { codigo: "540", nome: "Transferências do FUNDEB — Impostos" },
  { codigo: "541", nome: "Transferências do FUNDEB — Complementação VAAF" },
  { codigo: "542", nome: "Transferências do FUNDEB — Complementação VAAT" },
  { codigo: "550", nome: "Transferências do Salário-Educação" },
  { codigo: "551", nome: "Transferências do FNDE" },
  { codigo: "552", nome: "Transferências do FNAS" },
  { codigo: "553", nome: "Transferências do Fundo Nacional de Saúde" },
  { codigo: "569", nome: "Outras Transferências de Convênios da União" },
  { codigo: "600", nome: "Transferências e Convênios Estaduais — Vinculados" },
  { codigo: "621", nome: "Transferências do QESE — Estado" },
  { codigo: "660", nome: "Transferências de Convênios do Estado" },
  { codigo: "700", nome: "Operações de Crédito" },
  { codigo: "751", nome: "Recursos de Alienação de Bens" },
  { codigo: "759", nome: "Outros Recursos Vinculados" },
];

// Fontes plausíveis por função — evita combinação absurda (FUNDEB fora da
// educação, por exemplo).
const FONTES_POR_FUNCAO: Record<string, string[]> = {
  "01": ["500", "501"],
  "02": ["500", "501"],
  "03": ["500", "501"],
  "04": ["500", "501", "751"],
  "06": ["500", "501", "660", "700"],
  "08": ["500", "501", "552", "660", "569"],
  "09": ["500", "759"],
  "10": ["500", "501", "553", "660", "569", "700"],
  "11": ["500", "501", "660"],
  "12": ["500", "540", "541", "542", "550", "551", "621", "660"],
  "13": ["500", "501", "660"],
  "14": ["500", "501", "660"],
  "15": ["500", "501", "700", "751", "660"],
  "16": ["500", "569", "700"],
  "17": ["500", "660", "700", "759"],
  "18": ["500", "759", "660"],
  "19": ["500", "501"],
  "20": ["500", "660", "569"],
  "22": ["500", "660"],
  "23": ["500", "660"],
  "26": ["500", "660", "700"],
  "27": ["500", "501", "660"],
  "28": ["500", "501", "759"],
  "99": ["500"],
};

// Perfis de natureza por feitio da ação. É aqui que mora a ficção: qual
// combinação de naturezas é plausível para uma ação daquele tipo.
const NAT_PESSOAL = ["3.1.90.11", "3.1.90.13", "3.1.90.16", "3.1.90.04", "3.1.91.13",
                     "3.3.90.46", "3.3.90.49"];
const NAT_OBRA = ["4.4.90.51", "4.4.90.52", "3.3.90.39", "4.4.90.61"];
const NAT_CUSTEIO = ["3.3.90.30", "3.3.90.39", "3.3.90.36", "3.3.90.37", "3.3.90.40",
                     "3.3.90.33", "3.3.90.32", "3.3.90.14", "3.3.90.35", "4.4.90.52"];
const NAT_TRANSFERENCIA = ["3.3.50.43", "3.3.50.39", "3.3.71.70", "4.4.50.42"];
const NAT_ENCARGO = ["3.3.90.93", "3.3.90.47", "3.2.90.21", "4.6.90.71", "3.3.90.08",
                     "3.3.90.48"];

const RE_PESSOAL = /RECURSOS HUMANOS|BENEFICIO AO TRABALHADOR|ENCARGOS SOCIAIS|INATIVOS|APOSENTADOS|PENSIONISTAS/i;
const RE_TRANSF = /CONVENIO|CONVÊNIO|PARCERIA|COLABORA|CONTRIBUI|SUBVEN|ONGS|APOIO A|CUSTEIO DO|CUSTEIO DE/i;

function perfilNaturezas(l: Linha): string[] {
  if (RE_PESSOAL.test(l.acaoNome)) return NAT_PESSOAL;
  if (RE_TRANSF.test(l.acaoNome)) return NAT_TRANSFERENCIA;
  if (l.acaoTipo === "PROJETO") return NAT_OBRA;
  if (l.funcaoCodigo === "28" || l.funcaoCodigo === "99") return NAT_ENCARGO;
  return NAT_CUSTEIO;
}

// Quantas dotações abrir para uma ação — proporcional à ordem de grandeza,
// como acontece numa LOA de verdade.
function quantasDotacoes(valor: number): number {
  if (valor < 100_000) return 2;
  if (valor < 1_000_000) return 4;
  if (valor < 10_000_000) return 7;
  return 11;
}

// ---------------------------------------------------------------------------
// PRNG determinístico (mulberry32) — a mesma semente dá sempre a mesma base.
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20270101);

// Reparte `centavos` em `n` parcelas com pesos decrescentes; a última absorve
// o resto, para que a soma feche exatamente.
function repartir(centavos: number, n: number): number[] {
  const pesos = Array.from({ length: n }, (_, i) => (1 / (i + 1)) * (0.6 + rand() * 0.8));
  const soma = pesos.reduce((s, p) => s + p, 0);
  const parcelas: number[] = [];
  let usado = 0;
  for (let i = 0; i < n - 1; i++) {
    const v = Math.max(1, Math.round((centavos * pesos[i]) / soma));
    if (usado + v >= centavos) break;
    parcelas.push(v);
    usado += v;
  }
  parcelas.push(centavos - usado);
  return parcelas;
}

// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  console.log(`Base: ${base.municipio} · exercício ${base.exercicio}`);
  console.log(`Fonte: ${base.fonte}\n`);

  const exercicio = await prisma.exercicio.upsert({
    where: { ano: ANO },
    create: { ano: ANO, status: "ABERTO" },
    update: { status: "ABERTO" },
  });
  const exercicioId = exercicio.id;

  // ------------------------------------------------------------ classificação
  const orgaoId = new Map<string, string>();
  for (const o of base.orgaos) {
    const r = await prisma.orgao.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: o.codigo } },
      create: { codigo: o.codigo, nome: o.nome, exercicioId },
      update: { nome: o.nome },
    });
    orgaoId.set(o.codigo, r.id);
  }

  const unidadeId = new Map<string, string>(); // chave: `${orgao}/${unidade}`
  for (const u of base.unidades) {
    const oid = orgaoId.get(u.orgaoCodigo);
    if (!oid) continue;
    const r = await prisma.unidadeOrcamentaria.upsert({
      where: {
        exercicioId_orgaoId_codigo: { exercicioId, orgaoId: oid, codigo: u.codigo },
      },
      create: { codigo: u.codigo, nome: u.nome, orgaoId: oid, exercicioId },
      update: { nome: u.nome },
    });
    unidadeId.set(`${u.orgaoCodigo}/${u.codigo}`, r.id);
  }

  const funcaoId = new Map<string, string>();
  for (const f of base.funcoes) {
    const r = await prisma.funcao.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: f.codigo } },
      create: { codigo: f.codigo, nome: f.nome, exercicioId },
      update: { nome: f.nome },
    });
    funcaoId.set(f.codigo, r.id);
  }

  const subfuncaoId = new Map<string, string>(); // chave: `${funcao}/${sub}`
  for (const s of base.subfuncoes) {
    const fid = funcaoId.get(s.funcaoCodigo);
    if (!fid) continue;
    const nome = s.nome && s.nome.trim() ? s.nome : `Subfunção ${s.codigo}`;
    const r = await prisma.subfuncao.upsert({
      where: {
        exercicioId_funcaoId_codigo: { exercicioId, funcaoId: fid, codigo: s.codigo },
      },
      create: { codigo: s.codigo, nome, funcaoId: fid, exercicioId },
      update: { nome },
    });
    subfuncaoId.set(`${s.funcaoCodigo}/${s.codigo}`, r.id);
  }

  const programaId = new Map<string, string>();
  for (const p of base.programas) {
    const r = await prisma.programa.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: p.codigo } },
      create: { codigo: p.codigo, nome: p.nome, exercicioId },
      update: { nome: p.nome },
    });
    programaId.set(p.codigo, r.id);
  }

  const acaoId = new Map<string, string>(); // chave: `${programa}/${acao}`
  for (const a of base.acoes) {
    const pid = programaId.get(a.programaCodigo);
    if (!pid) continue;
    const r = await prisma.acao.upsert({
      where: {
        exercicioId_programaId_codigo: { exercicioId, programaId: pid, codigo: a.codigo },
      },
      create: {
        codigo: a.codigo, nome: a.nome,
        tipo: a.tipo as "PROJETO" | "ATIVIDADE" | "OPERACAO_ESPECIAL",
        programaId: pid, exercicioId,
      },
      update: { nome: a.nome },
    });
    acaoId.set(`${a.programaCodigo}/${a.codigo}`, r.id);
  }

  const naturezaId = new Map<string, string>();
  for (const n of NATUREZAS) {
    const [cat, grupo, mod, elem] = n.codigo.split(".");
    const r = await prisma.naturezaDespesa.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: n.codigo } },
      create: {
        codigo: n.codigo, categoriaEconomica: cat, grupo, modalidadeAplicacao: mod,
        elemento: elem, exercicioId,
      },
      update: {},
    });
    naturezaId.set(n.codigo, r.id);
  }

  const fonteId = new Map<string, string>();
  for (const f of FONTES) {
    const r = await prisma.fonteRecurso.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: f.codigo } },
      create: { codigo: f.codigo, nome: f.nome, exercicioId },
      update: { nome: f.nome },
    });
    fonteId.set(f.codigo, r.id);
  }

  console.log(
    `Classificação: ${orgaoId.size} órgãos · ${unidadeId.size} unidades · ` +
    `${funcaoId.size} funções · ${subfuncaoId.size} subfunções · ` +
    `${programaId.size} programas · ${acaoId.size} ações`,
  );
  console.log(
    `Catálogos padronizados: ${naturezaId.size} naturezas · ${fonteId.size} fontes`,
  );

  // ------------------------------------------------------------- instrumentos
  const ppa = await prisma.instrumentoPlanejamento.upsert({
    where: { id: "mg-ppa-2026-2029" },
    create: {
      id: "mg-ppa-2026-2029",
      tipo: "PPA", especie: "LEI_APROVADA",
      numero: "Lei 6.245/2025",
      ementa:
        "Dispõe sobre o Plano Plurianual — PPA do Município de Mogi Guaçu/SP " +
        "para o quadriênio de 2026 a 2029, e dá outras providências.",
      exercicioId, status: "VIGENTE",
      dataVigencia: new Date("2025-12-05T00:00:00Z"),
    },
    update: {},
  });

  const ldo = await prisma.instrumentoPlanejamento.upsert({
    where: { id: "mg-ldo-2027" },
    create: {
      id: "mg-ldo-2027",
      tipo: "LDO", especie: "LEI_APROVADA",
      numero: "Lei 6.393/2026",
      ementa:
        "Dispõe sobre as diretrizes para a elaboração e execução da Lei " +
        "Orçamentária Anual de 2027 do Município de Mogi Guaçu e dá outras " +
        "providências.",
      exercicioId, status: "VIGENTE",
      dataVigencia: new Date("2026-07-03T00:00:00Z"),
    },
    update: {},
  });

  // A PLOA de verdade ainda não existe (chega perto de 30/09/2026). Este é o
  // instrumento que recebe as dotações simuladas — e a ementa diz isso.
  const ploa = await prisma.instrumentoPlanejamento.upsert({
    where: { id: "mg-ploa-2027-simulada" },
    create: {
      id: "mg-ploa-2027-simulada",
      tipo: "LOA", especie: "PROJETO_LEI",
      numero: "PLOA 2027 (simulada)",
      ementa:
        "[BASE SIMULADA] Estimativa da receita e fixação da despesa do " +
        "Município de Mogi Guaçu para o exercício de 2027. As DOTAÇÕES desta " +
        "base são geradas, não oficiais: a PLOA 2027 ainda não foi enviada à " +
        "Câmara. Órgãos, unidades, funções, subfunções, programas, ações e " +
        "valores por ação são reais (LDO 2027, Anexo V); o que é simulado é a " +
        "repartição de cada ação entre natureza da despesa e fonte de recurso. " +
        "Substituir pela PLOA real assim que for protocolada.",
      exercicioId, status: "EM_TRAMITACAO",
      dataEnvio: new Date("2026-09-30T00:00:00Z"),
      instrumentoOrigemId: ldo.id,
    },
    update: {},
  });

  console.log(`\nInstrumentos: ${ppa.numero} · ${ldo.numero} · ${ploa.numero}`);

  // ---------------------------------------------------------------- dotações
  const existentes = await prisma.dotacao.count({ where: { instrumentoId: ploa.id } });
  if (existentes > 0) {
    console.log(`Dotações: ${existentes} já existem na PLOA — nada a fazer.`);
  } else {
    const novas: {
      instrumentoId: string; exercicioId: string; orgaoId: string;
      unidadeOrcamentariaId: string; funcaoId: string; subfuncaoId: string;
      programaId: string; acaoId: string; naturezaDespesaId: string;
      fonteRecursoId: string; valorInicial: number; valorAtual: number;
    }[] = [];

    let semClassificacao = 0;

    // Duas ações aparecem duas vezes no Anexo V sob exatamente a mesma
    // classificação (Transporte de Alunos e Desenv. de RH da Vigilância). Como
    // a Dotacao é única por classificação completa, elas têm de ser somadas —
    // é a mesma linha orçamentária. Sem isso a segunda seria descartada na
    // inserção e o total ficaria menor que o do Anexo V.
    const agrupadas = new Map<string, Linha>();
    for (const l of base.linhas) {
      const k = [l.orgaoCodigo, l.unidadeCodigo, l.funcaoCodigo, l.subfuncaoCodigo,
                 l.programaCodigo, l.acaoCodigo].join("|");
      const ja = agrupadas.get(k);
      if (ja) ja.custoEstimado += l.custoEstimado;
      else agrupadas.set(k, { ...l });
    }
    if (agrupadas.size !== base.linhas.length) {
      console.log(
        `\n${base.linhas.length} linhas do Anexo V → ${agrupadas.size} classificações ` +
        `distintas (${base.linhas.length - agrupadas.size} somadas por repetição).`,
      );
    }

    for (const l of agrupadas.values()) {
      const oid = orgaoId.get(l.orgaoCodigo);
      const uid = unidadeId.get(`${l.orgaoCodigo}/${l.unidadeCodigo}`);
      const fid = funcaoId.get(l.funcaoCodigo);
      const sid = subfuncaoId.get(`${l.funcaoCodigo}/${l.subfuncaoCodigo}`);
      const pid = programaId.get(l.programaCodigo);
      const aid = acaoId.get(`${l.programaCodigo}/${l.acaoCodigo}`);
      if (!oid || !uid || !fid || !sid || !pid || !aid) {
        semClassificacao++;
        continue;
      }

      const naturezas = perfilNaturezas(l);
      const fontes = FONTES_POR_FUNCAO[l.funcaoCodigo] ?? ["500"];

      // Combinações únicas natureza×fonte, na ordem em que couberem.
      const alvo = quantasDotacoes(l.custoEstimado);
      const combos: { nat: string; fonte: string }[] = [];
      const vistos = new Set<string>();
      for (let tent = 0; tent < alvo * 8 && combos.length < alvo; tent++) {
        const nat = naturezas[Math.floor(rand() * naturezas.length)];
        const fonte = fontes[Math.floor(rand() * fontes.length)];
        const k = `${nat}|${fonte}`;
        if (vistos.has(k)) continue;
        vistos.add(k);
        combos.push({ nat, fonte });
      }

      // Reparte o custo REAL da ação entre as combinações — a soma fecha.
      const parcelas = repartir(Math.round(l.custoEstimado * 100), combos.length);

      parcelas.forEach((centavos, i) => {
        const c = combos[i];
        const nid = naturezaId.get(c.nat);
        const fnid = fonteId.get(c.fonte);
        if (!nid || !fnid) return;
        const valor = centavos / 100;
        novas.push({
          instrumentoId: ploa.id, exercicioId,
          orgaoId: oid, unidadeOrcamentariaId: uid,
          funcaoId: fid, subfuncaoId: sid,
          programaId: pid, acaoId: aid,
          naturezaDespesaId: nid, fonteRecursoId: fnid,
          valorInicial: valor, valorAtual: valor,
        });
      });
    }

    const LOTE = 500;
    for (let i = 0; i < novas.length; i += LOTE) {
      await prisma.dotacao.createMany({
        data: novas.slice(i, i + LOTE), skipDuplicates: true,
      });
    }

    // Confere contra o BANCO, não contra o array em memória: só a leitura de
    // volta prova que nada foi descartado pelo índice único na inserção.
    const gravadas = await prisma.dotacao.aggregate({
      where: { instrumentoId: ploa.id },
      _count: true,
      _sum: { valorInicial: true },
    });
    const somaGravada = Number(gravadas._sum.valorInicial ?? 0);
    const somaReal = base.linhas.reduce((s, l) => s + l.custoEstimado, 0);
    const fecha = Math.abs(somaGravada - somaReal) < 0.005;

    console.log(`\nDotações: ${novas.length} geradas, ${gravadas._count} gravadas`);
    console.log(`  soma no banco        : ${brl(somaGravada)}`);
    console.log(`  total real do Anexo V: ${brl(somaReal)}`);
    console.log(
      `  diferença            : ${brl(somaGravada - somaReal)} ` +
      `${fecha ? "✓ fecha" : "✗ NÃO FECHA"}`,
    );
    if (semClassificacao) {
      console.log(`  linhas sem classificação completa (ignoradas): ${semClassificacao}`);
    }
    if (!fecha || gravadas._count !== novas.length) {
      throw new Error(
        `Base inconsistente: ${novas.length} geradas mas ${gravadas._count} gravadas, ` +
        `diferença de ${brl(somaGravada - somaReal)}. ` +
        `Provável colisão no índice único da classificação.`,
      );
    }
  }

  // ------------------------------------------------------ prioridades da LDO
  const jaPrioridades = await prisma.prioridadeLDO.count({ where: { exercicioId } });
  if (jaPrioridades === 0) {
    const dados = base.prioridadesLDO
      .map((p) => {
        const pid = programaId.get(p.programaCodigo);
        const aid = acaoId.get(`${p.programaCodigo}/${p.acaoCodigo}`);
        return pid ? { descricao: p.descricao, programaId: pid, acaoId: aid ?? null, exercicioId } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    for (let i = 0; i < dados.length; i += 500) {
      await prisma.prioridadeLDO.createMany({ data: dados.slice(i, i + 500) });
    }
    console.log(`\nPrioridades da LDO: ${dados.length} (Anexo V — reais)`);
  } else {
    console.log(`\nPrioridades da LDO: ${jaPrioridades} já existem.`);
  }

  // -------------------------------------------------------------- parâmetros
  // O seed oficial grava RCL e PERCENTUAL_IMPOSITIVO com escopo GERAL, valendo
  // para todo exercício. Aqueles números são do protótipo original e não são de
  // Mogi Guaçu — a RCL geral (R$ 433 mi) é menos da metade da real. Como o
  // parâmetro do exercício tem precedência sobre o GERAL (ver
  // src/lib/queries-360.ts), gravamos aqui os valores de 2027.
  const params: {
    chave: string; valor: string; modo: "BLOQUEANTE" | "ALERTA" | null; fundamento: string;
  }[] = [
    {
      // Único número desta lista que é FATO, tirado da lei.
      chave: "RCL", valor: "1059216686.35", modo: null,
      fundamento:
        "Receita Corrente Líquida projetada para 2027: R$ 1.059.216.686,35. " +
        "Fonte: LDO 2027 (Lei 6.393/2026), Anexo das Metas Fiscais — Metas " +
        "Anuais, relatório PLR01128, versão 15/04/2026. Substitui o parâmetro " +
        "GERAL de R$ 433 mi, herdado do protótipo e alheio a Mogi Guaçu.",
    },
    {
      chave: "PERCENTUAL_IMPOSITIVO", valor: "1.5", modo: "ALERTA",
      fundamento:
        "NÃO CONFERIDO — 1,5% é o valor herdado do protótipo original, não " +
        "verificado contra a Lei Orgânica de Mogi Guaçu. O art. 23 §3º da LDO " +
        "2027 remete ao art. 140 §6º da LOM, que não veio nos documentos " +
        "recebidos. Conferir antes de exibir este número à comissão.",
    },
    {
      chave: "TETO_VALOR_AUTOR", valor: "1000000", modo: "ALERTA",
      fundamento:
        "PROVISÓRIO — conferir na Lei Orgânica Municipal, art. 140 §6º, a que " +
        "remete o art. 23 §3º da LDO 2027. O valor aqui é um marcador, não a " +
        "cota real. Trocar o número e passar para BLOQUEANTE quando confirmado.",
    },
    {
      chave: "NUMERO_AUTORES", valor: "13", modo: null,
      fundamento: "Número de vereadores usado nos agregados do painel.",
    },
  ];
  for (const p of params) {
    const existente = await prisma.parametroValidacao.findFirst({
      where: { exercicioId, chave: p.chave },
    });
    if (!existente) {
      await prisma.parametroValidacao.create({
        data: {
          escopo: "EXERCICIO", exercicioId, chave: p.chave, valor: p.valor,
          modo: p.modo, fundamentoDescricao: p.fundamento,
        },
      });
    }
  }
  console.log(
    `Parâmetros do exercício: RCL R$ 1.059.216.686,35 (real, LDO Anexo de ` +
    `Metas Fiscais) · TETO_VALOR_AUTOR e PERCENTUAL_IMPOSITIVO provisórios ` +
    `em ALERTA (falta o art. 140 §6º da LOM)`,
  );

  console.log(`\nConcluído em ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
