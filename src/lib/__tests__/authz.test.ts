import { describe, expect, it } from "vitest";
import { Poder } from "@/generated/prisma/enums";
import {
  alcancaPoder,
  ehConsulta,
  podeAcessar,
  podeAnalisarViabilidade,
  podeAtribuirPerfil,
  podeCriarEmenda,
  podeGerirEmenda,
  podeGerirPerfis,
  podeGerirPlanejamento,
  podeRegistrarExecucao,
  podeTramitar,
  podeVerTodasEmendas,
  temPermissao,
  type Ator,
  type Permissao,
  type Perfil,
} from "../authz";
import { modulosVisiveis, NAVEGACAO } from "@/config/navegacao";
import { vistaInicial, vistasVisiveis } from "@/config/vistas360";

// ============================================================================
// Suíte de autorização por PERFIL (PROMPT 12). Reproduz os 5 perfis base e
// verifica, para cada um, o que enxerga e o que executa — inclusive as
// tentativas de chamada direta, que devem ser negadas no servidor.
// ============================================================================

function perfil(
  nome: string,
  poder: Poder | null,
  permissoes: Permissao[],
  extra: Partial<Perfil> = {}
): Perfil {
  return {
    id: `perfil-${nome}`,
    nome,
    poder,
    adminGeral: false,
    perfilDoSistema: true,
    apresentarEmendas: permissoes.includes("apresentarEmendas"),
    gerirTodasEmendas: permissoes.includes("gerirTodasEmendas"),
    tramitarEmendas: permissoes.includes("tramitarEmendas"),
    gerirPlanejamento: permissoes.includes("gerirPlanejamento"),
    gerirExercicios: permissoes.includes("gerirExercicios"),
    administrarConfiguracoes: permissoes.includes("administrarConfiguracoes"),
    analisarViabilidade: permissoes.includes("analisarViabilidade"),
    registrarExecucao: permissoes.includes("registrarExecucao"),
    ...extra,
  };
}

const P = {
  adminGeral: perfil("Administrador Geral", null, [], { adminGeral: true }),
  vereador: perfil("Vereador", Poder.LEGISLATIVO, ["apresentarEmendas"]),
  comissao: perfil("Comissão de Finanças e Orçamento", Poder.LEGISLATIVO, [
    "gerirTodasEmendas",
    "tramitarEmendas",
  ]),
  presidente: perfil("Presidente da Câmara", Poder.LEGISLATIVO, [
    "apresentarEmendas",
    "gerirTodasEmendas",
    "tramitarEmendas",
    "gerirExercicios",
    "administrarConfiguracoes",
  ]),
  executivo: perfil("Poder Executivo", Poder.EXECUTIVO, [
    "gerirPlanejamento",
    "gerirExercicios",
    "administrarConfiguracoes",
    "analisarViabilidade",
    "registrarExecucao",
  ]),
  consultaLeg: perfil("Consulta Legislativo", Poder.LEGISLATIVO, []),
};

const ator = (p: Perfil | null, id = "u1"): Ator => ({ id, perfil: p });

const SEM_PERFIL = ator(null);
const A = {
  adminGeral: ator(P.adminGeral),
  vereador: ator(P.vereador, "user-vereador"),
  comissao: ator(P.comissao),
  presidente: ator(P.presidente),
  executivo: ator(P.executivo),
  consultaLeg: ator(P.consultaLeg),
};

describe("conta sem perfil", () => {
  it("não passa por nenhuma verificação", () => {
    expect(temPermissao(SEM_PERFIL, "apresentarEmendas")).toBe(false);
    expect(alcancaPoder(SEM_PERFIL, Poder.LEGISLATIVO)).toBe(false);
    expect(alcancaPoder(SEM_PERFIL, "TRANSVERSAL")).toBe(false);
    expect(podeCriarEmenda(SEM_PERFIL)).toBe(false);
    expect(podeAcessar(SEM_PERFIL, { poder: "TRANSVERSAL" })).toBe(false);
    expect(modulosVisiveis(SEM_PERFIL)).toHaveLength(0);
    expect(vistasVisiveis(SEM_PERFIL)).toHaveLength(0);
  });
});

describe("separação de Poderes é estrutural", () => {
  it("perfil do Executivo não alcança módulo do Legislativo, e vice-versa", () => {
    expect(alcancaPoder(A.executivo, Poder.LEGISLATIVO)).toBe(false);
    expect(alcancaPoder(A.comissao, Poder.EXECUTIVO)).toBe(false);
  });

  it("a permissão sozinha não abre o módulo do outro Poder", () => {
    // Perfil do Executivo com permissão de tramitar: a permissão existe, mas o
    // Poder não alcança — a verificação de Poder vem antes.
    const intruso = ator(
      perfil("Executivo com tramitação", Poder.EXECUTIVO, ["tramitarEmendas"])
    );
    expect(temPermissao(intruso, "tramitarEmendas")).toBe(true);
    expect(podeTramitar(intruso)).toBe(false);
  });

  it("perfil transversal atravessa os dois Poderes", () => {
    const transversal = ator(perfil("Auditoria", null, ["gerirTodasEmendas"]));
    expect(alcancaPoder(transversal, Poder.LEGISLATIVO)).toBe(true);
    expect(alcancaPoder(transversal, Poder.EXECUTIVO)).toBe(true);
  });
});

describe("Administrador Geral", () => {
  it("ignora todas as verificações", () => {
    expect(temPermissao(A.adminGeral, "gerirPlanejamento")).toBe(true);
    expect(alcancaPoder(A.adminGeral, Poder.LEGISLATIVO)).toBe(true);
    expect(alcancaPoder(A.adminGeral, Poder.EXECUTIVO)).toBe(true);
    expect(podeCriarEmenda(A.adminGeral)).toBe(true);
    expect(podeTramitar(A.adminGeral)).toBe(true);
    expect(modulosVisiveis(A.adminGeral)).toHaveLength(NAVEGACAO.length);
  });

  it("é o único que gere perfis", () => {
    expect(podeGerirPerfis(A.adminGeral)).toBe(true);
    for (const a of [A.presidente, A.executivo, A.comissao, A.vereador]) {
      expect(podeGerirPerfis(a)).toBe(false);
    }
  });
});

describe("Vereador (gabinete)", () => {
  it("apresenta emenda e gere apenas as próprias", () => {
    expect(podeCriarEmenda(A.vereador)).toBe(true);
    expect(
      podeGerirEmenda(A.vereador, { autorUsuarioId: "user-vereador" })
    ).toBe(true);
    expect(podeGerirEmenda(A.vereador, { autorUsuarioId: "outro" })).toBe(false);
  });

  it("não vê a lista de todas as emendas e não tramita", () => {
    expect(podeVerTodasEmendas(A.vereador)).toBe(false);
    expect(podeTramitar(A.vereador)).toBe(false);
    const vistas = vistasVisiveis(A.vereador).map((v) => v.id);
    expect(vistas).not.toContain("analise");
    const ferramentas = NAVEGACAO.flatMap((m) => m.ferramentas).map((f) => f.id);
    expect(ferramentas).toContain("leg-emendas-todas");
    const mod = NAVEGACAO.find((m) => m.id === "leg-emendas")!;
    const todas = mod.ferramentas.find((f) => f.id === "leg-emendas-todas")!;
    expect(podeAcessar(A.vereador, { poder: mod.poder, permissoes: todas.permissoes })).toBe(false);
  });

  it("enxerga os itens de consulta do seu Poder", () => {
    const vistas = vistasVisiveis(A.vereador).map((v) => v.id);
    expect(vistas).toContain("painel");
    expect(vistas).toContain("vereador360");
    expect(vistas).toContain("placar");
  });

  it("cai no Vereador 360 após o login", () => {
    expect(vistaInicial(A.vereador)).toBe("/vereador360");
    expect(vistaInicial(A.comissao)).toBe("/painel");
    expect(vistaInicial(A.presidente)).toBe("/painel");
    expect(vistaInicial(A.executivo)).toBe("/painel");
  });

  it("não administra configurações nem exercícios", () => {
    expect(temPermissao(A.vereador, "administrarConfiguracoes")).toBe(false);
    expect(temPermissao(A.vereador, "gerirExercicios")).toBe(false);
  });
});

describe("Comissão de Finanças e Orçamento", () => {
  it("gere emenda de terceiro e tramita", () => {
    expect(podeGerirEmenda(A.comissao, { autorUsuarioId: "qualquer" })).toBe(true);
    expect(podeTramitar(A.comissao)).toBe(true);
    expect(podeVerTodasEmendas(A.comissao)).toBe(true);
  });

  it("não apresenta emenda em nome próprio", () => {
    expect(podeCriarEmenda(A.comissao)).toBe(false);
  });

  it("não administra configurações", () => {
    expect(temPermissao(A.comissao, "administrarConfiguracoes")).toBe(false);
    const vistas = vistasVisiveis(A.comissao).map((v) => v.id);
    expect(vistas).not.toContain("pitch");
  });
});

describe("Presidente da Câmara", () => {
  it("soma vereador, comissão e administração", () => {
    expect(podeCriarEmenda(A.presidente)).toBe(true);
    expect(podeTramitar(A.presidente)).toBe(true);
    expect(podeGerirEmenda(A.presidente, { autorUsuarioId: "outro" })).toBe(true);
    expect(temPermissao(A.presidente, "administrarConfiguracoes")).toBe(true);
    expect(temPermissao(A.presidente, "gerirExercicios")).toBe(true);
  });

  it("não opera o planejamento do Executivo", () => {
    expect(podeGerirPlanejamento(A.presidente)).toBe(false);
    const modulos = modulosVisiveis(A.presidente).map((m) => m.id);
    expect(modulos).not.toContain("exec-planejamento");
    expect(modulos).toContain("config");
  });
});

describe("Poder Executivo", () => {
  it("opera planejamento, viabilidade e execução", () => {
    expect(podeGerirPlanejamento(A.executivo)).toBe(true);
    expect(podeAnalisarViabilidade(A.executivo)).toBe(true);
    expect(podeRegistrarExecucao(A.executivo)).toBe(true);
  });

  it("não apresenta, não gere e não tramita emendas", () => {
    expect(podeCriarEmenda(A.executivo)).toBe(false);
    expect(podeTramitar(A.executivo)).toBe(false);
    expect(podeGerirEmenda(A.executivo, { autorUsuarioId: "qualquer" })).toBe(false);
    expect(podeVerTodasEmendas(A.executivo)).toBe(false);
  });

  it("fica bloqueado nos módulos do Legislativo", () => {
    const modulos = modulosVisiveis(A.executivo).map((m) => m.id);
    expect(modulos).not.toContain("leg-emendas");
    expect(modulos).not.toContain("leg-tramitacao");
    expect(modulos).toContain("exec-planejamento");
    const vistas = vistasVisiveis(A.executivo).map((v) => v.id);
    expect(vistas).not.toContain("vereador360");
    expect(vistas).not.toContain("analise");
  });

  it("não analisa viabilidade sem a permissão, ainda que seja do Executivo", () => {
    const semViab = ator(
      perfil("Executivo · planejamento", Poder.EXECUTIVO, ["gerirPlanejamento"])
    );
    expect(podeAnalisarViabilidade(semViab)).toBe(false);
    expect(podeRegistrarExecucao(semViab)).toBe(false);
  });
});

describe("perfil de consulta (sem permissões)", () => {
  it("é reconhecido como consulta e vê apenas os itens livres do seu Poder", () => {
    expect(ehConsulta(A.consultaLeg)).toBe(true);
    expect(ehConsulta(A.comissao)).toBe(false);
    expect(ehConsulta(A.adminGeral)).toBe(false);

    const vistas = vistasVisiveis(A.consultaLeg).map((v) => v.id);
    expect(vistas).toContain("painel");
    expect(vistas).toContain("placar");
    expect(vistas).not.toContain("analise");

    const modulos = modulosVisiveis(A.consultaLeg).map((m) => m.id);
    expect(modulos).toContain("leg-tramitacao");
    expect(modulos).not.toContain("config");
  });

  it("não executa nada", () => {
    expect(podeCriarEmenda(A.consultaLeg)).toBe(false);
    expect(podeTramitar(A.consultaLeg)).toBe(false);
    expect(podeGerirEmenda(A.consultaLeg, { autorUsuarioId: "x" })).toBe(false);
  });
});

describe("salvaguardas de atribuição de perfil", () => {
  it("só o Administrador Geral concede o Administrador Geral", () => {
    expect(podeAtribuirPerfil(A.adminGeral, P.adminGeral)).toBe(true);
    expect(podeAtribuirPerfil(A.presidente, P.adminGeral)).toBe(false);
    expect(podeAtribuirPerfil(A.executivo, P.adminGeral)).toBe(false);
  });

  it("quem administra um Poder não cadastra gente do outro", () => {
    // O ponto do Dr. Emerson: o Executivo não pode cadastrar gente da Câmara.
    expect(podeAtribuirPerfil(A.executivo, P.presidente)).toBe(false);
    expect(podeAtribuirPerfil(A.executivo, P.comissao)).toBe(false);
    expect(podeAtribuirPerfil(A.executivo, P.vereador)).toBe(false);
    expect(podeAtribuirPerfil(A.executivo, P.executivo)).toBe(true);

    expect(podeAtribuirPerfil(A.presidente, P.vereador)).toBe(true);
    expect(podeAtribuirPerfil(A.presidente, P.executivo)).toBe(false);
  });

  it("sem administrar configurações, ninguém atribui perfil", () => {
    expect(podeAtribuirPerfil(A.comissao, P.vereador)).toBe(false);
    expect(podeAtribuirPerfil(A.vereador, P.vereador)).toBe(false);
    expect(podeAtribuirPerfil(SEM_PERFIL, P.vereador)).toBe(false);
  });

  it("perfil transversal não é atribuível por quem não é Administrador Geral", () => {
    const transversal = perfil("Auditoria", null, ["gerirTodasEmendas"]);
    expect(podeAtribuirPerfil(A.presidente, transversal)).toBe(false);
    expect(podeAtribuirPerfil(A.adminGeral, transversal)).toBe(true);
  });
});
