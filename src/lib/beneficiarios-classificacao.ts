// ---------------------------------------------------------------------------
// Categoria do beneficiário final — palpite inicial a partir do nome.
//
// A categoria não é rótulo: ela define o RITO. Terceiro setor leva plano de
// trabalho completo (justificativa, objetivo, declaração e planilha);
// administração direta e indireta levam só a justificativa.
//
// Por isso o palpite é sempre REVISÁVEL em Configurações → Beneficiários. O que
// esta função faz é poupar digitação, não decidir natureza jurídica.
//
// Módulo puro (sem "use server"): assim dá para testar.
// ---------------------------------------------------------------------------

export type CategoriaBeneficiario =
  | "ADMINISTRACAO_DIRETA"
  | "ADMINISTRACAO_INDIRETA"
  | "TERCEIRO_SETOR";

// Autarquias, fundações e empresas públicas municipais — pessoa jurídica
// própria, separada da Prefeitura.
//
// "fundação" não entra sozinha de propósito: fundação privada sem fins
// lucrativos é terceiro setor. Só casam as combinações que identificam uma
// fundação PÚBLICA, mais as siglas que aparecem na base de Mogi Guaçu.
const INDIRETA =
  /autarquia|servi[çc]o aut[ôo]nomo|\bsaae\b|\bsamae\b|\bdae\b|companhia|empresa p[úu]blica|sociedade de economia mista|instituto de previd[êe]ncia|\bipmg\b|funda[çc][ãa]o\s+(municipal|educacional|cultural|de\s+sa[úu]de)|\bfeg\b/i;

// Secretarias, fundos e equipamentos do próprio município.
const DIRETA =
  /^(secretaria|sec\.|ssm|som\b|saama|sub\s?prefeitura|fundo municipal|guarda|emef|emeb|emei|cei\b|ubs|usf|ceo\b|caps|hospital municipal|centro esportivo|sub prefeitura|prefeitura|c[âa]mara)/i;

// Entidades sem fins lucrativos.
const TERCEIRO =
  /associa|institut|\blar\b|casa d|apae|polem|santa casa|vinha|[áa]gape|acolhem|pastoral|igreja|par[óo]quia|corpora[çc][ãa]o|apm\b|casmo[çc]u|calvi|camp\b|cars\b|centro dia|mais vida|anjos|ex[ée]rcito/i;

/**
 * Categoria provável do beneficiário pelo nome.
 *
 * A ordem importa: indireta é testada primeiro, porque "fundação municipal"
 * casaria também com o padrão do terceiro setor ("institut", "fundação").
 * O padrão é administração direta — é a categoria mais comum e a que menos
 * exige do autor; classificar de menos é melhor que exigir de mais de quem
 * não devia.
 */
export function categoriaPeloNome(nome: string): CategoriaBeneficiario {
  if (INDIRETA.test(nome)) return "ADMINISTRACAO_INDIRETA";
  if (DIRETA.test(nome)) return "ADMINISTRACAO_DIRETA";
  if (TERCEIRO.test(nome)) return "TERCEIRO_SETOR";
  return "ADMINISTRACAO_DIRETA";
}
