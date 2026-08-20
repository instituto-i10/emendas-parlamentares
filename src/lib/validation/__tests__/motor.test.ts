import { describe, expect, it } from "vitest";
import { avaliarEmenda, type ContextoEmenda } from "../motor";

function ctxValido(over: Partial<ContextoEmenda> = {}): ContextoEmenda {
  const base: ContextoEmenda = {
    emenda: {
      tipo: "ACRESCIMO",
      valor: 1000,
      exercicioId: "ex1",
      instrumentoBaseId: "pl1",
      autorId: "a1",
      objeto: "Objeto de teste",
      justificativa: "Justificativa de teste",
    },
    exercicioStatus: "ABERTO",
    instrumentoBaseStatus: "EM_TRAMITACAO",
    dotacao: {
      id: "d1",
      instrumentoId: "pl1",
      exercicioId: "ex1",
      orgaoId: "o1",
      unidadeOrcamentariaId: "u1",
      funcaoId: "f1",
      subfuncaoId: "sf1",
      programaId: "prog1",
      acaoId: "acao1",
      naturezaDespesaId: "n1",
      fonteRecursoId: "fr1",
      valorAtual: 5000,
      acaoProgramaId: "prog1",
      naturezaGrupo: "3",
    },
    dotacaoOrigem: null,
    dotacaoDestino: null,
    ppaCadastrado: true,
    programasNoPPA: new Set(["prog1"]),
    prioridadesPrograma: new Set(["prog1"]),
    prioridadesAcao: new Set(),
    modoAderenciaLDO: "ALERTA",
    tetoValorAutor: null,
    somaAutorExistente: 0,
    reservaSaudePct: null,
    modoReservaSaude: null,
    emendaEhSaude: false,
    somaAutorDemaisExistente: 0,
    beneficiarioCategoria: "ADMINISTRACAO_DIRETA",
    pendenciasPlanoTrabalho: [],
  };
  return { ...base, ...over };
}

const item = (r: ReturnType<typeof avaliarEmenda>, codigo: string) =>
  r.itens.find((i) => i.codigo === codigo)!;

describe("avaliarEmenda", () => {
  it("caminho feliz → VÁLIDA sem falhas", () => {
    const r = avaliarEmenda(ctxValido());
    expect(r.resultado).toBe("VALIDA");
    expect(r.itens.some((i) => i.status === "FALHA")).toBe(false);
    expect(item(r, "EXERCICIO_ABERTO").status).toBe("OK");
  });

  it("dotação de outro instrumento → INVÁLIDA (DOTACAO_EXISTE)", () => {
    const r = avaliarEmenda(
      ctxValido({
        dotacao: { ...ctxValido().dotacao!, instrumentoId: "outro-pl" },
      })
    );
    expect(item(r, "DOTACAO_EXISTE").status).toBe("FALHA");
    expect(r.resultado).toBe("INVALIDA");
  });

  it("dotação de outro exercício → INVÁLIDA", () => {
    const r = avaliarEmenda(
      ctxValido({ dotacao: { ...ctxValido().dotacao!, exercicioId: "ex2" } })
    );
    expect(item(r, "DOTACAO_EXISTE").status).toBe("FALHA");
    expect(r.resultado).toBe("INVALIDA");
  });

  it("ação de programa errado → INVÁLIDA (ACAO_VINCULADA)", () => {
    const r = avaliarEmenda(
      ctxValido({ dotacao: { ...ctxValido().dotacao!, acaoProgramaId: "progX" } })
    );
    expect(item(r, "ACAO_VINCULADA").status).toBe("FALHA");
    expect(r.resultado).toBe("INVALIDA");
  });

  it("teto estourado → INVÁLIDA; dentro do teto → VÁLIDA", () => {
    const estoura = avaliarEmenda(
      ctxValido({ tetoValorAutor: 500, somaAutorExistente: 400, emenda: { ...ctxValido().emenda, valor: 200 } })
    );
    expect(item(estoura, "LIMITE_VALOR_AUTOR").status).toBe("FALHA");
    expect(estoura.resultado).toBe("INVALIDA");

    const dentro = avaliarEmenda(
      ctxValido({ tetoValorAutor: 500, somaAutorExistente: 100, emenda: { ...ctxValido().emenda, valor: 200 } })
    );
    expect(item(dentro, "LIMITE_VALOR_AUTOR").status).toBe("OK");
    expect(dentro.resultado).toBe("VALIDA");
  });

  it("LDO sem aderência: ALERTA não bloqueia; BLOQUEANTE bloqueia", () => {
    const semPrioridade = {
      prioridadesPrograma: new Set<string>(),
      prioridadesAcao: new Set<string>(),
    };
    const alerta = avaliarEmenda(ctxValido({ ...semPrioridade, modoAderenciaLDO: "ALERTA" }));
    expect(item(alerta, "ADERENCIA_LDO").status).toBe("ALERTA");
    expect(alerta.resultado).toBe("VALIDA");

    const bloqueante = avaliarEmenda(ctxValido({ ...semPrioridade, modoAderenciaLDO: "BLOQUEANTE" }));
    expect(item(bloqueante, "ADERENCIA_LDO").status).toBe("FALHA");
    expect(bloqueante.resultado).toBe("INVALIDA");
  });

  it("instrumento base fechado → INVÁLIDA", () => {
    const r = avaliarEmenda(ctxValido({ instrumentoBaseStatus: "APROVADO" }));
    expect(item(r, "INSTRUMENTO_BASE_ABERTO").status).toBe("FALHA");
    expect(r.resultado).toBe("INVALIDA");
  });

  it("remanejamento sem origem/destino → INVÁLIDA", () => {
    const r = avaliarEmenda(
      ctxValido({ emenda: { ...ctxValido().emenda, tipo: "REMANEJAMENTO" } })
    );
    expect(item(r, "TIPO_COERENTE").status).toBe("FALHA");
    expect(r.resultado).toBe("INVALIDA");
  });

  it("anulação acima do saldo da dotação → INVÁLIDA", () => {
    const r = avaliarEmenda(
      ctxValido({
        emenda: { ...ctxValido().emenda, tipo: "ANULACAO", valor: 999999 },
      })
    );
    expect(item(r, "TIPO_COERENTE").status).toBe("FALHA");
    expect(r.resultado).toBe("INVALIDA");
  });

  it("reserva da saúde: demais áreas dentro do limite → OK", () => {
    // cota 500, reserva 50% → limite p/ demais áreas = 250
    const r = avaliarEmenda(
      ctxValido({
        tetoValorAutor: 500,
        reservaSaudePct: 50,
        modoReservaSaude: "BLOQUEANTE",
        somaAutorDemaisExistente: 100,
        emenda: { ...ctxValido().emenda, valor: 100 },
      })
    );
    expect(item(r, "RESERVA_SAUDE").status).toBe("OK");
    expect(r.resultado).toBe("VALIDA");
  });

  it("reserva da saúde invadida: BLOQUEANTE bloqueia; ALERTA só avisa", () => {
    const acima = {
      tetoValorAutor: 500,
      reservaSaudePct: 50,
      somaAutorDemaisExistente: 200,
      emenda: { ...ctxValido().emenda, valor: 100 }, // demais somam 300 > 250
    };
    const bloqueante = avaliarEmenda(
      ctxValido({ ...acima, modoReservaSaude: "BLOQUEANTE" })
    );
    expect(item(bloqueante, "RESERVA_SAUDE").status).toBe("FALHA");
    expect(bloqueante.resultado).toBe("INVALIDA");

    const alerta = avaliarEmenda(
      ctxValido({ ...acima, modoReservaSaude: "ALERTA" })
    );
    expect(item(alerta, "RESERVA_SAUDE").status).toBe("ALERTA");
    expect(alerta.resultado).toBe("VALIDA");
  });

  it("emenda de saúde não consome o limite das demais áreas", () => {
    const r = avaliarEmenda(
      ctxValido({
        tetoValorAutor: 500,
        reservaSaudePct: 50,
        modoReservaSaude: "BLOQUEANTE",
        emendaEhSaude: true,
        somaAutorDemaisExistente: 250, // limite já esgotado pelas demais
        emenda: { ...ctxValido().emenda, valor: 200 },
      })
    );
    expect(item(r, "RESERVA_SAUDE").status).toBe("OK");
    expect(r.resultado).toBe("VALIDA");
  });

  it("sem reserva configurada → RESERVA_SAUDE em OK (não interfere)", () => {
    const r = avaliarEmenda(ctxValido());
    expect(item(r, "RESERVA_SAUDE").status).toBe("OK");
  });

  it("PPA não cadastrado → ALERTA (não bloqueia)", () => {
    const r = avaliarEmenda(
      ctxValido({ ppaCadastrado: false, programasNoPPA: new Set() })
    );
    expect(item(r, "PROGRAMA_NO_PPA").status).toBe("ALERTA");
    expect(r.resultado).toBe("VALIDA");
  });

  // Regressão: o instrumento PPA passou a existir (base real de Mogi Guaçu,
  // commit 173eb53) sem programas carregados — PPA não tem dotação, e é de
  // dotação que `programasNoPPA` era derivado. Com o conjunto vazio, TODA
  // emenda nova era reprovada por um motivo falso. Conjunto vazio significa
  // "não dá para conferir", não "nenhum programa consta".
  it("PPA cadastrado sem programas → ALERTA, não FALHA", () => {
    const r = avaliarEmenda(
      ctxValido({ ppaCadastrado: true, programasNoPPA: new Set() })
    );
    expect(item(r, "PROGRAMA_NO_PPA").status).toBe("ALERTA");
    expect(item(r, "PROGRAMA_NO_PPA").detalhe).toContain("não pôde ser conferida");
    expect(r.resultado).toBe("VALIDA");
  });

  it("PPA com programas continua reprovando o programa de fora", () => {
    const r = avaliarEmenda(
      ctxValido({ ppaCadastrado: true, programasNoPPA: new Set(["outro-prog"]) })
    );
    expect(item(r, "PROGRAMA_NO_PPA").status).toBe("FALHA");
    expect(r.resultado).toBe("INVALIDA");
  });

  // ------------------------------------------------- CAMPOS_PREENCHIDOS
  // O rascunho pode ser salvo pela metade; a trava mudou de lugar — do salvar
  // para o validar/remeter.

  it("rascunho sem objeto → INVÁLIDA, apontando o campo que falta", () => {
    const r = avaliarEmenda(
      ctxValido({ emenda: { ...ctxValido().emenda, objeto: "   " } })
    );
    expect(item(r, "CAMPOS_PREENCHIDOS").status).toBe("FALHA");
    expect(item(r, "CAMPOS_PREENCHIDOS").detalhe).toContain("objeto");
    expect(r.resultado).toBe("INVALIDA");
  });

  it("rascunho sem valor → INVÁLIDA (valor zero não é valor)", () => {
    const r = avaliarEmenda(
      ctxValido({ emenda: { ...ctxValido().emenda, valor: 0 } })
    );
    expect(item(r, "CAMPOS_PREENCHIDOS").status).toBe("FALHA");
    expect(item(r, "CAMPOS_PREENCHIDOS").detalhe).toContain("valor");
  });

  it("rascunho vazio lista os três campos de uma vez", () => {
    const r = avaliarEmenda(
      ctxValido({
        emenda: { ...ctxValido().emenda, objeto: "", justificativa: "", valor: 0 },
      })
    );
    const d = item(r, "CAMPOS_PREENCHIDOS").detalhe;
    expect(d).toContain("objeto");
    expect(d).toContain("justificativa");
    expect(d).toContain("valor");
  });

  // ------------------------------------------------- SAUDE_NAO_PESSOAL
  // Art. 140, § 7º, da Lei Orgânica de Mogi Guaçu: a parcela da saúde não pode
  // custear pessoal nem encargos sociais. É vedação legal — bloqueia sempre,
  // sem parâmetro que a afrouxe.

  it("emenda de saúde em dotação de pessoal → INVÁLIDA (LOM art. 140 §7º)", () => {
    const r = avaliarEmenda(
      ctxValido({
        emendaEhSaude: true,
        dotacao: { ...ctxValido().dotacao!, naturezaGrupo: "1" },
      })
    );
    expect(item(r, "SAUDE_NAO_PESSOAL").status).toBe("FALHA");
    expect(r.resultado).toBe("INVALIDA");
  });

  it("emenda de saúde fora do grupo de pessoal → OK", () => {
    const r = avaliarEmenda(
      ctxValido({
        emendaEhSaude: true,
        dotacao: { ...ctxValido().dotacao!, naturezaGrupo: "3" },
      })
    );
    expect(item(r, "SAUDE_NAO_PESSOAL").status).toBe("OK");
    expect(r.resultado).toBe("VALIDA");
  });

  it("dotação de pessoal FORA da saúde → OK (a vedação é só da saúde)", () => {
    const r = avaliarEmenda(
      ctxValido({
        emendaEhSaude: false,
        dotacao: { ...ctxValido().dotacao!, naturezaGrupo: "1" },
      })
    );
    expect(item(r, "SAUDE_NAO_PESSOAL").status).toBe("OK");
    expect(r.resultado).toBe("VALIDA");
  });
});
