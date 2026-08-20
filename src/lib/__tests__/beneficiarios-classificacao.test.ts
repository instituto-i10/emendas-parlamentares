import { describe, expect, it } from "vitest";
import { categoriaPeloNome } from "../beneficiarios-classificacao";

describe("categoriaPeloNome", () => {
  it("reconhece autarquias e fundações públicas da base de Mogi Guaçu", () => {
    for (const nome of [
      "SAMAE - SERVICO AUTONOMO MUNICIPAL DE AGUA E ESGOTO",
      "SAMAE",
      "FEG - FUNDACAO EDUCACIONAL GUAÇUANA",
      "Fundação Educacional Guaçuana",
      "Instituto de Previdência dos Servidores",
      "Autarquia Municipal de Trânsito",
    ]) {
      expect(categoriaPeloNome(nome), nome).toBe("ADMINISTRACAO_INDIRETA");
    }
  });

  it("reconhece secretarias, fundos e equipamentos como administração direta", () => {
    for (const nome of [
      "Secretaria Municipal de Educação",
      "Fundo Municipal de Saúde",
      "UBS Jardim Itamaraty",
      "EMEB Professora Marta Ribeiro",
      "Hospital Municipal Dr. Tabajara Ramos",
    ]) {
      expect(categoriaPeloNome(nome), nome).toBe("ADMINISTRACAO_DIRETA");
    }
  });

  it("reconhece entidades sem fins lucrativos como terceiro setor", () => {
    for (const nome of [
      "Santa Casa de Misericórdia de Mogi Guaçu",
      "APAE Mogi Guaçu",
      "Associação de Pais e Amigos do Bairro Ypê",
      "Lar dos Velhinhos São Vicente",
    ]) {
      expect(categoriaPeloNome(nome), nome).toBe("TERCEIRO_SETOR");
    }
  });

  // "fundação" sozinha não pode significar administração indireta: fundação
  // privada sem fins lucrativos é terceiro setor, e classificá-la como pública
  // dispensaria justamente o plano de trabalho completo que ela precisa entregar.
  it("fundação privada continua em terceiro setor", () => {
    expect(categoriaPeloNome("Fundação Beneficente Casa da Criança")).toBe("TERCEIRO_SETOR");
    expect(categoriaPeloNome("Instituto Cultural Guaçuano")).toBe("TERCEIRO_SETOR");
  });

  it("nome irreconhecível cai em administração direta, não em terceiro setor", () => {
    // Errar para o lado que exige MENOS do autor: um plano completo cobrado de
    // quem não devia trava a emenda por engano.
    expect(categoriaPeloNome("Depósito Central")).toBe("ADMINISTRACAO_DIRETA");
  });
});
