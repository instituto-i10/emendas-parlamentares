import { describe, expect, it } from "vitest";
import {
  derivarModeloPlano,
  exigenciasDoModelo,
  type NaturezaParaModelo,
} from "../plano-modelo";

// Naturezas reais de LOA municipal, escritas por partes como o banco guarda.
const natureza = (codigo: string): NaturezaParaModelo => {
  const [, grupo, modalidadeAplicacao, elemento] = codigo.split(".");
  return { grupo, modalidadeAplicacao, elemento };
};

describe("derivarModeloPlano", () => {
  it("sem dotação não arrisca um modelo", () => {
    // Fingir um padrão faria o vereador preencher campos que sumiriam depois.
    expect(derivarModeloPlano(null, null)).toBeNull();
  });

  it("despesa corrente de aplicação direta é custeio", () => {
    expect(derivarModeloPlano(natureza("3.3.90.30"), null)).toBe("CUSTEIO");
    expect(derivarModeloPlano(natureza("3.3.90.39"), null)).toBe("CUSTEIO");
  });

  it("pessoal e encargos também é custeio — quem barra é o motor, não o formulário", () => {
    expect(derivarModeloPlano(natureza("3.1.90.11"), null)).toBe("CUSTEIO");
  });

  it("obras e instalações é o Modelo II", () => {
    expect(derivarModeloPlano(natureza("4.4.90.51"), null)).toBe("OBRAS");
  });

  it("bem permanente é o Modelo IV", () => {
    expect(derivarModeloPlano(natureza("4.4.90.52"), null)).toBe("EQUIPAMENTOS");
  });

  it("investimento fora de obras cai em equipamentos", () => {
    // 4.4.90.61 é aquisição de imóveis; não é obra, e o rito de bem permanente
    // é o que mais se aproxima.
    expect(derivarModeloPlano(natureza("4.4.90.61"), null)).toBe("EQUIPAMENTOS");
  });

  it("modalidade 50 é repasse ao terceiro setor, mesmo sem beneficiário cadastrado", () => {
    // Subvenção social e auxílio: a dotação já denuncia que há entidade do
    // outro lado.
    expect(derivarModeloPlano(natureza("3.3.50.43"), null)).toBe("TERCEIRO_SETOR");
    expect(derivarModeloPlano(natureza("4.4.50.42"), null)).toBe("TERCEIRO_SETOR");
  });

  it("beneficiário do terceiro setor vence a natureza da despesa", () => {
    // O repasse pode estar numa dotação de aplicação direta por erro de
    // classificação. Quem preenche o plano continua sendo a entidade.
    expect(derivarModeloPlano(natureza("3.3.90.30"), "TERCEIRO_SETOR")).toBe(
      "TERCEIRO_SETOR"
    );
    expect(derivarModeloPlano(natureza("4.4.90.52"), "TERCEIRO_SETOR")).toBe(
      "TERCEIRO_SETOR"
    );
  });

  it("beneficiário do terceiro setor decide mesmo antes de haver dotação", () => {
    expect(derivarModeloPlano(null, "TERCEIRO_SETOR")).toBe("TERCEIRO_SETOR");
  });

  it("administração direta e indireta não alteram a leitura da natureza", () => {
    expect(derivarModeloPlano(natureza("4.4.90.51"), "ADMINISTRACAO_DIRETA")).toBe("OBRAS");
    expect(derivarModeloPlano(natureza("3.3.90.30"), "ADMINISTRACAO_INDIRETA")).toBe(
      "CUSTEIO"
    );
  });

  it("tolera zero à esquerda e espaço, como vem de base importada", () => {
    expect(
      derivarModeloPlano(
        { grupo: " 4 ", modalidadeAplicacao: "090", elemento: "051" },
        null
      )
    ).toBe("OBRAS");
    expect(
      derivarModeloPlano(
        { grupo: "3", modalidadeAplicacao: "050", elemento: "43" },
        null
      )
    ).toBe("TERCEIRO_SETOR");
  });
});

describe("exigenciasDoModelo", () => {
  it("só o terceiro setor tem entidade, declarações, assinatura e link", () => {
    expect(exigenciasDoModelo("TERCEIRO_SETOR")).toEqual({
      entidade: true,
      declaracoes: true,
      assinatura: true,
      preenchidoPelaEntidade: true,
    });
  });

  it("nos demais modelos quem preenche é o próprio autor", () => {
    for (const modelo of ["CUSTEIO", "OBRAS", "EQUIPAMENTOS"] as const) {
      expect(exigenciasDoModelo(modelo)).toEqual({
        entidade: false,
        declaracoes: false,
        assinatura: false,
        preenchidoPelaEntidade: false,
      });
    }
  });

  it("sem modelo definido, nada do rito do terceiro setor é exigido", () => {
    expect(exigenciasDoModelo(null).preenchidoPelaEntidade).toBe(false);
  });
});
