import { describe, expect, it } from "vitest";
import {
  compatibilidade,
  compativel,
  ehDiscricionaria,
  elegivel,
  motivoNaoDiscricionaria,
  type NaturezaParaFiltro,
} from "../finalidade";

// Naturezas reais de LOA municipal, escritas por partes como o banco guarda.
const nat = (codigo: string, tipoAcao?: string): NaturezaParaFiltro => {
  const [, grupo, modalidadeAplicacao, elemento] = codigo.split(".");
  return { grupo, modalidadeAplicacao, elemento, tipoAcao };
};

describe("dotação discricionária", () => {
  it("despesa de custeio comum é discricionária", () => {
    expect(ehDiscricionaria(nat("3.3.90.30"))).toBe(true);
    expect(ehDiscricionaria(nat("4.4.90.51"))).toBe(true);
    expect(ehDiscricionaria(nat("3.3.50.43"))).toBe(true);
  });

  it("folha de pagamento e encargos ficam de fora", () => {
    expect(motivoNaoDiscricionaria(nat("3.1.90.11"))).toMatch(/folha de pagamento/);
    expect(motivoNaoDiscricionaria(nat("3.1.91.13"))).toMatch(/folha de pagamento/);
  });

  it("dívida fica de fora, nos juros e no principal", () => {
    expect(motivoNaoDiscricionaria(nat("3.2.90.21"))).toMatch(/juros/);
    expect(motivoNaoDiscricionaria(nat("4.6.90.71"))).toMatch(/amortização/);
  });

  it("sentença, exercício anterior e indenização ficam de fora", () => {
    expect(motivoNaoDiscricionaria(nat("3.3.90.91"))).toMatch(/sentença/);
    expect(motivoNaoDiscricionaria(nat("3.3.90.92"))).toMatch(/exercício anterior/);
    expect(motivoNaoDiscricionaria(nat("3.3.90.93"))).toMatch(/indenizações/);
  });

  it("obrigação tributária e benefício ao servidor ficam de fora", () => {
    expect(motivoNaoDiscricionaria(nat("3.3.90.47"))).toMatch(/tributárias/);
    expect(motivoNaoDiscricionaria(nat("3.3.90.08"))).toMatch(/benefício assistencial/);
  });

  it("elemento com zero à esquerda é reconhecido mesmo sem o zero", () => {
    // Base de prefeitura escreve tanto "08" quanto "8".
    expect(motivoNaoDiscricionaria({ grupo: "3", modalidadeAplicacao: "90", elemento: "8" }))
      .toMatch(/benefício assistencial/);
  });

  it("operação especial fica de fora mesmo com natureza discricionária", () => {
    expect(ehDiscricionaria(nat("3.3.90.39", "ATIVIDADE"))).toBe(true);
    expect(motivoNaoDiscricionaria(nat("3.3.90.39", "OPERACAO_ESPECIAL"))).toMatch(
      /operação especial/
    );
  });
});

describe("quem recebe define a modalidade", () => {
  it("entidade sem fins lucrativos só entra em transferência", () => {
    expect(compativel(nat("3.3.50.43"), "TERCEIRO_SETOR", "CUSTEIO")).toBe(true);
    expect(compativel(nat("3.3.90.30"), "TERCEIRO_SETOR", "CUSTEIO")).toBe(false);
  });

  it("órgão público não entra em dotação de transferência a entidade privada", () => {
    expect(compativel(nat("3.3.50.43"), "ADMINISTRACAO_DIRETA", "CUSTEIO")).toBe(false);
    expect(compativel(nat("3.3.90.30"), "ADMINISTRACAO_DIRETA", "CUSTEIO")).toBe(true);
  });

  it("autarquia e fundação aceitam operação entre entes do orçamento", () => {
    expect(compativel(nat("3.3.91.39"), "ADMINISTRACAO_INDIRETA", "CUSTEIO")).toBe(true);
  });

  it("o motivo da recusa é escrito para o vereador ler", () => {
    const r = compatibilidade(nat("3.3.90.30"), "TERCEIRO_SETOR", "CUSTEIO");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/transferência/);
  });
});

describe("para que serve define grupo e elemento", () => {
  it("manter o serviço é despesa corrente", () => {
    expect(compativel(nat("3.3.90.39"), "ADMINISTRACAO_DIRETA", "CUSTEIO")).toBe(true);
    expect(compativel(nat("4.4.90.52"), "ADMINISTRACAO_DIRETA", "CUSTEIO")).toBe(false);
  });

  it("obra é investimento em obras e instalações", () => {
    expect(compativel(nat("4.4.90.51"), "ADMINISTRACAO_DIRETA", "OBRA")).toBe(true);
    expect(compativel(nat("4.4.90.52"), "ADMINISTRACAO_DIRETA", "OBRA")).toBe(false);
  });

  it("equipamento é bem permanente — inclusive imóvel adquirido", () => {
    expect(compativel(nat("4.4.90.52"), "ADMINISTRACAO_DIRETA", "EQUIPAMENTO")).toBe(true);
    expect(compativel(nat("4.4.90.61"), "ADMINISTRACAO_DIRETA", "EQUIPAMENTO")).toBe(true);
    expect(compativel(nat("4.4.90.51"), "ADMINISTRACAO_DIRETA", "EQUIPAMENTO")).toBe(false);
  });

  it("no terceiro setor obra e equipamento saem pelo mesmo código", () => {
    // 4.4.50.42 é auxílio: a distinção vive no plano de trabalho, não na LOA.
    expect(compativel(nat("4.4.50.42"), "TERCEIRO_SETOR", "OBRA")).toBe(true);
    expect(compativel(nat("4.4.50.42"), "TERCEIRO_SETOR", "EQUIPAMENTO")).toBe(true);
    expect(compativel(nat("4.4.50.42"), "TERCEIRO_SETOR", "CUSTEIO")).toBe(false);
  });

  it("sem finalidade escolhida, só a modalidade filtra", () => {
    expect(compativel(nat("4.4.90.51"), "ADMINISTRACAO_DIRETA", null)).toBe(true);
    expect(compativel(nat("3.3.90.30"), "ADMINISTRACAO_DIRETA", null)).toBe(true);
  });

  it("compatibilidade não responde pelo discricionário — são duas regras", () => {
    // Folha de pagamento é despesa corrente de aplicação direta: a COMBINAÇÃO
    // fecha. O que a barra é a outra regra, e o relatório mostra as duas
    // separadas para o vereador saber qual delas resolver.
    expect(compativel(nat("3.1.90.11"), "ADMINISTRACAO_DIRETA", "CUSTEIO")).toBe(true);
  });

  it("elegível soma as duas regras e recusa a dotação obrigatória", () => {
    const r = elegivel(nat("3.1.90.11"), "ADMINISTRACAO_DIRETA", "CUSTEIO");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/impositiva não entra/);
    expect(elegivel(nat("3.3.90.30"), "ADMINISTRACAO_DIRETA", "CUSTEIO").ok).toBe(true);
  });
});
