import { describe, expect, it } from "vitest";
import {
  exigenciasDoPlano,
  pendenciasDoPlano,
  planoEfetivo,
  reusaJustificativaDaEmenda,
  totalPlanilha,
  type DadosPlano,
} from "../plano-trabalho";

const completo: DadosPlano = {
  justificativa: "Aplicação integral no objeto.",
  objetivo: "Executar o objeto no exercício.",
  declaracaoAceita: true,
  itens: [{ descricao: "Equipamento", quantidade: 2, valorUnitario: 500 }],
};

describe("exigenciasDoPlano", () => {
  it("terceiro setor exige objetivo, declaração e planilha", () => {
    expect(exigenciasDoPlano("TERCEIRO_SETOR")).toEqual({
      objetivo: true,
      declaracao: true,
      planilha: true,
    });
  });

  it("administração direta e indireta exigem só a justificativa", () => {
    for (const c of ["ADMINISTRACAO_DIRETA", "ADMINISTRACAO_INDIRETA"] as const) {
      expect(exigenciasDoPlano(c)).toEqual({
        objetivo: false,
        declaracao: false,
        planilha: false,
      });
    }
  });
});

describe("pendenciasDoPlano", () => {
  it("plano completo do terceiro setor → sem pendência", () => {
    expect(pendenciasDoPlano(completo, "TERCEIRO_SETOR", 1000)).toEqual([]);
  });

  it("sem plano → pendência única", () => {
    expect(pendenciasDoPlano(null, "TERCEIRO_SETOR", 1000)).toHaveLength(1);
  });

  it("secretaria só precisa da justificativa", () => {
    const soJustificativa: DadosPlano = {
      justificativa: "Reforma da unidade.",
      objetivo: "",
      declaracaoAceita: false,
      itens: [],
    };
    expect(pendenciasDoPlano(soJustificativa, "ADMINISTRACAO_DIRETA", 1000)).toEqual([]);
    expect(pendenciasDoPlano(soJustificativa, "ADMINISTRACAO_INDIRETA", 1000)).toEqual([]);
  });

  it("o mesmo plano é insuficiente para o terceiro setor", () => {
    const p = pendenciasDoPlano(
      { justificativa: "x", objetivo: "", declaracaoAceita: false, itens: [] },
      "TERCEIRO_SETOR",
      1000
    );
    expect(p).toHaveLength(3); // objetivo, declaração, planilha
  });

  it("justificativa em branco é pendência em qualquer categoria", () => {
    // Na administração pública a pendência aponta a justificativa DA EMENDA,
    // porque é ela que vale como a do plano — não há um segundo campo.
    expect(
      pendenciasDoPlano({ ...completo, justificativa: "   " }, "ADMINISTRACAO_DIRETA", 1000)
    ).toEqual(["justificativa da emenda"]);
    expect(
      pendenciasDoPlano(
        { justificativa: "   ", objetivo: "o", declaracaoAceita: true, itens: completo.itens },
        "TERCEIRO_SETOR",
        1000
      )
    ).toEqual(["justificativa do plano"]);
  });

  it("planilha que não fecha com o valor da emenda → pendência", () => {
    const p = pendenciasDoPlano(completo, "TERCEIRO_SETOR", 1500);
    expect(p).toHaveLength(1);
    expect(p[0]).toContain("fechar a planilha");
  });

  it("tolera um centavo de arredondamento", () => {
    expect(pendenciasDoPlano(completo, "TERCEIRO_SETOR", 1000.01)).toEqual([]);
  });

  it("valor zero pula a conferência da planilha (rascunho sem valor)", () => {
    expect(pendenciasDoPlano(completo, "TERCEIRO_SETOR", 0)).toEqual([]);
  });

  it("item sem descrição não conta como linha da planilha", () => {
    const p = pendenciasDoPlano(
      { ...completo, itens: [{ descricao: "  ", quantidade: 1, valorUnitario: 1000 }] },
      "TERCEIRO_SETOR",
      1000
    );
    expect(p).toEqual(["planilha orçamentária"]);
  });
});

describe("reusaJustificativaDaEmenda", () => {
  it("terceiro setor tem justificativa própria — quem escreve é a entidade", () => {
    expect(reusaJustificativaDaEmenda("TERCEIRO_SETOR")).toBe(false);
  });

  it("administração pública reaproveita a da emenda", () => {
    expect(reusaJustificativaDaEmenda("ADMINISTRACAO_DIRETA")).toBe(true);
    expect(reusaJustificativaDaEmenda("ADMINISTRACAO_INDIRETA")).toBe(true);
    // Categoria ainda não escolhida: o campo separado só aparece no terceiro setor.
    expect(reusaJustificativaDaEmenda(null)).toBe(true);
  });
});

describe("planoEfetivo", () => {
  it("na administração pública, a justificativa da emenda entra no lugar", () => {
    const p = planoEfetivo(
      { ...completo, justificativa: "texto antigo do plano" },
      "ADMINISTRACAO_DIRETA",
      "Justificativa escrita na emenda."
    );
    expect(p?.justificativa).toBe("Justificativa escrita na emenda.");
    // O resto do plano é preservado.
    expect(p?.itens).toEqual(completo.itens);
  });

  it("no terceiro setor o plano passa intacto", () => {
    expect(planoEfetivo(completo, "TERCEIRO_SETOR", "outra coisa")).toBe(completo);
  });

  // O caso que destrava a remessa: emenda de secretaria nunca teve linha de
  // PlanoTrabalho no banco, e não precisa ter.
  it("sem linha de plano, a emenda de órgão público não fica pendente", () => {
    const p = planoEfetivo(null, "ADMINISTRACAO_DIRETA", "Reforma da unidade.");
    expect(pendenciasDoPlano(p, "ADMINISTRACAO_DIRETA", 1000)).toEqual([]);
  });

  it("sem linha de plano, o terceiro setor continua pendente", () => {
    const p = planoEfetivo(null, "TERCEIRO_SETOR", "Reforma da unidade.");
    expect(pendenciasDoPlano(p, "TERCEIRO_SETOR", 1000)).toEqual([
      "preencher o plano de trabalho",
    ]);
  });
});

describe("totalPlanilha", () => {
  it("soma quantidade × unitário", () => {
    expect(
      totalPlanilha([
        { descricao: "a", quantidade: 3, valorUnitario: 10.5 },
        { descricao: "b", quantidade: 1, valorUnitario: 4.5 },
      ])
    ).toBe(36);
  });
});
