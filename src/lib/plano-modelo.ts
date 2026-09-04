// ---------------------------------------------------------------------------
// QUAL MODELO DE PLANO DE TRABALHO — regra pura, sem I/O.
//
// São quatro formulários oficiais, e o vereador não escolhe entre eles: o
// modelo sai da DOTAÇÃO que ele já apontou no bloco 1. Escolher onde o dinheiro
// entra é escolher o formulário, e pedir a mesma coisa duas vezes seria atrito
// puro — a diretriz do jurídico do cliente é "o mais simples possível".
//
//   Modelo I   — CUSTEIO        despesa corrente executada pelo Município
//   Modelo II  — OBRAS          obras e serviços de engenharia
//   Modelo III — TERCEIRO SETOR repasse a entidade sem fins lucrativos
//   Modelo IV  — EQUIPAMENTOS   bem permanente
//
// A natureza da despesa é lida por PARTES, não pelo código montado: o código
// "3.3.50.43" é categoria(3).grupo(3).modalidade(50).elemento(43), e é a
// modalidade 50 — transferência a instituição privada sem fins lucrativos —
// que denuncia o repasse. Comparar a string inteira quebraria no primeiro
// município que escreve "33504300" ou "3.3.50.43.00".
// ---------------------------------------------------------------------------

export type ModeloPlano = "CUSTEIO" | "OBRAS" | "TERCEIRO_SETOR" | "EQUIPAMENTOS";

/** O que a regra precisa saber da natureza da despesa. */
export type NaturezaParaModelo = {
  /** "1" pessoal · "3" outras despesas correntes · "4" investimentos. */
  grupo: string;
  /** "50" transferência a instituição privada sem fins lucrativos · "90" aplicação direta. */
  modalidadeAplicacao: string;
  /** "51" obras · "52" equipamentos · "43" subvenções · "30" material… */
  elemento: string;
};

// Espaços e zeros à esquerda aparecem em base importada de prefeitura. Sem
// normalizar, "05" nunca casaria com "5" e a emenda cairia no modelo errado.
const parte = (v: string | null | undefined) => (v ?? "").trim().replace(/^0+(?=\d)/, "");

/**
 * O modelo do plano para uma emenda.
 *
 * `null` quando ainda não há dotação: a tela não tem como saber o formulário
 * antes de o dinheiro ter endereço, e fingir um padrão faria o vereador
 * preencher campos que depois sumiriam.
 */
export function derivarModeloPlano(
  natureza: NaturezaParaModelo | null | undefined,
  beneficiarioTipo: string | null | undefined
): ModeloPlano | null {
  // O terceiro setor vem ANTES de tudo porque não muda só o formulário: muda
  // QUEM preenche. Meta física, preço praticado e forma de comprovação são
  // informação que só a entidade tem, e o plano passa a viver no link enviado
  // a ela. Errar aqui é pedir ao vereador o que ele não sabe responder.
  if (beneficiarioTipo === "TERCEIRO_SETOR") return "TERCEIRO_SETOR";

  if (!natureza) return null;

  const grupo = parte(natureza.grupo);
  const modalidade = parte(natureza.modalidadeAplicacao);
  const elemento = parte(natureza.elemento);

  // Modalidade 50 é repasse a instituição privada sem fins lucrativos — seja
  // subvenção (3.3.50.43) ou auxílio (4.4.50.42). A dotação por si só já diz
  // que há terceiro setor no outro lado, mesmo que o cadastro do beneficiário
  // ainda não tenha sido preenchido.
  if (modalidade === "50") return "TERCEIRO_SETOR";

  if (grupo === "4") {
    // 51 é obras e instalações; o resto do grupo 4 é bem permanente. A separação
    // importa porque obra tem unidade de medida de engenharia e preço de tabela
    // oficial (SINAPI/CPOS), enquanto equipamento tem especificação e preço de
    // mercado.
    return elemento === "51" ? "OBRAS" : "EQUIPAMENTOS";
  }

  // Grupos 1, 2 e 3 são despesa corrente. Pessoal (grupo 1) chega aqui também:
  // é custeio, e quem barra a emenda de pessoal na saúde é o motor de validação
  // (LOM art. 140 §7º), não a escolha do formulário.
  return "CUSTEIO";
}

export const ROTULO_MODELO_PLANO: Record<ModeloPlano, string> = {
  CUSTEIO: "Modelo I — Custeio",
  OBRAS: "Modelo II — Obras e serviços de engenharia",
  TERCEIRO_SETOR: "Modelo III — Repasse a entidade do terceiro setor",
  EQUIPAMENTOS: "Modelo IV — Equipamentos e material permanente",
};

export type ExigenciasModelo = {
  /** Razão social, CNPJ, tempo de existência e órgão repassador. */
  entidade: boolean;
  /** As sete declarações obrigatórias da OSC. */
  declaracoes: boolean;
  /** Assinatura eletrônica simples do representante legal. */
  assinatura: boolean;
  /**
   * O plano é preenchido pela entidade, por link, e NÃO aparece na tela do
   * vereador. Nos demais modelos quem executa é o Município e o autor preenche
   * ali mesmo — gerar link não faria sentido.
   */
  preenchidoPelaEntidade: boolean;
};

/**
 * Metas, memória de cálculo e cronograma são exigidos nos quatro modelos — por
 * isso não são bandeira aqui. O que varia é o rito do terceiro setor.
 */
export function exigenciasDoModelo(modelo: ModeloPlano | null): ExigenciasModelo {
  const terceiroSetor = modelo === "TERCEIRO_SETOR";
  return {
    entidade: terceiroSetor,
    declaracoes: terceiroSetor,
    assinatura: terceiroSetor,
    preenchidoPelaEntidade: terceiroSetor,
  };
}
