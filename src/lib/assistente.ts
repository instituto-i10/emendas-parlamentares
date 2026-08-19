import "server-only";
import { getAnoAtivo } from "./exercicio";
import { getDados360, brl, brlCompacto } from "./queries-360";
import { ROTULO_STATUS_EMENDA } from "./rotulos";

// ============================================================================
// Assistente — a camada de dados.
//
// O modelo NUNCA consulta o banco: recebe um bloco de fatos já apurado aqui e
// responde só sobre ele. É o que mantém a promessa do produto — "só afirma o
// que o dado sustenta" — mesmo com um LLM no meio.
// ============================================================================

export const PERGUNTAS_SUGERIDAS = [
  "Qual o teto e como está dividido?",
  "A reserva da saúde está sendo respeitada?",
  "Quais os maiores destinos?",
  "Quem está acima da cota?",
  "O que falta fechar?",
];

export type ContextoAssistente = {
  ano: number | null;
  fatos: string;
};

// Bloco factual em texto puro. Compacto de propósito: cabe no prompt e é
// legível por humano na hora de auditar uma resposta.
export async function montarContexto(): Promise<ContextoAssistente> {
  const ano = await getAnoAtivo();
  const { params, consolidado: c, porAutor, porDestino, porStatus, porTipo } =
    await getDados360(ano);

  const pct = (v: number, base: number | null) =>
    base && base > 0 ? ` (${Math.round((v / base) * 100)}%)` : "";

  const linhas: string[] = [
    `EXERCÍCIO: ${ano ?? "nenhum ativo"}`,
    "",
    "PARÂMETROS",
    `- Cota por autor: ${params.cotaPorAutor != null ? brl(params.cotaPorAutor) : "não definida"}`,
    `- Nº de autores considerados: ${c.totalAutores}`,
    `- Teto global: ${c.tetoGlobal != null ? brl(c.tetoGlobal) : "não definido"}`,
    `- Reserva da saúde: ${params.reservaSaudePct != null ? `${params.reservaSaudePct}% da cota` : "não definida"}`,
    `- Piso de saúde global: ${c.pisoSaudeGlobal != null ? brl(c.pisoSaudeGlobal) : "—"}`,
    `- Limite das demais áreas: ${c.limiteDemaisGlobal != null ? brl(c.limiteDemaisGlobal) : "—"}`,
    `- Função orçamentária da saúde: ${params.funcaoSaudeCodigo}`,
    `- RCL: ${params.rcl != null ? brl(params.rcl) : "não informada"}`,
    `- Percentual impositivo: ${params.percentualImpositivo != null ? `${params.percentualImpositivo}%` : "não informado"}`,
    "",
    "CONSOLIDADO",
    `- Emendas apresentadas: ${c.qtd}, somando ${brl(c.valor)}${pct(c.valor, c.tetoGlobal)} do teto`,
    `- Autores com emenda: ${c.autoresComEmenda} de ${c.totalAutores}`,
    `- Em saúde: ${brl(c.valorSaude)} em ${c.qtdSaude} itens`,
    `- Demais áreas: ${brl(c.valorDemais)} em ${c.qtdDemais} itens`,
    `- Reserva da saúde: ${
      c.limiteDemaisGlobal == null
        ? "sem checagem (parâmetro ausente)"
        : c.valorDemais <= c.limiteDemaisGlobal + 0.5
          ? "respeitada — demais áreas dentro do limite"
          : `INVADIDA em ${brl(c.valorDemais - c.limiteDemaisGlobal)}`
    }`,
    "",
    "POR SITUAÇÃO",
    ...porStatus.map(
      (s) =>
        `- ${ROTULO_STATUS_EMENDA[s.status] ?? s.status}: ${s.qtd} emendas, ${brl(s.valor)}`
    ),
    "",
    "POR TIPO",
    ...porTipo.map((t) => `- ${t.status}: ${t.qtd} emendas, ${brl(t.valor)}`),
    "",
    "MAIORES DESTINOS (por valor)",
    ...porDestino
      .slice(0, 8)
      .map(
        (d) =>
          `- ${d.nome}: ${brl(d.valor)} em ${d.itens} emendas (saúde: ${brlCompacto(d.valorSaude)})`
      ),
    "",
    "POR AUTOR",
    ...porAutor.map((a) => {
      const usoCota =
        params.cotaPorAutor != null && params.cotaPorAutor > 0
          ? ` — ${Math.round((a.valorTotal / params.cotaPorAutor) * 100)}% da cota`
          : "";
      const acima =
        params.cotaPorAutor != null && a.valorTotal > params.cotaPorAutor + 0.5
          ? " [ACIMA DA COTA]"
          : "";
      const reserva =
        c.limiteDemaisAutor != null && a.valorDemais > c.limiteDemaisAutor + 0.5
          ? " [RESERVA DA SAÚDE INVADIDA]"
          : "";
      return `- ${a.nome}: ${a.itens} itens, total ${brl(a.valorTotal)}${usoCota} (saúde ${brl(a.valorSaude)}, demais ${brl(a.valorDemais)})${acima}${reserva}`;
    }),
  ];

  return { ano, fatos: linhas.join("\n") };
}

export const INSTRUCAO_SISTEMA = `Você é o assistente da plataforma Emendas360, usada por câmaras municipais e prefeituras para gerir emendas parlamentares ao orçamento (regime impositivo).

REGRAS INVIOLÁVEIS
1. Responda EXCLUSIVAMENTE com base no bloco DADOS fornecido. Se a resposta não estiver ali, diga que o dado não está no exercício carregado e sugira onde olhar na plataforma.
2. Nunca invente números, nomes ou normas. Nunca estime.
3. Você NÃO decide mérito de emenda, não recomenda aprovar ou rejeitar e não cria despesa. O juízo e a assinatura são do parlamentar e da comissão. Se pedirem uma decisão, explique que você organiza e confere, e que a decisão é do relator.
4. Não trate dado pessoal. Nomes de autores são dado público do processo legislativo.

ESTILO
- Português do Brasil, tom técnico e direto, sem saudação.
- No máximo 4 frases curtas ou uma lista de até 5 itens.
- Traga os números que sustentam a afirmação, formatados como no bloco DADOS.
- Termine sempre com uma linha começando por "Fonte:" indicando de onde veio (ex.: "Fonte: parâmetros de validação · emendas do exercício").`;

// Resposta local, sem modelo: casa a pergunta com o fato correspondente. É o
// que roda quando OPENAI_API_KEY não está configurada.
export function responderLocalmente(
  pergunta: string,
  ctx: ContextoAssistente
): string {
  const p = pergunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const secao = (titulo: string) => {
    const blocos = ctx.fatos.split("\n\n");
    return blocos.find((b) => b.startsWith(titulo)) ?? "";
  };

  if (/(teto|cota|parametro|limite|reserva|saude)/.test(p)) {
    return `${secao("PARÂMETROS")}\n\n${secao("CONSOLIDADO")}\n\nFonte: parâmetros de validação e emendas do exercício ${ctx.ano ?? "—"}.`;
  }
  if (/(destino|orgao|órgão|beneficiario|onde vai)/.test(p)) {
    return `${secao("MAIORES DESTINOS (por valor)")}\n\nFonte: agregado por órgão da dotação.`;
  }
  if (/(autor|vereador|quem)/.test(p)) {
    return `${secao("POR AUTOR")}\n\nFonte: agregado por autor.`;
  }
  if (/(situacao|status|falta|pendente|fechar|parecer|sanear)/.test(p)) {
    return `${secao("POR SITUAÇÃO")}\n\nFonte: situação registrada das emendas.`;
  }
  return `Sem a chave da OpenAI configurada eu respondo apenas os recortes já apurados do exercício ${ctx.ano ?? "—"}: teto e cota, reserva da saúde, maiores destinos, uso por autor e situação das emendas. Pergunte por um deles.\n\nFonte: dados do exercício carregado.`;
}
