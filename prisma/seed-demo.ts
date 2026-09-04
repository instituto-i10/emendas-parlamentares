import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { avaliarEmenda, type ContextoEmenda, type DotacaoCtx } from "../src/lib/validation/motor";

// ============================================================================
// Dataset de demonstração para o trabalho de UX/UI (Better).
//
// O seed oficial (`npm run seed`) cria a base de dotações e os usuários, mas
// ZERO emendas e 1 autor — os painéis ficam todos em estado vazio. Este script
// completa o cenário: 13 vereadores, beneficiários (com variantes de grafia
// para exercitar a mesclagem), normas, parâmetros informativos e ~50 emendas
// com distribuição deliberada de conformidade, para que farol, KPIs, Vereador
// 360, Análise Técnica e Conformidade tenham o que mostrar.
//
// O status de cada emenda é decidido pelo MOTOR REAL (`avaliarEmenda`), não
// escrito à mão — o que também deixa o histórico de ValidacaoEmenda coerente.
//
// Uso:  npx tsx prisma/seed-demo.ts        (idempotente: limpa e recria)
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

const ANO = 2025;

// --------------------------------------------------------------------- dados

const VEREADORES = [
  "Adriana Bellintani",
  "Carlos Eduardo Prado",
  "Dalva Nogueira",
  "Edmilson Ferraz",
  "Fabiana Kobayashi",
  "Gilberto Moraes",
  "Helena Vasconcelos",
  "Ivo Salgueiro",
  "Juliana Rocha Lima",
  "Marcos Aurélio Tinoco",
  "Neusa Bezerra",
  "Rogério Pastore",
];

// Variantes de grafia propositais: a aba Beneficiários → "mesclar duplicados"
// só tem o que mostrar se existirem candidatos reais.
const BENEFICIARIOS: { nome: string; tipo: "ADMINISTRACAO_DIRETA" | "ADMINISTRACAO_INDIRETA" | "TERCEIRO_SETOR"; cnpj?: string }[] = [
  { nome: "Santa Casa de Misericórdia", tipo: "TERCEIRO_SETOR", cnpj: "44.567.890/0001-12" },
  { nome: "Santa Casa", tipo: "TERCEIRO_SETOR" },
  { nome: "Santa Casa de Misericórdia de Mogi Guaçu", tipo: "TERCEIRO_SETOR" },
  { nome: "APAE", tipo: "TERCEIRO_SETOR", cnpj: "51.234.567/0001-90" },
  { nome: "APAE Mogi Guaçu", tipo: "TERCEIRO_SETOR" },
  { nome: "Fundo Municipal de Saúde", tipo: "ADMINISTRACAO_DIRETA" },
  { nome: "UBS Jardim Itamaraty", tipo: "ADMINISTRACAO_DIRETA" },
  { nome: "UBS Parque Cidade Nova", tipo: "ADMINISTRACAO_DIRETA" },
  { nome: "EMEB Professora Marta Ribeiro", tipo: "ADMINISTRACAO_DIRETA" },
  { nome: "Creche Municipal Vila Esperança", tipo: "ADMINISTRACAO_DIRETA" },
  { nome: "Lar dos Velhinhos São Vicente", tipo: "TERCEIRO_SETOR", cnpj: "62.345.678/0001-45" },
  { nome: "Associação de Pais e Amigos do Bairro Ypê", tipo: "TERCEIRO_SETOR" },
  { nome: "Secretaria Municipal de Educação", tipo: "ADMINISTRACAO_DIRETA" },
  { nome: "Corpo de Bombeiros — Posto Municipal", tipo: "ADMINISTRACAO_DIRETA" },
  // Administração INDIRETA — pessoa jurídica própria, separada da Prefeitura.
  // Sem pelo menos um exemplo, a categoria existe no código e some da tela.
  { nome: "SAMAE — Serviço Autônomo Municipal de Água e Esgoto", tipo: "ADMINISTRACAO_INDIRETA" },
  { nome: "FEG — Fundação Educacional Guaçuana", tipo: "ADMINISTRACAO_INDIRETA" },
];

const NORMAS = [
  {
    tipo: "LOM" as const,
    titulo: "Lei Orgânica do Município — art. 140 e 166",
    numero: "LOM/1990",
    arquivoUrl: "https://exemplo.municipio.gov.br/normas/lom.pdf",
  },
  {
    tipo: "REGIMENTO_INTERNO" as const,
    titulo: "Regimento Interno da Câmara Municipal",
    numero: "Res. 03/2019",
    arquivoUrl: "https://exemplo.municipio.gov.br/normas/regimento-interno.pdf",
  },
  {
    tipo: "OUTRO" as const,
    titulo: "Manual de indicação e execução de emendas impositivas",
    numero: "Ato da Mesa 02/2025",
    arquivoUrl: "https://exemplo.municipio.gov.br/normas/manual-emendas.pdf",
  },
];

// Objetos plausíveis por área. O texto do objeto é a origem da derivação de
// beneficiários no sistema — por isso ele cita a entidade pelo nome.
const OBJETOS_SAUDE = [
  ["Aquisição de equipamentos odontológicos para a {b}", "Santa Casa de Misericórdia"],
  ["Custeio de exames de imagem na {b}", "Santa Casa"],
  ["Reforma da sala de acolhimento da {b}", "UBS Jardim Itamaraty"],
  ["Aquisição de veículo para visitas domiciliares vinculado à {b}", "UBS Parque Cidade Nova"],
  ["Ampliação do atendimento fisioterápico na {b}", "APAE Mogi Guaçu"],
  ["Aquisição de mobiliário clínico para o {b}", "Fundo Municipal de Saúde"],
  ["Custeio de medicamentos de dispensação excepcional pelo {b}", "Fundo Municipal de Saúde"],
  ["Aquisição de cadeiras de rodas para o {b}", "Lar dos Velhinhos São Vicente"],
];

const OBJETOS_DEMAIS = [
  ["Aquisição de material didático para a {b}", "EMEB Professora Marta Ribeiro"],
  ["Reforma do parque infantil da {b}", "Creche Municipal Vila Esperança"],
  ["Aquisição de ônibus escolar para a {b}", "Secretaria Municipal de Educação"],
  ["Custeio de transporte de alunos da zona rural pela {b}", "Secretaria Municipal de Educação"],
  ["Aquisição de computadores para a {b}", "EMEB Professora Marta Ribeiro"],
  ["Instalação de cobertura na quadra da {b}", "EMEB Professora Marta Ribeiro"],
  ["Aquisição de equipamentos de informática para a {b}", "APAE"],
  ["Apoio às atividades socioeducativas da {b}", "Associação de Pais e Amigos do Bairro Ypê"],
  ["Aquisição de equipamentos de resgate para o {b}", "Corpo de Bombeiros — Posto Municipal"],
  ["Modernização do atendimento ao cidadão", "Secretaria Municipal de Educação"],
];

const JUSTIFICATIVAS = [
  "A demanda foi apresentada em audiência pública do bairro e consta das prioridades da LDO do exercício.",
  "O equipamento atual está depreciado e compromete o atendimento à população da região.",
  "A entidade atende gratuitamente famílias em vulnerabilidade e não dispõe de recurso próprio para o investimento.",
  "A medida amplia a capacidade de atendimento sem gerar despesa continuada de pessoal.",
  "A destinação atende à política municipal do setor e observa a compatibilidade com o PPA vigente.",
  "O pedido é reiterado da comunidade e foi objeto de indicação anterior desta Casa.",
];

// Plano de conformidade por autor: quanto vai para saúde e quanto para as
// demais áreas. Cota = 500.000; reserva = 50% → limite das demais = 250.000.
// A distribuição é deliberada para acender cada estado do farol.
type Plano = { saude: number[]; demais: number[]; nota: string };

const PLANOS: Plano[] = [
  { saude: [140000, 110000], demais: [130000, 90000], nota: "conforme" },
  { saude: [150000], demais: [120000, 110000], nota: "conforme" },
  { saude: [130000, 120000], demais: [200000], nota: "conforme, no limite" },
  { saude: [180000], demais: [90000, 80000], nota: "conforme" },
  { saude: [], demais: [150000, 140000], nota: "INVADE a reserva (290k > 250k)" },
  { saude: [90000], demais: [130000, 120000], nota: "INVADE a reserva (250k+ com folga)" },
  { saude: [160000, 130000], demais: [110000], nota: "conforme" },
  { saude: [120000], demais: [100000], nota: "cota parcialmente usada" },
  { saude: [200000, 150000], demais: [160000, 140000], nota: "ACIMA da cota (650k)" },
  { saude: [110000], demais: [70000, 60000], nota: "conforme" },
  { saude: [140000, 100000], demais: [130000], nota: "conforme" },
  { saude: [], demais: [80000], nota: "uso mínimo" },
  { saude: [150000, 120000], demais: [90000, 80000], nota: "conforme" },
];

const TIPOS = ["IMPOSITIVA", "ACRESCIMO", "IMPOSITIVA", "IMPOSITIVA", "ANULACAO"] as const;

// Distribuição de destino final do status, aplicada DEPOIS do motor. O motor
// decide VALIDA/INVALIDA; daí em diante é decisão humana (submeter, parecer).
const DESTINOS = [
  "SUBMETIDA", "APROVADA", "APROVADA", "SUBMETIDA", "RASCUNHO",
  "APROVADA", "SUBMETIDA", "REJEITADA", "APROVADA", "SUBMETIDA",
] as const;

// ----------------------------------------------------------------- utilidades

// Gerador determinístico — o dataset precisa ser reproduzível entre execuções.
function rng(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function main() {
  const exercicio = await prisma.exercicio.findUnique({ where: { ano: ANO } });
  if (!exercicio) throw new Error(`Exercício ${ANO} não existe — rode 'npm run seed' antes.`);
  const exercicioId = exercicio.id;

  const base = await prisma.instrumentoPlanejamento.findFirst({
    where: { exercicioId, especie: "PROJETO_LEI" },
  });
  if (!base) throw new Error("Nenhum PROJETO_LEI no exercício — rode 'npm run seed' antes.");
  if (base.status !== "EM_TRAMITACAO") {
    await prisma.instrumentoPlanejamento.update({
      where: { id: base.id },
      data: { status: "EM_TRAMITACAO" },
    });
  }

  // Limpa apenas o que este script gera (emendas e validações).
  await prisma.validacaoEmenda.deleteMany({ where: { emenda: { exercicioId } } });
  await prisma.emenda.deleteMany({ where: { exercicioId } });

  // ------------------------------------------------------------- parâmetros
  const paramsExtras = [
    { chave: "NUMERO_AUTORES", valor: "13", modo: null },
    { chave: "RCL", valor: "433000000", modo: null },
    { chave: "FUNCAO_SAUDE", valor: "10", modo: null },
  ] as const;
  for (const p of paramsExtras) {
    const existente = await prisma.parametroValidacao.findFirst({
      where: { exercicioId: null, chave: p.chave },
    });
    if (existente) {
      await prisma.parametroValidacao.update({ where: { id: existente.id }, data: { valor: p.valor } });
    } else {
      await prisma.parametroValidacao.create({
        data: { escopo: "GERAL", chave: p.chave, valor: p.valor },
      });
    }
  }

  // ------------------------------------------------------------------ normas
  for (const n of NORMAS) {
    const existente = await prisma.documentoNormativo.findFirst({ where: { titulo: n.titulo } });
    if (!existente) await prisma.documentoNormativo.create({ data: { ...n, ativo: true } });
  }

  // ---------------------------------------------------------- beneficiários
  const benefId = new Map<string, string>();
  for (const b of BENEFICIARIOS) {
    const r = await prisma.beneficiario.upsert({
      where: { nome: b.nome },
      create: { nome: b.nome, tipo: b.tipo, cnpj: b.cnpj ?? null },
      update: { tipo: b.tipo },
    });
    benefId.set(b.nome, r.id);
  }

  // ----------------------------------------------------------------- autores
  const autores = await prisma.autor.findMany({ orderBy: { createdAt: "asc" } });
  const listaAutores = [...autores];
  for (const nome of VEREADORES) {
    if (listaAutores.some((a) => a.nome === nome)) continue;
    const novo = await prisma.autor.create({ data: { nome, cargo: "Vereador(a)" } });
    listaAutores.push(novo);
  }

  // ---------------------------------------------------------------- dotações
  const dotacoes = await prisma.dotacao.findMany({
    where: { instrumentoId: base.id },
    include: {
      acao: { select: { programaId: true } },
      funcao: { select: { codigo: true } },
      naturezaDespesa: { select: { grupo: true } },
    },
  });
  const saude = dotacoes.filter((d) => d.funcao.codigo === "10");
  const demais = dotacoes.filter((d) => d.funcao.codigo !== "10");
  if (saude.length === 0 || demais.length === 0) throw new Error("Base sem dotações suficientes.");

  // Contexto fixo do motor (PPA, prioridades da LDO, parâmetros).
  const ppa = await prisma.instrumentoPlanejamento.findFirst({
    where: { exercicioId, tipo: "PPA" },
    select: { id: true },
  });
  // Mesma derivação do motor em runtime (motorEmenda.ts): a flag
  // `Programa.constaNoPPA`, não dotações do PPA. Se as duas divergirem, a
  // demonstração valida diferente do produto — foi assim que o problema do PPA
  // passou despercebido por semanas.
  const programasNoPPA = new Set<string>(
    ppa
      ? (
          await prisma.programa.findMany({
            where: { exercicioId, constaNoPPA: true },
            select: { id: true },
          })
        ).map((x) => x.id)
      : [],
  );
  const prioridades = await prisma.prioridadeLDO.findMany({
    where: { exercicioId },
    select: { programaId: true, acaoId: true },
  });
  const prioridadesPrograma = new Set(prioridades.map((p) => p.programaId));
  const prioridadesAcao = new Set(prioridades.filter((p) => p.acaoId).map((p) => p.acaoId as string));

  const TETO = 500000;
  const RESERVA_PCT = 50;

  const rand = rng(20250818);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  let seq = 0;
  let criadas = 0;
  const resumo: Record<string, number> = {};

  for (let i = 0; i < listaAutores.length && i < PLANOS.length; i++) {
    const autor = listaAutores[i];
    const plano = PLANOS[i];

    const itens: { valor: number; ehSaude: boolean }[] = [
      ...plano.saude.map((valor) => ({ valor, ehSaude: true })),
      ...plano.demais.map((valor) => ({ valor, ehSaude: false })),
    ];

    // Somas acumuladas do autor, replicando o que o motor consulta no banco.
    let somaAutor = 0;
    let somaDemais = 0;

    for (const item of itens) {
      seq++;
      const dot = item.ehSaude ? pick(saude) : pick(demais);
      const [tpl, benefNome] = item.ehSaude ? pick(OBJETOS_SAUDE) : pick(OBJETOS_DEMAIS);
      const objeto = tpl.replace("{b}", benefNome);
      const justificativaEmenda = pick(JUSTIFICATIVAS);
      const tipo = pick([...TIPOS]);
      // ANULACAO não pode exceder o saldo da dotação — respeita a checagem 9.
      const valorFinal =
        tipo === "ANULACAO" ? Math.min(item.valor, Number(dot.valorAtual)) : item.valor;

      const emenda = await prisma.emenda.create({
        data: {
          numero: `EM ${String(seq).padStart(3, "0")}/${ANO}`,
          exercicioId,
          instrumentoBaseId: base.id,
          autorId: autor.id,
          dotacaoId: dot.id,
          tipo,
          objeto,
          justificativa: justificativaEmenda,
          valor: valorFinal,
          status: "RASCUNHO",
          beneficiarioId: benefId.get(benefNome) ?? null,
        },
      });

      const dotCtx: DotacaoCtx = {
        id: dot.id,
        instrumentoId: dot.instrumentoId,
        exercicioId: dot.exercicioId,
        orgaoId: dot.orgaoId,
        unidadeOrcamentariaId: dot.unidadeOrcamentariaId,
        funcaoId: dot.funcaoId,
        subfuncaoId: dot.subfuncaoId,
        programaId: dot.programaId,
        acaoId: dot.acaoId,
        naturezaDespesaId: dot.naturezaDespesaId,
        fonteRecursoId: dot.fonteRecursoId,
        valorAtual: Number(dot.valorAtual),
        acaoProgramaId: dot.acao?.programaId ?? dot.programaId,
        naturezaGrupo: dot.naturezaDespesa?.grupo ?? "",
      };

      const ctx: ContextoEmenda = {
        emenda: {
          tipo,
          valor: valorFinal,
          exercicioId,
          instrumentoBaseId: base.id,
          autorId: autor.id,
          objeto,
          justificativa: justificativaEmenda,
        },
        exercicioStatus: exercicio.status,
        instrumentoBaseStatus: "EM_TRAMITACAO",
        dotacao: dotCtx,
        dotacaoOrigem: null,
        dotacaoDestino: null,
        ppaCadastrado: !!ppa,
        programasNoPPA,
        prioridadesPrograma,
        prioridadesAcao,
        modoAderenciaLDO: "ALERTA",
        tetoValorAutor: TETO,
        somaAutorExistente: somaAutor,
        reservaSaudePct: RESERVA_PCT,
        modoReservaSaude: "ALERTA",
        emendaEhSaude: item.ehSaude,
        somaAutorDemaisExistente: somaDemais,
        // Base de 2025, anterior ao plano de trabalho simplificado: sem
        // categoria, o motor registra ALERTA em vez de reprovar retroativamente.
        modeloPlano: null,
        pendenciasPlanoTrabalho: [],
      };

      const resultado = avaliarEmenda(ctx);

      await prisma.validacaoEmenda.create({
        data: {
          emendaId: emenda.id,
          resultado: resultado.resultado,
          itens: resultado.itens as never,
        },
      });

      // O motor define VALIDA/INVALIDA. A partir daí, o avanço é decisão
      // humana — só emendas válidas seguem para submissão/parecer.
      let status: string = resultado.resultado;
      if (resultado.resultado === "VALIDA") {
        // No autor que estoura a cota, tudo fica SUBMETIDA: só assim o
        // acumulado do motor cresce (ele soma VALIDA + SUBMETIDA) e as
        // últimas emendas caem em INVALIDA de verdade.
        status = plano.nota.startsWith("ACIMA")
          ? "SUBMETIDA"
          : DESTINOS[seq % DESTINOS.length];
      }
      await prisma.emenda.update({ where: { id: emenda.id }, data: { status: status as never } });

      // Só conta para o acumulado o que o motor também contaria.
      if (status === "VALIDA" || status === "SUBMETIDA") {
        somaAutor += valorFinal;
        if (!item.ehSaude) somaDemais += valorFinal;
      }

      resumo[status] = (resumo[status] ?? 0) + 1;
      criadas++;
    }
  }

  // ------------------------------------------- fila de saneamento (INVALIDA)
  // Anulação acima do saldo da dotação: falha honesta na checagem
  // TIPO_COERENTE. Dá conteúdo real para a Análise Técnica e para o item
  // "emendas inválidas para saneamento" do farol.
  const SANEAMENTO = [
    { autorIdx: 1, dotIdx: 0, excedente: 40000 },
    { autorIdx: 4, dotIdx: 1, excedente: 25000 },
    { autorIdx: 7, dotIdx: 2, excedente: 60000 },
  ];
  for (const s of SANEAMENTO) {
    const autor = listaAutores[s.autorIdx];
    const dot = demais[s.dotIdx % demais.length];
    const valorExcedente = Number(dot.valorAtual) + s.excedente;
    seq++;
    const [tpl, benefNome] = OBJETOS_DEMAIS[s.dotIdx % OBJETOS_DEMAIS.length];
    const objetoSan = tpl.replace("{b}", benefNome);
    const justificativaSan =
      "Anulação parcial da dotação para realocar recursos conforme demanda apresentada em audiência pública.";

    const emenda = await prisma.emenda.create({
      data: {
        numero: `EM ${String(seq).padStart(3, "0")}/${ANO}`,
        exercicioId,
        instrumentoBaseId: base.id,
        autorId: autor.id,
        dotacaoId: dot.id,
        tipo: "ANULACAO",
        objeto: objetoSan,
        justificativa: justificativaSan,
        valor: valorExcedente,
        status: "RASCUNHO",
        beneficiarioId: benefId.get(benefNome) ?? null,
      },
    });

    const ctx: ContextoEmenda = {
      emenda: {
        tipo: "ANULACAO",
        valor: valorExcedente,
        exercicioId,
        instrumentoBaseId: base.id,
        autorId: autor.id,
        objeto: objetoSan,
        justificativa: justificativaSan,
      },
      exercicioStatus: exercicio.status,
      instrumentoBaseStatus: "EM_TRAMITACAO",
      dotacao: {
        id: dot.id,
        instrumentoId: dot.instrumentoId,
        exercicioId: dot.exercicioId,
        orgaoId: dot.orgaoId,
        unidadeOrcamentariaId: dot.unidadeOrcamentariaId,
        funcaoId: dot.funcaoId,
        subfuncaoId: dot.subfuncaoId,
        programaId: dot.programaId,
        acaoId: dot.acaoId,
        naturezaDespesaId: dot.naturezaDespesaId,
        fonteRecursoId: dot.fonteRecursoId,
        valorAtual: Number(dot.valorAtual),
        acaoProgramaId: dot.acao?.programaId ?? dot.programaId,
        naturezaGrupo: dot.naturezaDespesa?.grupo ?? "",
      },
      dotacaoOrigem: null,
      dotacaoDestino: null,
      ppaCadastrado: !!ppa,
      programasNoPPA,
      prioridadesPrograma,
      prioridadesAcao,
      modoAderenciaLDO: "ALERTA",
      tetoValorAutor: TETO,
      somaAutorExistente: 0,
      reservaSaudePct: RESERVA_PCT,
      modoReservaSaude: "ALERTA",
      emendaEhSaude: false,
      somaAutorDemaisExistente: 0,
      modeloPlano: null,
      pendenciasPlanoTrabalho: [],
    };

    const resultado = avaliarEmenda(ctx);
    await prisma.validacaoEmenda.create({
      data: {
        emendaId: emenda.id,
        resultado: resultado.resultado,
        itens: resultado.itens as never,
      },
    });
    await prisma.emenda.update({
      where: { id: emenda.id },
      data: { status: resultado.resultado as never },
    });
    resumo[resultado.resultado] = (resumo[resultado.resultado] ?? 0) + 1;
    criadas++;
  }

  const total = await prisma.emenda.aggregate({ _sum: { valor: true }, where: { exercicioId } });

  console.log("\nDataset de demonstração criado:");
  console.table({
    autores: listaAutores.length,
    beneficiarios: BENEFICIARIOS.length,
    normas: NORMAS.length,
    emendas: criadas,
    valorTotal: Number(total._sum.valor ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    }),
  });
  console.log("Status:", resumo);
  console.log("\nCenários plantados para o farol:");
  PLANOS.slice(0, listaAutores.length).forEach((p, i) => {
    if (p.nota !== "conforme") console.log(`  · ${listaAutores[i].nome} — ${p.nota}`);
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
