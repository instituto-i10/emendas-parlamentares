"use server";

import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { buscarPlanoPorToken } from "./plano-trabalho";

// ============================================================================
// Apoio à redação do plano de trabalho.
//
// O escopo é estreito de propósito, por decisão do jurídico do cliente: a IA
// AJUDA A ESCREVER e nada além disso. Não busca dado na internet, não consulta
// base pública, não estima número. O que ela recebe é o que já está na emenda;
// o que ela devolve é texto que o autor revisa e edita à vontade.
//
// O motivo é de adoção, não de tecnologia: exigir que o vereador vá atrás de
// dado externo para fechar um campo é o caminho mais curto para ele abandonar
// a ferramenta.
// ============================================================================

export type SugestaoResult =
  | { ok: true; texto: string; modelo: boolean }
  | { ok: false; error: string };

export type CampoRedacao = "justificativa" | "objetivo";

export type ContextoRedacao = {
  campo: CampoRedacao;
  objeto: string;
  valor: number;
  beneficiario: string | null;
  terceiroSetor: boolean;
  textoAtual: string;
};

const MODELO_PADRAO = "gpt-4o-mini";

const INSTRUCAO = `Você redige trechos de PLANO DE TRABALHO SIMPLIFICADO de emenda parlamentar ao orçamento de um município brasileiro.

REGRAS INVIOLÁVEIS
1. Use SOMENTE as informações do bloco CONTEXTO. Não acrescente número, percentual, data, quantidade de atendimentos, população, nome de lei, artigo ou fonte que não esteja lá.
2. Se faltar informação para uma afirmação, escreva a frase sem ela. Nunca preencha com estimativa nem com marcador do tipo "[inserir dado]".
3. Não invente característica da entidade nem do equipamento público beneficiado.
4. Não prometa resultado quantificado.

ESTILO
- Português do Brasil, tom técnico e sóbrio, na terceira pessoa.
- Texto corrido, sem título, sem lista, sem saudação e sem despedida.
- No máximo 4 frases.
- Devolva APENAS o texto final, sem aspas e sem comentário.`;

function textoLocal(c: ContextoRedacao): string {
  const destino = c.beneficiario ? ` a ${c.beneficiario}` : "";
  if (c.campo === "objetivo") {
    return (
      `Executar integralmente o objeto desta emenda —${destino ? destino + ", " : " "}` +
      `${c.objeto.toLowerCase()} — dentro do exercício, com prestação de contas ao ` +
      "órgão concessor na forma da legislação aplicável."
    );
  }
  return (
    `Os recursos destinam-se${destino} para ${c.objeto.toLowerCase()}. ` +
    "A destinação atende a demanda registrada junto a este gabinete e observa a " +
    "compatibilidade com os instrumentos de planejamento do Município. " +
    (c.terceiroSetor
      ? "A entidade beneficiária atua no atendimento à população e não dispõe de recurso próprio suficiente para a finalidade."
      : "A medida amplia a capacidade de atendimento sem gerar despesa continuada de pessoal.")
  );
}

async function gerar(c: ContextoRedacao): Promise<SugestaoResult> {
  const chave = process.env.OPENAI_API_KEY;
  // Sem chave a funcionalidade não some: entrega um texto-base editável. Um
  // botão que não faz nada é pior que um rascunho imperfeito.
  if (!chave) return { ok: true, texto: textoLocal(c), modelo: false };

  const contexto = [
    `CAMPO A REDIGIR: ${c.campo}`,
    `OBJETO DA EMENDA: ${c.objeto || "(não informado)"}`,
    `VALOR: ${c.valor > 0 ? c.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "(não informado)"}`,
    `BENEFICIÁRIO: ${c.beneficiario ?? "(não informado)"}`,
    `NATUREZA DO BENEFICIÁRIO: ${c.terceiroSetor ? "entidade do terceiro setor" : "órgão da administração pública municipal"}`,
    c.textoAtual.trim()
      ? `TEXTO ATUAL DO AUTOR (melhore a redação preservando o sentido e sem acrescentar fato novo):\n${c.textoAtual.trim()}`
      : "TEXTO ATUAL DO AUTOR: (vazio — redija do zero)",
  ].join("\n");

  try {
    const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${chave}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || MODELO_PADRAO,
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          { role: "system", content: INSTRUCAO },
          { role: "user", content: `CONTEXTO\n\n${contexto}` },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resposta.ok) {
      console.error("[redacao] OpenAI", resposta.status, (await resposta.text()).slice(0, 300));
      return { ok: true, texto: textoLocal(c), modelo: false };
    }
    const json = (await resposta.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const conteudo = json.choices?.[0]?.message?.content?.trim();
    if (!conteudo) return { ok: true, texto: textoLocal(c), modelo: false };
    return { ok: true, texto: conteudo, modelo: true };
  } catch (e) {
    console.error("[redacao] falha ao chamar a OpenAI", e);
    return { ok: true, texto: textoLocal(c), modelo: false };
  }
}

function saneia(c: ContextoRedacao): ContextoRedacao {
  return {
    ...c,
    objeto: c.objeto.slice(0, 600),
    textoAtual: c.textoAtual.slice(0, 4000),
    beneficiario: c.beneficiario?.slice(0, 200) ?? null,
  };
}

/** Chamada a partir da tela do gabinete (usuário autenticado). */
export async function sugerirRedacao(c: ContextoRedacao): Promise<SugestaoResult> {
  const u = await getCurrentUser();
  if (!rateLimit(`redacao:${u.id}`, 20, 60_000))
    return { ok: false, error: "Muitas sugestões seguidas. Aguarde um minuto." };
  return gerar(saneia(c));
}

/** Chamada a partir da página da entidade, que não tem conta — o token é a credencial. */
export async function sugerirRedacaoPorToken(
  token: string,
  c: ContextoRedacao
): Promise<SugestaoResult> {
  const alvo = await buscarPlanoPorToken(token);
  if (!alvo) return { ok: false, error: "Link inválido ou expirado." };
  if (!rateLimit(`redacao-token:${token}`, 15, 60_000))
    return { ok: false, error: "Muitas sugestões seguidas. Aguarde um minuto." };
  return gerar(saneia(c));
}
