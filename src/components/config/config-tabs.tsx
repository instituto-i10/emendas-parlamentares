"use client";

import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";

// Abas de Configurações governadas pela URL (?aba=).
//
// Existe porque o menu lateral aponta direto para Usuários e Perfis: com
// `defaultValue`, ir de um atalho ao outro não trocava nada — a rota é a mesma,
// o componente não remonta e o valor inicial já tinha sido consumido.
//
// A troca manual de aba usa `window.history.replaceState`, que o roteador do
// Next integra e reflete em `useSearchParams` sem ida ao servidor. Fosse
// `router.replace`, cada clique numa aba recarregaria do banco os parâmetros,
// as normas, os usuários e a auditoria inteira.
export function ConfigTabs({
  padrao,
  abasValidas,
  children,
}: {
  padrao: string;
  abasValidas: string[];
  children: ReactNode;
}) {
  const daUrl = useSearchParams().get("aba");
  const pedida = daUrl && abasValidas.includes(daUrl) ? daUrl : padrao;

  const [aba, setAba] = useState(pedida);
  const [ultimaDaUrl, setUltimaDaUrl] = useState(pedida);

  // A URL mudou por fora (clique no menu lateral, voltar do navegador): ajuste
  // durante a renderização, como no menu — sem a cascata de um useEffect.
  if (pedida !== ultimaDaUrl) {
    setUltimaDaUrl(pedida);
    setAba(pedida);
  }

  function trocar(nova: string) {
    setAba(nova);
    setUltimaDaUrl(nova);
    const url = new URL(window.location.href);
    url.searchParams.set("aba", nova);
    window.history.replaceState(null, "", url);
  }

  return (
    <Tabs value={aba} onValueChange={trocar}>
      {children}
    </Tabs>
  );
}
