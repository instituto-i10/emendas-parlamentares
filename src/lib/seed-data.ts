import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";
import { nomeNatureza } from "./naturezas-nomes";

// Dados de um município fictício (exercício 2025). Compartilhado entre o script
// `npm run seed` e a rota de bootstrap. Prisma aceita number em campos Decimal.

const orgaos = [
  { codigo: "02", nome: "Governo Municipal", uo: { codigo: "02.01", nome: "Gabinete do Prefeito" } },
  { codigo: "08", nome: "Secretaria de Educação", uo: { codigo: "08.01", nome: "Departamento de Educação" } },
  { codigo: "10", nome: "Secretaria de Saúde", uo: { codigo: "10.01", nome: "Fundo Municipal de Saúde" } },
];
const funcoes = [
  { codigo: "04", nome: "Administração", subs: [{ codigo: "122", nome: "Administração Geral" }] },
  { codigo: "12", nome: "Educação", subs: [{ codigo: "361", nome: "Ensino Fundamental" }, { codigo: "365", nome: "Educação Infantil" }] },
  { codigo: "10", nome: "Saúde", subs: [{ codigo: "301", nome: "Atenção Básica" }] },
];
const programas = [
  { codigo: "0001", nome: "Gestão Administrativa" },
  { codigo: "0012", nome: "Educação para Todos" },
  { codigo: "0013", nome: "Primeira Infância" },
  { codigo: "0010", nome: "Saúde da Família" },
  { codigo: "0099", nome: "Encargos Gerais" },
];
const acoes = [
  { codigo: "2001", nome: "Manutenção da Gestão Administrativa", tipo: "ATIVIDADE", org: "02", uo: "02.01", fun: "04", sub: "122", prog: "0001" },
  { codigo: "2002", nome: "Comunicação Institucional", tipo: "ATIVIDADE", org: "02", uo: "02.01", fun: "04", sub: "122", prog: "0001" },
  { codigo: "1001", nome: "Modernização Administrativa", tipo: "PROJETO", org: "02", uo: "02.01", fun: "04", sub: "122", prog: "0001" },
  { codigo: "2012", nome: "Manutenção do Ensino Fundamental", tipo: "ATIVIDADE", org: "08", uo: "08.01", fun: "12", sub: "361", prog: "0012" },
  { codigo: "2013", nome: "Transporte Escolar", tipo: "ATIVIDADE", org: "08", uo: "08.01", fun: "12", sub: "361", prog: "0012" },
  { codigo: "1012", nome: "Construção de Escola", tipo: "PROJETO", org: "08", uo: "08.01", fun: "12", sub: "361", prog: "0012" },
  { codigo: "2015", nome: "Manutenção da Educação Infantil", tipo: "ATIVIDADE", org: "08", uo: "08.01", fun: "12", sub: "365", prog: "0013" },
  { codigo: "1013", nome: "Construção de Creche", tipo: "PROJETO", org: "08", uo: "08.01", fun: "12", sub: "365", prog: "0013" },
  { codigo: "2010", nome: "Manutenção da Atenção Básica", tipo: "ATIVIDADE", org: "10", uo: "10.01", fun: "10", sub: "301", prog: "0010" },
  { codigo: "2011", nome: "Programa Saúde da Família", tipo: "ATIVIDADE", org: "10", uo: "10.01", fun: "10", sub: "301", prog: "0010" },
  { codigo: "1010", nome: "Construção de UBS", tipo: "PROJETO", org: "10", uo: "10.01", fun: "10", sub: "301", prog: "0010" },
  { codigo: "0099", nome: "Encargos Gerais do Município", tipo: "OPERACAO_ESPECIAL", org: "02", uo: "02.01", fun: "04", sub: "122", prog: "0099" },
];
const naturezas = [
  { codigo: "3.3.90.30", cat: "3", grupo: "3", mod: "90", elem: "30" },
  { codigo: "3.1.90.11", cat: "3", grupo: "1", mod: "90", elem: "11" },
  { codigo: "4.4.90.52", cat: "4", grupo: "4", mod: "90", elem: "52" },
];
const fontes = [
  { codigo: "500", nome: "Recursos Ordinários" },
  { codigo: "600", nome: "Transferências e Convênios" },
];

export async function semear(prisma: PrismaClient) {
  const exercicio = await prisma.exercicio.upsert({
    where: { ano: 2025 },
    create: { ano: 2025, status: "ABERTO" },
    update: { status: "ABERTO" },
  });
  const exercicioId = exercicio.id;

  const instrumento = await prisma.instrumentoPlanejamento.upsert({
    where: { id: "seed-pl-loa-2025" },
    create: {
      id: "seed-pl-loa-2025",
      tipo: "LOA",
      especie: "PROJETO_LEI",
      numero: "PL 45/2024",
      ementa: "Estima a receita e fixa a despesa do Município para o exercício de 2025.",
      exercicioId,
      status: "EM_TRAMITACAO",
    },
    update: {},
  });

  const orgaoId = new Map<string, string>();
  const uoId = new Map<string, string>();
  for (const o of orgaos) {
    const r = await prisma.orgao.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: o.codigo } },
      create: { codigo: o.codigo, nome: o.nome, exercicioId },
      update: { nome: o.nome },
    });
    orgaoId.set(o.codigo, r.id);
    const uo = await prisma.unidadeOrcamentaria.upsert({
      where: { exercicioId_orgaoId_codigo: { exercicioId, orgaoId: r.id, codigo: o.uo.codigo } },
      create: { codigo: o.uo.codigo, nome: o.uo.nome, orgaoId: r.id, exercicioId },
      update: { nome: o.uo.nome },
    });
    uoId.set(o.uo.codigo, uo.id);
  }

  const funcaoId = new Map<string, string>();
  const subId = new Map<string, string>();
  for (const f of funcoes) {
    const r = await prisma.funcao.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: f.codigo } },
      create: { codigo: f.codigo, nome: f.nome, exercicioId },
      update: { nome: f.nome },
    });
    funcaoId.set(f.codigo, r.id);
    for (const s of f.subs) {
      const sr = await prisma.subfuncao.upsert({
        where: { exercicioId_funcaoId_codigo: { exercicioId, funcaoId: r.id, codigo: s.codigo } },
        create: { codigo: s.codigo, nome: s.nome, funcaoId: r.id, exercicioId },
        update: { nome: s.nome },
      });
      subId.set(`${f.codigo}:${s.codigo}`, sr.id);
    }
  }

  const programaId = new Map<string, string>();
  for (const p of programas) {
    const r = await prisma.programa.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: p.codigo } },
      create: { codigo: p.codigo, nome: p.nome, exercicioId },
      update: { nome: p.nome },
    });
    programaId.set(p.codigo, r.id);
  }

  const acaoId = new Map<string, string>();
  for (const a of acoes) {
    const r = await prisma.acao.upsert({
      where: { exercicioId_programaId_codigo: { exercicioId, programaId: programaId.get(a.prog)!, codigo: a.codigo } },
      create: { codigo: a.codigo, nome: a.nome, tipo: a.tipo as never, programaId: programaId.get(a.prog)!, exercicioId },
      update: { nome: a.nome },
    });
    acaoId.set(a.codigo, r.id);
  }

  const naturezaId = new Map<string, string>();
  for (const n of naturezas) {
    const r = await prisma.naturezaDespesa.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: n.codigo } },
      create: { codigo: n.codigo, categoriaEconomica: n.cat, grupo: n.grupo, modalidadeAplicacao: n.mod, elemento: n.elem, nome: nomeNatureza(n.codigo), exercicioId },
      update: {},
    });
    naturezaId.set(n.codigo, r.id);
  }
  const fonteId = new Map<string, string>();
  for (const f of fontes) {
    const r = await prisma.fonteRecurso.upsert({
      where: { exercicioId_codigo: { exercicioId, codigo: f.codigo } },
      create: { codigo: f.codigo, nome: f.nome, exercicioId },
      update: { nome: f.nome },
    });
    fonteId.set(f.codigo, r.id);
  }

  let totalDot = 0;
  for (let i = 0; i < acoes.length; i++) {
    const a = acoes[i];
    const combos = i < 8 ? [0, 2] : [0];
    for (const idx of combos) {
      const nat = naturezas[idx % naturezas.length];
      const fon = fontes[idx % fontes.length];
      const valor = 50000 + i * 10000 + idx * 5000;
      await prisma.dotacao.upsert({
        where: {
          instrumentoId_orgaoId_unidadeOrcamentariaId_funcaoId_subfuncaoId_programaId_acaoId_naturezaDespesaId_fonteRecursoId: {
            instrumentoId: instrumento.id,
            orgaoId: orgaoId.get(a.org)!,
            unidadeOrcamentariaId: uoId.get(a.uo)!,
            funcaoId: funcaoId.get(a.fun)!,
            subfuncaoId: subId.get(`${a.fun}:${a.sub}`)!,
            programaId: programaId.get(a.prog)!,
            acaoId: acaoId.get(a.codigo)!,
            naturezaDespesaId: naturezaId.get(nat.codigo)!,
            fonteRecursoId: fonteId.get(fon.codigo)!,
          },
        },
        create: {
          instrumentoId: instrumento.id,
          exercicioId,
          orgaoId: orgaoId.get(a.org)!,
          unidadeOrcamentariaId: uoId.get(a.uo)!,
          funcaoId: funcaoId.get(a.fun)!,
          subfuncaoId: subId.get(`${a.fun}:${a.sub}`)!,
          programaId: programaId.get(a.prog)!,
          acaoId: acaoId.get(a.codigo)!,
          naturezaDespesaId: naturezaId.get(nat.codigo)!,
          fonteRecursoId: fonteId.get(fon.codigo)!,
          valorInicial: valor,
          valorAtual: valor,
        },
        update: { valorInicial: valor, valorAtual: valor },
      });
      totalDot++;
    }
  }

  await prisma.prioridadeLDO.deleteMany({ where: { exercicioId } });
  await prisma.prioridadeLDO.createMany({
    data: [
      { descricao: "Universalizar o ensino fundamental", programaId: programaId.get("0012")!, acaoId: acaoId.get("2012")!, exercicioId },
      { descricao: "Ampliar vagas na educação infantil", programaId: programaId.get("0013")!, acaoId: acaoId.get("2015")!, exercicioId },
      { descricao: "Fortalecer a atenção básica em saúde", programaId: programaId.get("0010")!, exercicioId },
    ],
  });

  const params: { chave: string; valor: string; modo: "BLOQUEANTE" | "ALERTA" }[] = [
    { chave: "TETO_VALOR_AUTOR", valor: "500000", modo: "BLOQUEANTE" },
    { chave: "PERCENTUAL_IMPOSITIVO", valor: "1.5", modo: "ALERTA" },
    { chave: "ADERENCIA_LDO", valor: "true", modo: "ALERTA" },
    { chave: "RESERVA_SAUDE_PERCENTUAL", valor: "50", modo: "ALERTA" },
  ];
  for (const p of params) {
    const existente = await prisma.parametroValidacao.findFirst({ where: { exercicioId: null, chave: p.chave } });
    if (existente) {
      await prisma.parametroValidacao.update({ where: { id: existente.id }, data: { valor: p.valor, modo: p.modo } });
    } else {
      await prisma.parametroValidacao.create({ data: { escopo: "GERAL", chave: p.chave, valor: p.valor, modo: p.modo } });
    }
  }

  // --------------------------------------------------- Perfis de acesso (P12)
  // Os 5 perfis base. Idempotente por nome: reaplicar realinha as permissões
  // sem trocar o id, então os vínculos de usuário continuam valendo.
  const perfisBase = [
    {
      nome: "Administrador Geral",
      descricao:
        "Acesso total ao sistema. Único perfil que compõe novos perfis de acesso.",
      poder: null,
      apresentarEmendas: true,
      gerirTodasEmendas: true,
      tramitarEmendas: true,
      gerirPlanejamento: true,
      gerirExercicios: true,
      administrarConfiguracoes: true,
      analisarViabilidade: true,
      registrarExecucao: true,
      adminGeral: true,
    },
    {
      nome: "Vereador",
      descricao:
        "Gabinete parlamentar: apresenta e gere as emendas de própria autoria, dentro da sua cota.",
      poder: "LEGISLATIVO",
      apresentarEmendas: true,
      gerirTodasEmendas: false,
      tramitarEmendas: false,
      gerirPlanejamento: false,
      gerirExercicios: false,
      administrarConfiguracoes: false,
      analisarViabilidade: false,
      registrarExecucao: false,
      adminGeral: false,
    },
    {
      nome: "Comissão de Finanças e Orçamento",
      descricao:
        "Conduz a análise técnica: gere qualquer emenda do exercício e aprova ou rejeita com parecer.",
      poder: "LEGISLATIVO",
      apresentarEmendas: false,
      gerirTodasEmendas: true,
      tramitarEmendas: true,
      gerirPlanejamento: false,
      gerirExercicios: false,
      administrarConfiguracoes: false,
      analisarViabilidade: false,
      registrarExecucao: false,
      adminGeral: false,
    },
    {
      nome: "Presidente da Câmara",
      descricao:
        "Soma as capacidades do vereador e da comissão, mais a administração do Legislativo.",
      poder: "LEGISLATIVO",
      apresentarEmendas: true,
      gerirTodasEmendas: true,
      tramitarEmendas: true,
      gerirPlanejamento: false,
      gerirExercicios: true,
      administrarConfiguracoes: true,
      analisarViabilidade: false,
      registrarExecucao: false,
      adminGeral: false,
    },
    {
      nome: "Poder Executivo",
      descricao:
        "Instrumentos de planejamento, base de dotações e lei aprovada; analisa a viabilidade técnica e lança a execução orçamentária das emendas.",
      poder: "EXECUTIVO",
      apresentarEmendas: false,
      gerirTodasEmendas: false,
      tramitarEmendas: false,
      gerirPlanejamento: true,
      gerirExercicios: true,
      administrarConfiguracoes: true,
      analisarViabilidade: true,
      registrarExecucao: true,
      adminGeral: false,
    },
  ];

  const perfilPorNome = new Map<string, string>();
  for (const p of perfisBase) {
    const dados = { ...p, poder: p.poder as never, perfilDoSistema: true };
    const salvo = await prisma.perfilAcesso.upsert({
      where: { nome: p.nome },
      create: dados,
      update: dados,
    });
    perfilPorNome.set(p.nome, salvo.id);
  }

  // ------------------------------------------------------- Contas de demonstração
  // Uma por perfil. As 6 contas do esquema antigo saem de cena: Autor e
  // AuditLog são SET NULL, então nenhuma emenda ou trilha se perde no caminho.
  const senhaHash = await bcrypt.hash("mudar@123", 10);
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "exec.admin@municipio.gov.br",
          "planejamento@municipio.gov.br",
          "exec.consulta@municipio.gov.br",
          "mesa@camara.gov.br",
          "analista@camara.gov.br",
          "leg.consulta@camara.gov.br",
        ],
      },
    },
  });

  const usuarios: { nome: string; email: string; perfil: string }[] = [
    { nome: "Administrador", email: "super@municipio.gov.br", perfil: "Administrador Geral" },
    { nome: "Poder Executivo", email: "executivo@municipio.gov.br", perfil: "Poder Executivo" },
    { nome: "Presidente da Câmara", email: "presidente@camara.gov.br", perfil: "Presidente da Câmara" },
    { nome: "Comissão de Finanças", email: "comissao@camara.gov.br", perfil: "Comissão de Finanças e Orçamento" },
    { nome: "Vereador Exemplo", email: "vereador@camara.gov.br", perfil: "Vereador" },
  ];
  for (const u of usuarios) {
    const perfilId = perfilPorNome.get(u.perfil)!;
    const poder = perfisBase.find((p) => p.nome === u.perfil)!.poder;
    const dados = {
      name: u.nome,
      poder: poder as never,
      perfilId,
      passwordHash: senhaHash,
    };
    await prisma.user.upsert({
      where: { email: u.email },
      create: { email: u.email, ...dados },
      update: dados,
    });
  }

  // Só o Vereador tem Autor vinculado: é quem apresenta emenda em nome próprio.
  const vereador = await prisma.user.findUnique({ where: { email: "vereador@camara.gov.br" } });
  if (vereador) {
    const autorExistente = await prisma.autor.findFirst({ where: { usuarioId: vereador.id } });
    if (!autorExistente) {
      await prisma.autor.create({ data: { nome: "Vereador Exemplo", cargo: "Vereador", usuarioId: vereador.id } });
    }
  }

  return { exercicio: 2025, dotacoes: totalDot, usuarios: usuarios.length };
}
