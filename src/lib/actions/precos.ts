"use server";

import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { buscarPrecos, type PrecoEncontrado } from "@/lib/precos-catalogo";

// ---------------------------------------------------------------------------
// Pesquisa de preço para a memória de cálculo.
//
// Uma chamada só: o Banco de Preços já devolve mediana e faixa por item, então
// não há mais o passo intermediário de "achar o código para depois perguntar o
// preço" que a API do governo obrigava.
// ---------------------------------------------------------------------------

export type BuscaResult =
  | { ok: true; itens: PrecoEncontrado[] }
  | { ok: false; error: string };

export async function buscarItemCatalogo(
  termo: string,
  engenharia = false
): Promise<BuscaResult> {
  const u = await getCurrentUser();
  // Cada busca sai para o servidor do Banco de Preços — o limite protege a
  // fonte tanto quanto a nossa.
  if (!rateLimit(`precos:${u.id}`, 40, 60_000))
    return { ok: false, error: "Muitas buscas seguidas. Aguarde um instante." };

  if (termo.trim().length < 3)
    return { ok: false, error: "Digite ao menos 3 letras." };

  const itens = await buscarPrecos(termo, engenharia);
  return { ok: true, itens };
}
