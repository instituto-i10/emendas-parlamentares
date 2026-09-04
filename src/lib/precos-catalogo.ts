import "server-only";

// ---------------------------------------------------------------------------
// PREÇO DE REFERÊNCIA — Banco de Preços do PNIGP.
//
// Um motor próprio que agrega contratos do PNCP inteiro e já devolve mediana,
// faixa e número de contratos por item. Substituiu a consulta direta ao
// Compras.gov.br por três razões concretas:
//
//   1. COBERTURA MUNICIPAL. O Compras.gov.br só tem compra federal. Aqui vem
//      `nMunis` — quantos municípios entraram na amostra —, que é o que
//      sustenta um preço de referência para emenda municipal.
//   2. BUSCA POR PALAVRA. O catálogo federal tem o filtro por descrição
//      quebrado (devolve zero para qualquer termo), o que nos obrigava a
//      espelhar 345 mil itens do CATMAT aqui dentro só para achar o código.
//      Some a cópia local, some o job de carga.
//   3. ENGENHARIA. SINAPI, SICRO e SIE-SC entram pelo mesmo motor, com a
//      unidade certa (M², M³, KG) — que é o que um plano de obra precisa e o
//      catálogo de materiais nunca teve.
//
// O preço continua sendo consultado AO VIVO: guardar seria servir número velho
// como referência de compra pública.
//
// Risco assumido: é API de outra aplicação, sem contrato de versão publicado.
// Por isso toda falha aqui é silenciosa e degradável — a linha continua podendo
// ser digitada à mão com a origem informada, que é como se fazia antes.
// ---------------------------------------------------------------------------

const BASE = "https://pnigp.vercel.app/api";

/** Meia hora: o mesmo item é consultado várias vezes ao montar a memória. */
const CACHE_SEGUNDOS = 1800;
const TIMEOUT_MS = 20_000;

export type OrigemPreco = "MATERIAL" | "ENGENHARIA";

export type PrecoEncontrado = {
  /** Estável dentro de uma busca — usado como `key` na lista. */
  id: string;
  origem: OrigemPreco;
  descricao: string;
  unidade: string | null;
  /** O valor que a tela sugere e que vai para a memória de cálculo. */
  mediana: number;
  /** Ausentes quando a fonte publica preço de tabela, sem dispersão. */
  menor: number | null;
  maior: number | null;
  /** Quantos contratos entraram na amostra; 0 em preço de tabela. */
  contratos: number;
  /** Quantos municípios distintos — o que dá lastro municipal ao preço. */
  municipios: number | null;
  /** "Compras municipais (SC)", "SINAPI 12/2024"… vai para a origem do preço. */
  fonte: string;
};

async function buscarJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: CACHE_SEGUNDOS },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

const numero = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// "202412" → "12/2024". A competência é a data da tabela, e sem ela o preço de
// referência não se defende: SINAPI de 2024 e SICRO de 2026 não valem o mesmo.
const competencia = (v: unknown): string => {
  const s = String(v ?? "");
  return /^\d{6}$/.test(s) ? `${s.slice(4)}/${s.slice(0, 4)}` : "";
};

// ----------------------------------------------------------------- materiais

type ItemBancoPrecos = {
  item?: string | null;
  unidade?: string | null;
  mediana?: number | null;
  faixaMin?: number | null;
  faixaMax?: number | null;
  n?: number | null;
  nMunis?: number | null;
  fonte?: string | null;
  nacMediana?: number | null;
  nacN?: number | null;
};

async function buscarMateriais(termo: string): Promise<PrecoEncontrado[]> {
  const d = await buscarJson<{ resultados?: ItemBancoPrecos[] }>(
    `${BASE}/banco-precos?q=${encodeURIComponent(termo)}`
  );
  if (!d?.resultados) return [];

  return d.resultados.flatMap((r, i) => {
    // A mediana municipal é a preferida; a nacional entra quando o item ainda
    // não tem amostra local. Sem nenhuma das duas a linha não decide nada, e é
    // melhor não ocupar espaço na lista.
    const mediana = numero(r.mediana) ?? numero(r.nacMediana);
    const descricao = (r.item ?? "").trim();
    if (!mediana || !descricao) return [];

    const municipal = numero(r.mediana) !== null;
    return [
      {
        id: `mat-${i}-${descricao.slice(0, 24)}`,
        origem: "MATERIAL" as const,
        descricao,
        unidade: r.unidade ?? null,
        mediana,
        menor: municipal ? numero(r.faixaMin) : null,
        maior: municipal ? numero(r.faixaMax) : null,
        contratos: (municipal ? r.n : r.nacN) ?? 0,
        municipios: municipal ? (r.nMunis ?? null) : null,
        fonte: municipal
          ? (r.fonte ?? "Banco de Preços — PNCP")
          : `${r.fonte ?? "Banco de Preços"} · mediana nacional`,
      },
    ];
  });
}

// ---------------------------------------------------------------- engenharia

// As três tabelas publicam o preço com nomes diferentes: o SINAPI separa
// desonerado de não desonerado, o SICRO traz um `custo` só, e o SIE-SC um
// `precoUnitario`. Aceitar os quatro aqui evita um mapeador por fonte.
type ComposicaoObra = {
  codigo?: number | string | null;
  descricao?: string | null;
  unidade?: string | null;
  custoNaoDesonerado?: number | null;
  custoDesonerado?: number | null;
  custo?: number | null;
};

type ServicoSieSc = {
  codigo?: string | null;
  descricao?: string | null;
  unidade?: string | null;
  precoUnitario?: number | null;
};

/**
 * Composições de obra — o que um plano de engenharia precisa e o catálogo de
 * materiais nunca teve: preço POR UNIDADE DE MEDIDA (m² de recapeamento, m³ de
 * concreto), que é como a meta física de uma obra é expressa.
 *
 * São preços de TABELA OFICIAL, não de contratos: por isso vêm sem faixa. A
 * dispersão não existe — o valor é o publicado na competência.
 */
async function buscarEngenharia(termo: string): Promise<PrecoEncontrado[]> {
  const caminho = encodeURIComponent(termo);

  const [sinapi, sicro, siesc] = await Promise.all([
    buscarJson<{ composicoes?: ComposicaoObra[]; competencia?: unknown }>(
      `${BASE}/sinapi-precos/${caminho}`
    ),
    buscarJson<{ composicoes?: ComposicaoObra[]; competencia?: unknown }>(
      `${BASE}/sicro-precos/${caminho}`
    ),
    buscarJson<{ servicos?: ServicoSieSc[]; competencia?: unknown }>(
      `${BASE}/siesc-precos/${caminho}`
    ),
  ]);

  const deComposicoes = (
    lista: ComposicaoObra[] | undefined,
    sigla: string,
    comp: string,
    prefixo: string
  ): PrecoEncontrado[] =>
    (lista ?? []).flatMap((c) => {
      // O custo DESONERADO vale quando a obra é executada por empresa com folha
      // desonerada; na dúvida, o não desonerado é o mais alto — e portanto o
      // mais conservador para estimar uma emenda. `custo` é o do SICRO, que não
      // faz essa distinção.
      const preco =
        numero(c.custoNaoDesonerado) ?? numero(c.custoDesonerado) ?? numero(c.custo);
      const descricao = (c.descricao ?? "").trim();
      if (!preco || !descricao) return [];
      return [
        {
          id: `${prefixo}-${c.codigo}`,
          origem: "ENGENHARIA" as const,
          descricao,
          unidade: c.unidade ?? null,
          mediana: preco,
          menor: null,
          maior: null,
          contratos: 0,
          municipios: null,
          fonte: `${sigla}${comp ? ` ${comp}` : ""} · código ${c.codigo}`,
        },
      ];
    });

  const deServicos = (
    lista: ServicoSieSc[] | undefined,
    comp: string
  ): PrecoEncontrado[] =>
    (lista ?? []).flatMap((s) => {
      const preco = numero(s.precoUnitario);
      const descricao = (s.descricao ?? "").trim();
      if (!preco || !descricao) return [];
      return [
        {
          id: `siesc-${s.codigo}`,
          origem: "ENGENHARIA" as const,
          descricao,
          unidade: s.unidade ?? null,
          mediana: preco,
          menor: null,
          maior: null,
          contratos: 0,
          municipios: null,
          fonte: `SIE-SC${comp ? ` ${comp}` : ""} · código ${s.codigo}`,
        },
      ];
    });

  return [
    ...deComposicoes(sinapi?.composicoes, "SINAPI", competencia(sinapi?.competencia), "sinapi"),
    ...deComposicoes(sicro?.composicoes, "SICRO", competencia(sicro?.competencia), "sicro"),
    ...deServicos(siesc?.servicos, competencia(siesc?.competencia)),
  ];
}

// --------------------------------------------------------------- relevância

const semAcento = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * As três tabelas de obra casam por SUBSTRING: buscar "cadeira" devolve oito
 * "braçadeira" antes de qualquer cadeira. Aqui a palavra inteira vale mais que
 * o pedaço de palavra — é a diferença entre o item que o vereador procurou e o
 * item que por acaso contém as mesmas letras.
 *
 *   2 · todas as palavras da busca aparecem inteiras na descrição
 *   1 · alguma aparece inteira
 *   0 · só como pedaço de outra palavra
 */
function relevancia(descricao: string, termo: string): number {
  const palavras = semAcento(termo).split(/\s+/).filter(Boolean);
  if (!palavras.length) return 0;

  const alvo = semAcento(descricao);
  const inteiras = palavras.filter((p) =>
    new RegExp(`(^|[^a-z0-9])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(alvo)
  ).length;

  if (inteiras === palavras.length) return 2;
  return inteiras > 0 ? 1 : 0;
}

/** Quantas linhas a tela mostra. Cinco à vista, o resto rola. */
const LIMITE = 12;

/**
 * Busca preços para a memória de cálculo.
 *
 * `engenharia` desempata a ORDEM, não filtra o conteúdo: num plano de obra as
 * composições por m² vêm primeiro, porque é nelas que a meta física é medida;
 * num plano de custeio ou equipamento, os materiais. Nenhum dos dois é
 * escondido — obra também compra material, e equipamento às vezes exige
 * serviço de instalação.
 */
export async function buscarPrecos(
  termo: string,
  engenharia = false
): Promise<PrecoEncontrado[]> {
  if (termo.trim().length < 3) return [];

  const [materiais, obras] = await Promise.all([
    buscarMateriais(termo),
    buscarEngenharia(termo),
  ]);

  const preferida: OrigemPreco = engenharia ? "ENGENHARIA" : "MATERIAL";

  // A relevância vem ANTES da origem: uma cadeira de escritório com preço de
  // contrato serve mais a um plano de obra do que oito braçadeiras que só
  // casaram por causa das letras. A origem preferida decide o empate — dentro
  // da mesma relevância, é a composição por m² que abre a lista num plano de
  // obra, e o material num plano de custeio.
  return [...obras, ...materiais]
    .map((item, i) => ({ item, i, r: relevancia(item.descricao, termo) }))
    .sort(
      (a, b) =>
        b.r - a.r ||
        Number(b.item.origem === preferida) - Number(a.item.origem === preferida) ||
        a.i - b.i
    )
    .slice(0, LIMITE)
    .map((x) => x.item);
}
