// ---------------------------------------------------------------------------
// Nome por extenso do elemento de despesa — Portaria Interministerial
// STN/SOF nº 163/2001.
//
// Existe porque o vereador não reconhece a despesa pelo código: "3.3.90.30" não
// diz nada, "Material de Consumo" diz. Apontamento do jurídico do cliente sobre
// a tela de escolha da dotação.
//
// Usada em dois caminhos: o seed da base de Mogi Guaçu e a importação de uma
// base nova a partir do projeto de lei (que só traz códigos).
// ---------------------------------------------------------------------------

export const NOME_NATUREZA: Record<string, string> = {
  "3.1.90.04": "Contratação por Tempo Determinado",
  "3.1.90.11": "Vencimentos e Vantagens Fixas — Pessoal Civil",
  "3.1.90.13": "Obrigações Patronais",
  "3.1.90.16": "Outras Despesas Variáveis — Pessoal Civil",
  "3.1.91.13": "Obrigações Patronais — Intra-Orçamentárias",
  "3.3.90.08": "Outros Benefícios Assistenciais",
  "3.3.90.14": "Diárias — Pessoal Civil",
  "3.3.90.30": "Material de Consumo",
  "3.3.90.32": "Material de Distribuição Gratuita",
  "3.3.90.33": "Passagens e Despesas com Locomoção",
  "3.3.90.35": "Serviços de Consultoria",
  "3.3.90.36": "Outros Serviços de Terceiros — Pessoa Física",
  "3.3.90.37": "Locação de Mão de Obra",
  "3.3.90.39": "Outros Serviços de Terceiros — Pessoa Jurídica",
  "3.3.90.40": "Serviços de Tecnologia da Informação",
  "3.3.90.46": "Auxílio-Alimentação",
  "3.3.90.47": "Obrigações Tributárias e Contributivas",
  "3.3.90.48": "Outros Auxílios Financeiros a Pessoas Físicas",
  "3.3.90.49": "Auxílio-Transporte",
  "3.3.90.93": "Indenizações e Restituições",
  "3.3.50.39": "Outros Serviços de Terceiros — PJ (Entidades sem fins lucrativos)",
  "3.3.50.43": "Subvenções Sociais",
  "3.3.71.70": "Rateio pela Participação em Consórcio Público",
  "3.2.90.21": "Juros sobre a Dívida por Contrato",
  "4.4.90.51": "Obras e Instalações",
  "4.4.90.52": "Equipamentos e Material Permanente",
  "4.4.90.61": "Aquisição de Imóveis",
  "4.4.50.42": "Auxílios (Entidades sem fins lucrativos)",
  "4.6.90.71": "Principal da Dívida Contratual Resgatado",
};

/** Nome por extenso da natureza; `null` quando o código não está na tabela. */
export function nomeNatureza(codigo: string): string | null {
  return NOME_NATUREZA[codigo.trim()] ?? null;
}

/**
 * Grupo 1 da natureza da despesa = Pessoal e Encargos Sociais.
 * Usado na vedação do art. 140, § 7º, da Lei Orgânica de Mogi Guaçu: a parcela
 * da saúde não pode custear pessoal nem encargos sociais.
 */
export function ehPessoalEEncargos(grupo: string): boolean {
  return grupo.trim() === "1";
}
