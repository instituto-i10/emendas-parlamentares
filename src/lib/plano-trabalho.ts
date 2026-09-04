// ---------------------------------------------------------------------------
// Plano de trabalho da EMENDA — regras puras (servidor e cliente).
//
// Não confundir com o plano de trabalho da PARCERIA (art. 22 da Lei
// 13.019/2014). Aquele, com metodologia, equipe e prestação de contas, é
// elaborado depois, na celebração do termo de fomento ou colaboração, pela
// própria entidade. Aqui é o que o vereador apresenta junto da emenda.
//
// Os quatro modelos pedem o MESMO NÚCLEO — metas físicas, memória de cálculo
// com origem do preço e cronograma de desembolso previsto. O que separa o
// Modelo III é o rito: entidade identificada, sete declarações e assinatura, e
// o preenchimento feito por ELA, pelo link, porque meta física e preço
// praticado são informação que só ela tem.
//
// Qual modelo vale sai da dotação — ver `plano-modelo.ts`.
// ---------------------------------------------------------------------------

import {
  exigenciasDoModelo,
  type ModeloPlano,
} from "./plano-modelo";

/** Linha das metas: o que será entregue, em número, e como se comprova. */
export type Meta = {
  beneficiarios: string;
  unidade: string;
  metaFisica: number;
  comprovacao: string;
};

/** Linha da memória de cálculo: a mesma entrega das metas, com preço. */
export type ItemMemoria = {
  beneficiarios: string;
  metaFisica: number;
  valorUnitario: number;
  origemPreco: string;
};

/** Parcela do desembolso previsto. A ordem é a própria posição na lista. */
export type Parcela = { valor: number };

export const DECLARACOES = [
  "declIdentificacao",
  "declConstituicao",
  "declAdimplencia",
  "declParentesco",
  "declSancoes",
  "declFichaLimpa",
  "declResponsabilidade",
] as const;

export type DeclaracaoChave = (typeof DECLARACOES)[number];

/**
 * Os itens obrigatórios da declaração da OSC, em resumo. O texto integral é do
 * documento assinado; aqui vale o rótulo que a pessoa lê na tela antes de
 * marcar.
 */
export const ROTULO_DECLARACAO: Record<DeclaracaoChave, string> = {
  declIdentificacao: "Identificação completa",
  declConstituicao: "Regularidade de constituição",
  declAdimplencia: "Adimplência em prestações de contas",
  declParentesco: "Ausência de parentesco e conflito de interesses",
  declSancoes: "Inexistência de sanções ativas",
  declFichaLimpa: "Ficha limpa dos dirigentes",
  declResponsabilidade: "Cláusula de responsabilidade",
};

export const AJUDA_DECLARACAO: Record<DeclaracaoChave, string> = {
  declIdentificacao: "Razão social, CNPJ, endereço e representante legal.",
  declConstituicao: "A entidade está regularmente constituída.",
  declAdimplencia: "Nenhuma parceria anterior com contas em aberto.",
  declParentesco:
    "Nenhum dirigente é agente público do órgão celebrante, nem parente até o 2º grau.",
  declSancoes: "Sem suspensão nem declaração de inidoneidade.",
  declFichaLimpa: "Sem contas rejeitadas nos últimos 8 anos nem improbidade.",
  declResponsabilidade: "Declaramos sob as penas da lei.",
};

/** Identificação de quem assinou — Lei 14.063/2020, art. 4º, I. */
export type Assinatura = {
  nome: string;
  cpf: string;
  cargo: string;
  email: string;
};

export type DadosPlano = {
  metas: Meta[];
  itens: ItemMemoria[];
  parcelas: Parcela[];
  // Só o Modelo III preenche daqui para baixo.
  entidadeRazaoSocial: string;
  entidadeCnpj: string;
  entidadeAnos: number | null;
  orgaoRepassador: string;
  declaracoes: Record<DeclaracaoChave, boolean>;
  /** `null` enquanto não assinado. */
  assinatura: Assinatura | null;
};

export const PLANO_VAZIO: DadosPlano = {
  metas: [{ beneficiarios: "", unidade: "", metaFisica: 0, comprovacao: "" }],
  itens: [{ beneficiarios: "", metaFisica: 1, valorUnitario: 0, origemPreco: "" }],
  parcelas: [{ valor: 0 }],
  entidadeRazaoSocial: "",
  entidadeCnpj: "",
  entidadeAnos: null,
  orgaoRepassador: "",
  declaracoes: Object.fromEntries(DECLARACOES.map((d) => [d, false])) as Record<
    DeclaracaoChave,
    boolean
  >,
  assinatura: null,
};

export const totalItem = (i: ItemMemoria): number => i.metaFisica * i.valorUnitario;

export const totalMemoria = (itens: ItemMemoria[]): number =>
  itens.reduce((soma, i) => soma + totalItem(i), 0);

export const totalCronograma = (parcelas: Parcela[]): number =>
  parcelas.reduce((soma, p) => soma + p.valor, 0);

// Um centavo de folga: os valores são digitados em reais e o arredondamento de
// meta física × unitário não pode reprovar um plano correto.
const TOLERANCIA = 0.01;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const soDigitos = (s: string) => s.replace(/\D/g, "");

/** Linhas que de fato foram preenchidas — a linha em branco do formulário não conta. */
const metasPreenchidas = (metas: Meta[]) => metas.filter((m) => m.beneficiarios.trim());
const itensPreenchidos = (itens: ItemMemoria[]) =>
  itens.filter((i) => i.beneficiarios.trim());
const parcelasPreenchidas = (parcelas: Parcela[]) => parcelas.filter((p) => p.valor > 0);

/**
 * O que ainda falta no plano. Lista vazia = pronto para seguir.
 *
 * `valorEmenda` entra para conferir o fechamento da memória e do cronograma;
 * passe 0 para pular essa conferência (rascunho sem valor definido).
 */
export function pendenciasDoPlano(
  plano: DadosPlano | null,
  modelo: ModeloPlano | null,
  valorEmenda: number
): string[] {
  if (!modelo) return ["escolher a dotação — é ela que define o plano de trabalho"];
  if (!plano) return ["preencher o plano de trabalho"];

  const exige = exigenciasDoModelo(modelo);
  const faltando: string[] = [];

  // ------------------------------------------------------ núcleo comum ----
  const metas = metasPreenchidas(plano.metas);
  if (metas.length === 0) {
    faltando.push("informar ao menos uma meta");
  } else if (
    metas.some((m) => !(m.metaFisica > 0) || !m.comprovacao.trim() || !m.unidade.trim())
  ) {
    faltando.push("completar as metas: toda linha precisa de unidade, meta física e forma de comprovação");
  }

  const itens = itensPreenchidos(plano.itens);
  if (itens.length === 0) {
    faltando.push("lançar a memória de cálculo");
  } else {
    if (itens.some((i) => !i.origemPreco.trim())) {
      faltando.push("informar a origem do preço em toda linha da memória de cálculo");
    }
    const total = totalMemoria(itens);
    if (valorEmenda > 0 && Math.abs(total - valorEmenda) > TOLERANCIA) {
      faltando.push(
        `fechar a memória de cálculo: ela soma ${brl(total)} e a emenda é de ${brl(valorEmenda)}`
      );
    }
  }

  const parcelas = parcelasPreenchidas(plano.parcelas);
  if (parcelas.length === 0) {
    faltando.push("informar o cronograma de desembolso previsto");
  } else {
    const total = totalCronograma(parcelas);
    if (valorEmenda > 0 && Math.abs(total - valorEmenda) > TOLERANCIA) {
      faltando.push(
        `fechar o cronograma: as parcelas somam ${brl(total)} e a emenda é de ${brl(valorEmenda)}`
      );
    }
  }

  // --------------------------------------------------- rito do Modelo III --
  if (exige.entidade) {
    if (!plano.entidadeRazaoSocial.trim()) faltando.push("a razão social da entidade");
    if (soDigitos(plano.entidadeCnpj).length !== 14) faltando.push("o CNPJ da entidade");
    // Art. 33, V, "a", da Lei 13.019/2014: mínimo de 1 ano de existência.
    if (plano.entidadeAnos == null) {
      faltando.push("o tempo de existência da entidade");
    } else if (plano.entidadeAnos < 1) {
      faltando.push(
        "atender ao mínimo de 1 ano de existência da entidade (art. 33 da Lei 13.019/2014)"
      );
    }
    if (!plano.orgaoRepassador.trim()) faltando.push("o órgão repassador");
  }

  if (exige.declaracoes) {
    const naoAssinadas = DECLARACOES.filter((d) => !plano.declaracoes[d]).length;
    if (naoAssinadas > 0) {
      faltando.push(
        naoAssinadas === 1
          ? "assinar 1 declaração da entidade"
          : `assinar ${naoAssinadas} declarações da entidade`
      );
    }
  }

  if (exige.assinatura && !plano.assinatura) {
    faltando.push("a assinatura do representante legal da entidade");
  }

  return faltando;
}
