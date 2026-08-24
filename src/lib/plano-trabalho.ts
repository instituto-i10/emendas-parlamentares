// ---------------------------------------------------------------------------
// Plano de trabalho SIMPLIFICADO — regras puras (servidor e cliente).
//
// Não confundir com o plano de trabalho do MROSC (Lei 13.019/2014). Aquele,
// com metas no formato Audesp, matriz de indicadores, memória de cálculo de RH,
// rateio de custos indiretos e cronograma de desembolso, é elaborado na
// EXECUÇÃO ORÇAMENTÁRIA, quando o município for repassar o recurso.
//
// Aqui, na apresentação da emenda, vale o mínimo definido pelo jurídico do
// cliente — e a categoria do beneficiário é que decide o quê:
//
//   terceiro setor          → justificativa + objetivo + declaração + planilha
//   administração direta    → só a justificativa
//   administração indireta  → só a justificativa
//
// E "só a justificativa", na administração pública, é A JUSTIFICATIVA DA
// EMENDA — não uma segunda. Ver `reusaJustificativaDaEmenda` abaixo.
// ---------------------------------------------------------------------------

export type CategoriaBeneficiario =
  | "ADMINISTRACAO_DIRETA"
  | "ADMINISTRACAO_INDIRETA"
  | "TERCEIRO_SETOR";

export type ExigenciasPlano = {
  /** A justificativa é exigida em todas as categorias. */
  objetivo: boolean;
  declaracao: boolean;
  planilha: boolean;
};

export function exigenciasDoPlano(
  categoria: CategoriaBeneficiario | null
): ExigenciasPlano {
  const terceiroSetor = categoria === "TERCEIRO_SETOR";
  return { objetivo: terceiroSetor, declaracao: terceiroSetor, planilha: terceiroSetor };
}

export const TEXTO_DECLARACAO =
  "Declaro, sob as penas da lei, que a entidade atende a todos os requisitos " +
  "exigidos para o recebimento de repasse de recursos do poder público, que se " +
  "encontra regularmente constituída e em funcionamento, e que os recursos " +
  "serão aplicados exclusivamente no objeto desta emenda.";

/**
 * A justificativa do plano é a própria justificativa da emenda, exceto no
 * terceiro setor.
 *
 * Motivo: no terceiro setor quem escreve é a ENTIDADE, pelo link, e o texto
 * dela não pode sobrescrever o do vereador — são duas vozes. Na administração
 * pública não há entidade externa nenhuma: é o mesmo vereador, na mesma tela,
 * e pedir o mesmo texto duas vezes é atrito puro. A diretriz do jurídico do
 * cliente é "tudo tem que ser o mais simples possível".
 *
 * Categoria ainda não escolhida entra aqui também: duas das três categorias
 * reutilizam, e o campo separado só aparece quando o terceiro setor é
 * escolhido.
 */
export function reusaJustificativaDaEmenda(
  categoria: CategoriaBeneficiario | null
): boolean {
  return categoria !== "TERCEIRO_SETOR";
}

export type ItemPlanilha = {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
};

export type DadosPlano = {
  justificativa: string;
  objetivo: string;
  declaracaoAceita: boolean;
  itens: ItemPlanilha[];
};

/**
 * O plano como ele vale para a conferência: na administração pública, com a
 * justificativa da emenda no lugar da do plano.
 *
 * Aplicado no MOTOR, não só na tela — assim uma emenda de administração direta
 * sem linha de `PlanoTrabalho` no banco não é pendência, porque não há nada a
 * preencher além do que já está na emenda.
 */
export function planoEfetivo(
  plano: DadosPlano | null,
  categoria: CategoriaBeneficiario | null,
  justificativaDaEmenda: string
): DadosPlano | null {
  if (!reusaJustificativaDaEmenda(categoria)) return plano;
  return {
    justificativa: justificativaDaEmenda,
    objetivo: plano?.objetivo ?? "",
    declaracaoAceita: plano?.declaracaoAceita ?? false,
    itens: plano?.itens ?? [],
  };
}

export function totalItem(i: ItemPlanilha): number {
  return i.quantidade * i.valorUnitario;
}

export function totalPlanilha(itens: ItemPlanilha[]): number {
  return itens.reduce((soma, i) => soma + totalItem(i), 0);
}

// Um centavo de folga: a planilha é digitada em reais e o arredondamento de
// quantidade × unitário não pode reprovar um plano correto.
const TOLERANCIA = 0.01;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * O que ainda falta no plano. Lista vazia = pronto para seguir.
 * `valorEmenda` entra só para conferir o fechamento da planilha; passe 0 para
 * pular essa conferência (rascunho sem valor definido).
 */
export function pendenciasDoPlano(
  plano: DadosPlano | null,
  categoria: CategoriaBeneficiario | null,
  valorEmenda: number
): string[] {
  if (!plano) return ["preencher o plano de trabalho"];

  const exige = exigenciasDoPlano(categoria);
  const faltando: string[] = [];

  if (!plano.justificativa.trim())
    faltando.push(
      reusaJustificativaDaEmenda(categoria)
        ? "justificativa da emenda"
        : "justificativa do plano"
    );
  if (exige.objetivo && !plano.objetivo.trim()) faltando.push("objetivo");
  if (exige.declaracao && !plano.declaracaoAceita) faltando.push("declaração da entidade");

  if (exige.planilha) {
    const itens = plano.itens.filter((i) => i.descricao.trim());
    if (itens.length === 0) {
      faltando.push("planilha orçamentária");
    } else {
      const total = totalPlanilha(itens);
      if (valorEmenda > 0 && Math.abs(total - valorEmenda) > TOLERANCIA) {
        faltando.push(
          `fechar a planilha: ela soma ${brl(total)} e a emenda é de ${brl(valorEmenda)}`
        );
      }
    }
  }

  return faltando;
}
