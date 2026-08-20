import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { avaliarEmenda, type ContextoEmenda, type DotacaoCtx } from "../src/lib/validation/motor";
import { categoriaPeloNome } from "../src/lib/beneficiarios-classificacao";

// ============================================================================
// EMENDAS DE DEMONSTRAÇÃO sobre a base real de 2027.
//
// ATENÇÃO: estas emendas são FICTÍCIAS, e é assim mesmo.
// As emendas de 2027 serão apresentadas entre outubro e dezembro de 2026,
// depois que a PLOA chegar à Câmara. Hoje (agosto/2026) elas não existem —
// e é justamente por não existirem que o sistema está sendo construído.
// Ver docs/better/08-dados-reais-mogi-guacu.md, seção 1.
//
// O que este seed dá é conteúdo para redesenhar as telas: sem emenda nenhuma,
// listagem, tramitação, placar e Vereador 360 são caixas vazias e o redesign
// fica cego. Cada emenda incide sobre uma DOTAÇÃO REAL da base 2027 e passa
// pelo MOTOR DE VALIDAÇÃO de verdade — o relatório de conformidade que aparece
// na tela é o que o motor realmente produziu, não um texto fabricado.
//
// É opcional de propósito: `npm run db:2027` sozinho deixa o exercício 2027 no
// estado verdadeiro de hoje (base carregada, zero emendas), que é o que a
// Câmara vai ver ao abrir o sistema pela primeira vez.
//
// Uso:  npm run db:2027:emendas
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

// Cota por autor. Bate com o TETO_VALOR_AUTOR que o seed-2027 grava:
// (RCL 2025 de R$ 926.030.562,09 × 1,2%) ÷ 13 vereadores. Art. 140 §6º e art.
// 11 §2º da Lei Orgânica de Mogi Guaçu. Se mudar aqui, mude lá também.
const TETO = 854_797.44;
const RESERVA_PCT = 50; // metade da cota reservada à saúde (LOM art. 140 §6º)
const LIMITE_DEMAIS = TETO * (1 - RESERVA_PCT / 100); // R$ 427.398,72

const VEREADORES = [
  "Adriana Bellintani", "Carlos Eduardo Prado", "Dalva Nogueira",
  "Edmilson Ferraz", "Fabiana Kobayashi", "Gilberto Moraes",
  "Helena Vasconcelos", "Ivo Salgueiro", "Juliana Rocha Lima",
  "Marcos Aurélio Tinoco", "Neusa Bezerra", "Rogério Pastore",
  "Sônia Marquesini",
];

const OBJETOS_SAUDE: [string, string][] = [
  ["Aquisição de equipamentos odontológicos para a {b}", "Santa Casa de Misericórdia de Mogi Guaçu"],
  ["Custeio de exames de imagem na {b}", "Santa Casa de Misericórdia de Mogi Guaçu"],
  ["Reforma da sala de acolhimento da {b}", "UBS Jardim Itamaraty"],
  ["Aquisição de veículo para visitas domiciliares vinculado à {b}", "UBS Parque Cidade Nova"],
  ["Ampliação do atendimento fisioterápico na {b}", "APAE Mogi Guaçu"],
  ["Aquisição de mobiliário clínico para o {b}", "Fundo Municipal de Saúde"],
  ["Custeio de medicamentos de dispensação excepcional pelo {b}", "Fundo Municipal de Saúde"],
  ["Aquisição de cadeiras de rodas para o {b}", "Lar dos Velhinhos São Vicente"],
  ["Aquisição de monitores multiparâmetro para o {b}", "Hospital Municipal Dr. Tabajara Ramos"],
  ["Custeio de plantões de pediatria no {b}", "Hospital Municipal Dr. Tabajara Ramos"],
];

const OBJETOS_DEMAIS: [string, string][] = [
  ["Aquisição de material didático para a {b}", "EMEB Professora Marta Ribeiro"],
  ["Reforma do parque infantil da {b}", "Creche Municipal Vila Esperança"],
  ["Aquisição de ônibus escolar para a {b}", "Secretaria Municipal de Educação"],
  ["Custeio de transporte de alunos da zona rural pela {b}", "Secretaria Municipal de Educação"],
  ["Aquisição de computadores para a {b}", "EMEB Professora Marta Ribeiro"],
  ["Instalação de cobertura na quadra da {b}", "EMEB Professora Marta Ribeiro"],
  ["Apoio às atividades socioeducativas da {b}", "Associação de Pais e Amigos do Bairro Ypê"],
  ["Aquisição de equipamentos de resgate para o {b}", "Corpo de Bombeiros — Posto Municipal"],
  ["Recapeamento de vias no entorno da {b}", "Creche Municipal Vila Esperança"],
  ["Instalação de iluminação em LED na área da {b}", "Associação de Pais e Amigos do Bairro Ypê"],
  // Administração indireta: autarquia e fundação municipal da base real de
  // Mogi Guaçu (órgãos 18 e 19 do orçamento).
  ["Aquisição de equipamentos de saneamento para o {b}", "SAMAE — Serviço Autônomo Municipal de Água e Esgoto"],
  ["Custeio de bolsas de estudo pela {b}", "FEG — Fundação Educacional Guaçuana"],
];

const JUSTIFICATIVAS = [
  "A demanda foi apresentada em audiência pública do bairro e consta das prioridades da LDO 2027.",
  "O equipamento atual está depreciado e compromete o atendimento à população da região.",
  "A entidade atende gratuitamente famílias em vulnerabilidade e não dispõe de recurso próprio para o investimento.",
  "A medida amplia a capacidade de atendimento sem gerar despesa continuada de pessoal.",
  "A destinação atende à política municipal do setor e observa a compatibilidade com o PPA 2026-2029.",
  "O pedido é reiterado da comunidade e foi objeto de indicação anterior desta Casa.",
];

const TIPOS = ["IMPOSITIVA", "ACRESCIMO", "IMPOSITIVA", "IMPOSITIVA", "ANULACAO"] as const;

// Destino do status DEPOIS do motor. O motor decide VALIDA/INVALIDA; daqui em
// diante é decisão humana (submeter, dar parecer, aprovar).
const DESTINOS = [
  "SUBMETIDA", "APROVADA", "APROVADA", "SUBMETIDA", "RASCUNHO",
  "APROVADA", "SUBMETIDA", "REJEITADA", "APROVADA", "EM_TRAMITACAO",
] as const;

// Plano por autor: quanto vai para saúde e quanto para as demais áreas.
// Cota 1.000.000; reserva 50% → as demais áreas não podem passar de 500.000.
// A distribuição é deliberada para acender cada estado do farol de conformidade.
type Plano = { saude: number[]; demais: number[]; nota: string };

// Cota de R$ 854.797,44 por vereador; reserva de 50% → as demais áreas não
// podem passar de R$ 427.398,72.
//
// A distribuição é deliberada: a maioria dos autores fica conforme, e três
// casos acendem cada estado do farol. Demonstração em que TUDO estoura não
// demonstra nada — o que vende é a ferramenta pegando o problema no meio do
// que está certo. Os dois desvios estão ISOLADOS de propósito: quem estoura a
// cota respeita a reserva, e quem invade a reserva cabe na cota, para que o
// relatório aponte uma causa por vez.
const PLANOS: Plano[] = [
  { saude: [250000, 170000], demais: [230000, 180000], nota: "conforme" },
  { saude: [300000], demais: [220000, 200000], nota: "conforme" },
  { saude: [260000, 160000], demais: [427000], nota: "conforme, no limite da reserva" },
  { saude: [180000], demais: [150000], nota: "cota subutilizada" },
  { saude: [300000, 120000], demais: [250000, 170000], nota: "conforme" },
  // Cabe na cota (R$ 680.000), mas as demais áreas somam R$ 480.000 contra o
  // limite de R$ 427.398,72: acende RESERVA_SAUDE sozinho.
  { saude: [200000], demais: [480000], nota: "INVADE a reserva da saúde" },
  { saude: [240000, 180000], demais: [230000, 190000], nota: "conforme" },
  // Soma R$ 900.000 contra cota de R$ 854.797,44: acende LIMITE_VALOR_AUTOR
  // sozinho — as demais áreas (R$ 400.000) respeitam a reserva.
  { saude: [500000], demais: [400000], nota: "ACIMA da cota" },
  { saude: [150000, 110000], demais: [190000], nota: "cota subutilizada" },
  { saude: [280000, 140000], demais: [240000, 180000], nota: "conforme" },
  { saude: [330000], demais: [180000, 150000], nota: "conforme" },
  { saude: [220000, 200000], demais: [300000, 120000], nota: "conforme" },
  { saude: [430000], demais: [420000], nota: "conforme, no limite da cota" },
];

function rng(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(20271231);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });


// ---------------------------------------------------------------------------
// Plano de trabalho simplificado da emenda de demonstração.
//
// Terceiro setor leva o pacote completo (justificativa, objetivo, declaração e
// planilha); administração direta e indireta, só a justificativa. A planilha é
// montada em duas linhas cujo total fecha EXATAMENTE com o valor da emenda —
// se não fechasse, a própria pré-checagem apontaria, e a demonstração abriria
// com uma pendência que não é o ponto.
// ---------------------------------------------------------------------------
async function criarPlano(
  emendaId: string,
  categoria: string,
  valor: number,
  objeto: string,
) {
  const terceiroSetor = categoria === "TERCEIRO_SETOR";
  const primeira = Math.floor(valor * 0.6 * 100) / 100;
  const segunda = Math.round((valor - primeira) * 100) / 100;

  await prisma.planoTrabalho.create({
    data: {
      emendaId,
      justificativa:
        `Os recursos serão aplicados integralmente em ${objeto.toLowerCase()}, ` +
        "conforme demanda registrada e sem gerar despesa continuada de pessoal.",
      objetivo: terceiroSetor
        ? `Executar ${objeto.toLowerCase()} no exercício, com prestação de contas ` +
          "ao órgão concessor na forma da legislação aplicável."
        : "",
      declaracaoAceita: terceiroSetor,
      preenchidoPor: terceiroSetor ? "Entidade beneficiária" : "Gabinete do vereador",
      preenchidoEm: new Date(0),
      ...(terceiroSetor && valor > 0
        ? {
            itens: {
              create: [
                { ordem: 1, descricao: "Aquisição de itens e materiais do objeto", quantidade: 1, valorUnitario: primeira },
                { ordem: 2, descricao: "Serviços e despesas acessórias do objeto", quantidade: 1, valorUnitario: segunda },
              ],
            },
          }
        : {}),
    },
  });
}

async function main() {
  const exercicio = await prisma.exercicio.findUnique({ where: { ano: ANO } });
  if (!exercicio) throw new Error(`Exercício ${ANO} não existe — rode 'npm run db:2027' antes.`);
  const exercicioId = exercicio.id;

  const base = await prisma.instrumentoPlanejamento.findFirst({
    where: { exercicioId, especie: "PROJETO_LEI", tipo: "LOA" },
  });
  if (!base) throw new Error("Sem PLOA no exercício 2027 — rode 'npm run db:2027' antes.");

  const jaExistem = await prisma.emenda.count({ where: { exercicioId } });
  if (jaExistem > 0) {
    console.log(`Exercício ${ANO} já tem ${jaExistem} emendas — nada a fazer.`);
    console.log("Para regerar: apague as emendas de 2027 antes.");
    return;
  }

  // ------------------------------------------------------------------ autores
  const autores = [];
  for (const nome of VEREADORES) {
    const ja = await prisma.autor.findFirst({ where: { nome } });
    autores.push(ja ?? (await prisma.autor.create({ data: { nome, cargo: "Vereador(a)" } })));
  }

  // ----------------------------------------------------------- beneficiários
  const nomesBenef = new Set([
    ...OBJETOS_SAUDE.map(([, b]) => b),
    ...OBJETOS_DEMAIS.map(([, b]) => b),
  ]);
  const benefId = new Map<string, string>();
  const categoriaBenef = new Map<string, string>();
  for (const nome of nomesBenef) {
    // Categoria do beneficiário — define o rito do plano de trabalho.
    // Mesma classificação que a aplicação usa, para o seed não inventar uma
    // regra própria (foi assim que a divergência do PPA passou despercebida).
    const tipo = categoriaPeloNome(nome);
    categoriaBenef.set(nome, tipo);
    const r = await prisma.beneficiario.upsert({
      where: { nome },
      create: { nome, tipo: tipo as never },
      update: {},
    });
    benefId.set(nome, r.id);
  }

  // ---------------------------------------------- dotações reais, por área
  // Saúde = função 10. As emendas de saúde só podem cair em dotação de saúde,
  // senão a separação saúde × demais áreas do farol não significa nada.
  // Ordenação explícita e pela CLASSIFICAÇÃO, não por id. Sem orderBy o
  // Postgres não garante a ordem das linhas e o sorteio cai em dotações
  // diferentes a cada execução — o que anularia o PRNG de semente fixa. E por
  // id não serve: id é cuid, muda toda vez que a base é recarregada. Os códigos
  // orçamentários são estáveis entre recargas.
  const dotacoes = await prisma.dotacao.findMany({
    where: { instrumentoId: base.id },
    orderBy: [
      { orgao: { codigo: "asc" } },
      { unidadeOrcamentaria: { codigo: "asc" } },
      { programa: { codigo: "asc" } },
      { acao: { codigo: "asc" } },
      { naturezaDespesa: { codigo: "asc" } },
      { fonteRecurso: { codigo: "asc" } },
    ],
    include: {
      funcao: { select: { codigo: true } },
      acao: { select: { programaId: true } },
      naturezaDespesa: { select: { grupo: true } },
    },
  });
  const saude = dotacoes.filter((d) => d.funcao.codigo === "10");
  const demais = dotacoes.filter((d) => d.funcao.codigo !== "10");
  if (!saude.length || !demais.length) throw new Error("Base 2027 sem dotações suficientes.");
  console.log(`Dotações disponíveis: ${saude.length} de saúde · ${demais.length} demais áreas`);

  // ------------------------------------------- contexto fixo do motor (PPA/LDO)
  const ppa = await prisma.instrumentoPlanejamento.findFirst({
    where: { exercicioId, tipo: "PPA" },
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
  const prioridadesAcao = new Set(
    prioridades.map((p) => p.acaoId).filter((x): x is string => !!x),
  );

  // ----------------------------------------------------------------- emendas
  const resumo: Record<string, number> = {};
  let seq = 0;
  let criadas = 0;

  for (let i = 0; i < autores.length && i < PLANOS.length; i++) {
    const autor = autores[i];
    const plano = PLANOS[i];
    const itens = [
      ...plano.saude.map((valor) => ({ valor, ehSaude: true })),
      ...plano.demais.map((valor) => ({ valor, ehSaude: false })),
    ];

    let somaAutor = 0;
    let somaDemais = 0;

    for (const item of itens) {
      seq++;
      const dot = item.ehSaude ? pick(saude) : pick(demais);
      const [tpl, benefNome] = item.ehSaude ? pick(OBJETOS_SAUDE) : pick(OBJETOS_DEMAIS);
      const objeto = tpl.replace("{b}", benefNome);
      const tipo = pick([...TIPOS]);
      // ANULACAO não pode exceder o saldo da dotação.
      const valorFinal =
        tipo === "ANULACAO" ? Math.min(item.valor, Number(dot.valorAtual)) : item.valor;

      const justificativa = pick(JUSTIFICATIVAS);
      const categoria = categoriaBenef.get(benefNome) ?? "ADMINISTRACAO_DIRETA";

      const emenda = await prisma.emenda.create({
        data: {
          numero: `EM ${String(seq).padStart(3, "0")}/${ANO}`,
          exercicioId,
          instrumentoBaseId: base.id,
          autorId: autor.id,
          dotacaoId: dot.id,
          tipo,
          objeto,
          justificativa,
          valor: valorFinal,
          status: "RASCUNHO",
          beneficiarioId: benefId.get(benefNome) ?? null,
        },
      });

      await criarPlano(emenda.id, categoria, valorFinal, objeto);

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
        naturezaGrupo: dot.naturezaDespesa.grupo,
      };

      const ctx: ContextoEmenda = {
        emenda: {
          tipo, valor: valorFinal, exercicioId,
          instrumentoBaseId: base.id, autorId: autor.id,
          objeto, justificativa,
        },
        exercicioStatus: exercicio.status,
        instrumentoBaseStatus: base.status,
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
        modoReservaSaude: "BLOQUEANTE",
        emendaEhSaude: item.ehSaude,
        somaAutorDemaisExistente: somaDemais,
        beneficiarioCategoria: categoria,
        // O plano acabou de ser criado completo para esta categoria.
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

      let status: string = resultado.resultado;
      if (resultado.resultado === "VALIDA") {
        // No autor que estoura a cota, tudo fica SUBMETIDA: só assim o
        // acumulado que o motor consulta cresce e as últimas caem em INVALIDA
        // de verdade, em vez de por acaso.
        status = plano.nota.startsWith("ACIMA")
          ? "SUBMETIDA"
          : DESTINOS[seq % DESTINOS.length];
      }
      await prisma.emenda.update({
        where: { id: emenda.id },
        data: { status: status as never },
      });

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
  //
  // Duas escolhas deliberadas para o farol não mentir:
  //  - vão para os autores com folga (índices 3, 8 e 10). O painel soma TODAS
  //    as emendas do exercício contra a cota, inclusive as inválidas; jogadas
  //    num autor no limite, empurrariam o farol dele para vermelho por um
  //    motivo que não é o dele.
  //  - incidem sobre as dotações de MENOR saldo, para o valor da anulação ser
  //    pequeno. O que precisa estourar aqui é o saldo da dotação, não a cota.
  const SANEAMENTO = [
    { autorIdx: 3, dotIdx: 0, excedente: 40000 },
    { autorIdx: 8, dotIdx: 1, excedente: 25000 },
    { autorIdx: 10, dotIdx: 2, excedente: 60000 },
  ];
  const demaisMenorSaldo = [...demais].sort(
    (a, b) => Number(a.valorAtual) - Number(b.valorAtual),
  );
  for (const s of SANEAMENTO) {
    const autor = autores[s.autorIdx];
    const dot = demaisMenorSaldo[s.dotIdx % demaisMenorSaldo.length];
    const valorExcedente = Number(dot.valorAtual) + s.excedente;
    seq++;
    const [tpl, benefNome] = OBJETOS_DEMAIS[s.dotIdx % OBJETOS_DEMAIS.length];

    const objetoSan = tpl.replace("{b}", benefNome);
    const justificativaSan =
      "Anulação parcial da dotação para realocar recursos conforme demanda " +
      "apresentada em audiência pública.";

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

    const resultado = avaliarEmenda({
      emenda: {
        tipo: "ANULACAO", valor: valorExcedente, exercicioId,
        instrumentoBaseId: base.id, autorId: autor.id,
        objeto: objetoSan,
        justificativa: justificativaSan,
      },
      exercicioStatus: exercicio.status,
      instrumentoBaseStatus: base.status,
      dotacao: {
        id: dot.id, instrumentoId: dot.instrumentoId, exercicioId: dot.exercicioId,
        orgaoId: dot.orgaoId, unidadeOrcamentariaId: dot.unidadeOrcamentariaId,
        funcaoId: dot.funcaoId, subfuncaoId: dot.subfuncaoId,
        programaId: dot.programaId, acaoId: dot.acaoId,
        naturezaDespesaId: dot.naturezaDespesaId, fonteRecursoId: dot.fonteRecursoId,
        valorAtual: Number(dot.valorAtual),
        acaoProgramaId: dot.acao?.programaId ?? dot.programaId,
        naturezaGrupo: dot.naturezaDespesa.grupo,
      },
      dotacaoOrigem: null, dotacaoDestino: null,
      ppaCadastrado: !!ppa, programasNoPPA, prioridadesPrograma, prioridadesAcao,
      modoAderenciaLDO: "ALERTA",
      tetoValorAutor: TETO, somaAutorExistente: 0,
      reservaSaudePct: RESERVA_PCT, modoReservaSaude: "BLOQUEANTE",
      emendaEhSaude: false, somaAutorDemaisExistente: 0,
      beneficiarioCategoria: categoriaBenef.get(benefNome) ?? "ADMINISTRACAO_DIRETA",
      pendenciasPlanoTrabalho: [],
    });

    await criarPlano(
      emenda.id,
      categoriaBenef.get(benefNome) ?? "ADMINISTRACAO_DIRETA",
      valorExcedente,
      objetoSan,
    );
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

  const soma = await prisma.emenda.aggregate({
    where: { exercicioId },
    _sum: { valor: true },
  });

  console.log(`\n${criadas} emendas criadas para ${ANO} · ${autores.length} autores`);
  console.log(`Valor total indicado: ${brl(Number(soma._sum.valor ?? 0))}`);
  console.log("Situações:", resumo);
  console.log(
    `\nCota usada: ${brl(TETO)} por autor · limite das demais áreas ` +
    `${brl(LIMITE_DEMAIS)} (art. 140 §6º da LOM: 1,2% da RCL, metade em saúde).`,
  );
  console.log("Emendas FICTÍCIAS sobre dotações reais. As de 2027 só serão");
  console.log("apresentadas depois que a PLOA chegar à Câmara, em out-dez/2026.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
