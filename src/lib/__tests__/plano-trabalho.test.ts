import { describe, expect, it } from "vitest";
import {
  DECLARACOES,
  PLANO_VAZIO,
  pendenciasDoPlano,
  totalCronograma,
  totalItem,
  totalMemoria,
  type DadosPlano,
} from "../plano-trabalho";

// Um plano completo de R$ 200.000,00, do jeito que a entidade devolveria.
const completo = (): DadosPlano => ({
  metas: [
    {
      beneficiarios: "Pacientes da regulação municipal",
      unidade: "atendimento",
      metaFisica: 3600,
      comprovacao: "Relatório mensal de produção",
    },
  ],
  itens: [
    {
      beneficiarios: "Hora técnica de enfermagem",
      metaFisica: 2000,
      valorUnitario: 52,
      origemPreco: "Planilha de custos conferida com a tabela CROSS",
    },
    {
      beneficiarios: "Material médico-hospitalar",
      metaFisica: 12,
      valorUnitario: 8000,
      origemPreco: "Banco de Preços em Saúde",
    },
  ],
  parcelas: [{ valor: 100_000 }, { valor: 100_000 }],
  entidadeRazaoSocial: "Associação Hospitalar São Vicente",
  entidadeCnpj: "44812507000130",
  entidadeAnos: 38,
  orgaoRepassador: "Secretaria Municipal de Saúde",
  declaracoes: Object.fromEntries(DECLARACOES.map((d) => [d, true])) as DadosPlano["declaracoes"],
  assinatura: {
    nome: "Ana Paula Rezende",
    cpf: "39053344705",
    cargo: "Presidente",
    email: "ana@saovicente.org.br",
  },
});

const VALOR = 200_000;

describe("totais", () => {
  it("o total da linha é meta física × unitário", () => {
    expect(
      totalItem({ beneficiarios: "x", metaFisica: 2000, valorUnitario: 52, origemPreco: "y" })
    ).toBe(104_000);
  });

  it("a memória soma as linhas e o cronograma soma as parcelas", () => {
    const p = completo();
    expect(totalMemoria(p.itens)).toBe(VALOR);
    expect(totalCronograma(p.parcelas)).toBe(VALOR);
  });
});

describe("pendenciasDoPlano — núcleo comum aos quatro modelos", () => {
  it("sem modelo, a única pendência é escolher a dotação", () => {
    // Cobrar metas antes de saber o formulário faria a pessoa preencher o que
    // talvez sumisse.
    const p = pendenciasDoPlano(completo(), null, VALOR);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/dotação/i);
  });

  it("plano completo de custeio não tem pendência", () => {
    expect(pendenciasDoPlano(completo(), "CUSTEIO", VALOR)).toEqual([]);
  });

  it("plano vazio cobra metas, memória e cronograma", () => {
    const p = pendenciasDoPlano(PLANO_VAZIO, "CUSTEIO", VALOR);
    expect(p).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/meta/i),
        expect.stringMatching(/memória de cálculo/i),
        expect.stringMatching(/cronograma/i),
      ])
    );
  });

  it("meta sem quantidade ou sem comprovação não serve para prestar contas", () => {
    const p = completo();
    p.metas[0].metaFisica = 0;
    expect(pendenciasDoPlano(p, "CUSTEIO", VALOR)).toEqual(
      expect.arrayContaining([expect.stringMatching(/completar as metas/i)])
    );

    const q = completo();
    q.metas[0].comprovacao = "";
    expect(pendenciasDoPlano(q, "CUSTEIO", VALOR)).toEqual(
      expect.arrayContaining([expect.stringMatching(/completar as metas/i)])
    );
  });

  it("linha sem origem do preço é pendência — é o que o Executivo mais devolve", () => {
    const p = completo();
    p.itens[1].origemPreco = "";
    expect(pendenciasDoPlano(p, "CUSTEIO", VALOR)).toEqual(
      expect.arrayContaining([expect.stringMatching(/origem do preço/i)])
    );
  });

  it("memória que não fecha com a emenda é pendência, e a mensagem diz os dois valores", () => {
    const p = completo();
    p.itens[1].valorUnitario = 7000; // total passa a 188.000
    const pend = pendenciasDoPlano(p, "CUSTEIO", VALOR);
    expect(pend.some((x) => /R\$\s?188\.000,00/.test(x))).toBe(true);
    expect(pend.some((x) => /R\$\s?200\.000,00/.test(x))).toBe(true);
  });

  it("cronograma que não soma o valor da emenda é pendência", () => {
    const p = completo();
    p.parcelas = [{ valor: 100_000 }];
    expect(pendenciasDoPlano(p, "CUSTEIO", VALOR)).toEqual(
      expect.arrayContaining([expect.stringMatching(/fechar o cronograma/i)])
    );
  });

  it("sem valor de emenda, o fechamento não é cobrado — é rascunho", () => {
    const p = completo();
    p.parcelas = [{ valor: 1 }];
    expect(pendenciasDoPlano(p, "CUSTEIO", 0)).toEqual([]);
  });

  it("um centavo de folga: arredondamento não reprova plano correto", () => {
    // 52,000001 × 2000 = 104.000,002 — dois milésimos de real acima. É o tipo
    // de sobra que um preço unitário com mais casas produz, e reprovar por ela
    // seria reprovar aritmética, não plano.
    const p = completo();
    p.itens[0].valorUnitario = 52.000001;
    expect(pendenciasDoPlano(p, "CUSTEIO", VALOR)).toEqual([]);
  });
});

describe("pendenciasDoPlano — rito do terceiro setor", () => {
  it("obras e equipamentos não pedem entidade, declarações nem assinatura", () => {
    const p = completo();
    p.entidadeRazaoSocial = "";
    p.entidadeCnpj = "";
    p.entidadeAnos = null;
    p.orgaoRepassador = "";
    p.assinatura = null;
    for (const d of DECLARACOES) p.declaracoes[d] = false;

    expect(pendenciasDoPlano(p, "OBRAS", VALOR)).toEqual([]);
    expect(pendenciasDoPlano(p, "EQUIPAMENTOS", VALOR)).toEqual([]);
  });

  it("terceiro setor completo não tem pendência", () => {
    expect(pendenciasDoPlano(completo(), "TERCEIRO_SETOR", VALOR)).toEqual([]);
  });

  it("CNPJ incompleto é pendência", () => {
    const p = completo();
    p.entidadeCnpj = "4481250700";
    expect(pendenciasDoPlano(p, "TERCEIRO_SETOR", VALOR)).toEqual(
      expect.arrayContaining([expect.stringMatching(/CNPJ/)])
    );
  });

  it("menos de 1 ano de existência barra o repasse (art. 33 da Lei 13.019/2014)", () => {
    const p = completo();
    p.entidadeAnos = 0;
    expect(pendenciasDoPlano(p, "TERCEIRO_SETOR", VALOR)).toEqual(
      expect.arrayContaining([expect.stringMatching(/1 ano de existência/)])
    );
  });

  it("tempo de existência não informado é pendência distinta de tempo insuficiente", () => {
    const p = completo();
    p.entidadeAnos = null;
    const pend = pendenciasDoPlano(p, "TERCEIRO_SETOR", VALOR);
    expect(pend).toEqual(
      expect.arrayContaining([expect.stringMatching(/tempo de existência/)])
    );
    expect(pend.some((x) => /art\. 33/.test(x))).toBe(false);
  });

  it("declarações não assinadas são contadas", () => {
    const p = completo();
    p.declaracoes.declFichaLimpa = false;
    p.declaracoes.declSancoes = false;
    expect(pendenciasDoPlano(p, "TERCEIRO_SETOR", VALOR)).toEqual(
      expect.arrayContaining([expect.stringMatching(/assinar 2 declarações/)])
    );
  });

  it("sem assinatura do representante, o plano não está pronto", () => {
    const p = completo();
    p.assinatura = null;
    expect(pendenciasDoPlano(p, "TERCEIRO_SETOR", VALOR)).toEqual(
      expect.arrayContaining([expect.stringMatching(/assinatura do representante/i)])
    );
  });
});
