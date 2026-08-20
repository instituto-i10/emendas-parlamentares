import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Card base: branco, canto 18px, sem borda — o que o separa do fundo é uma
// sombra baixa. Variantes: mesa (pendência), azul (painel calmo), dark/hi
// (superfícies da identidade).
//
// Nenhuma variante usa barra colorida à esquerda: o estado é dito pela
// superfície e pelo texto, não por um traço decorativo na lateral.
export function Card360({
  children,
  variante = "padrao",
  className,
}: {
  children: ReactNode;
  variante?: "padrao" | "mesa" | "azul" | "dark" | "hi";
  className?: string;
}) {
  return (
    <div
      className={cn(
        // min-w-0: como item de grid/flex o card tem min-width:auto por
        // padrão e se recusa a encolher abaixo do próprio conteúdo — era o que
        // estourava a largura no celular (tabelas e textos longos empurravam o
        // card para fora da tela em vez de rolarem dentro dele).
        "relative flex min-w-0 flex-col rounded-xl p-[22px] shadow-card",
        variante === "padrao" && "bg-card",
        variante === "mesa" && "bg-[var(--surf-warn)] text-[var(--on-warn)]",
        variante === "azul" && "surface-tint shadow-none",
        variante === "dark" && "grad-dark text-white",
        variante === "hi" && "grad-main text-white",
        className
      )}
    >
      {children}
    </div>
  );
}

// Rótulo-antena de card (.eyebrow) com suporte a fundo escuro.
export function Eyebrow({
  children,
  escuro,
  className,
}: {
  children: ReactNode;
  escuro?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("eyebrow mb-2", escuro && "text-white/70", className)}>
      {children}
    </div>
  );
}
