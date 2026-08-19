"use server";

import { getCurrentUser } from "@/lib/session";
import {
  INSTRUCAO_SISTEMA,
  montarContexto,
  responderLocalmente,
} from "@/lib/assistente";

export type RespostaAssistente = {
  texto: string;
  /** true quando a resposta veio do modelo; false quando veio do apurado local. */
  modelo: boolean;
  erro?: string;
};

type Turno = { de: "user" | "bot"; texto: string };

const MODELO_PADRAO = "gpt-4o-mini";
const LIMITE_PERGUNTA = 500;

export async function perguntarAoAssistente(
  pergunta: string,
  historico: Turno[] = []
): Promise<RespostaAssistente> {
  // O widget vive dentro da casca autenticada; a ação confere por conta própria.
  await getCurrentUser();

  const texto = pergunta.trim().slice(0, LIMITE_PERGUNTA);
  if (!texto) return { texto: "", modelo: false };

  const ctx = await montarContexto();
  const chave = process.env.OPENAI_API_KEY;

  if (!chave) {
    return { texto: responderLocalmente(texto, ctx), modelo: false };
  }

  try {
    const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || MODELO_PADRAO,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: "system", content: INSTRUCAO_SISTEMA },
          {
            role: "system",
            content: `DADOS (exercício ${ctx.ano ?? "—"}, apurados do banco agora):\n\n${ctx.fatos}`,
          },
          // Só as últimas trocas: o contexto factual é que carrega a resposta.
          ...historico.slice(-6).map((t) => ({
            role: t.de === "user" ? ("user" as const) : ("assistant" as const),
            content: t.texto,
          })),
          { role: "user", content: texto },
        ],
      }),
      // Uma pergunta travada é pior que uma pergunta sem resposta.
      signal: AbortSignal.timeout(30_000),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      console.error("[assistente] OpenAI", resposta.status, detalhe.slice(0, 400));
      return {
        texto: responderLocalmente(texto, ctx),
        modelo: false,
        erro:
          resposta.status === 401
            ? "Chave da OpenAI inválida — respondendo pelo apurado local."
            : "A OpenAI não respondeu — respondendo pelo apurado local.",
      };
    }

    const json = (await resposta.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const conteudo = json.choices?.[0]?.message?.content?.trim();
    if (!conteudo) {
      return { texto: responderLocalmente(texto, ctx), modelo: false };
    }
    return { texto: conteudo, modelo: true };
  } catch (e) {
    console.error("[assistente] falha ao chamar a OpenAI", e);
    return {
      texto: responderLocalmente(texto, ctx),
      modelo: false,
      erro: "Não consegui falar com a OpenAI — respondendo pelo apurado local.",
    };
  }
}
