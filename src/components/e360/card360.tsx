import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Card base: branco, canto 18px, sem borda — o que o separa do fundo é uma
// sombra baixa (estrutura da referência de UI). Variantes: mesa (âmbar, para
// pendência), azul (painel calmo), dark/hi (gradientes da identidade).
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
        "relative flex flex-col rounded-xl p-[22px] shadow-card",
        variante === "padrao" && "bg-card",
        variante === "mesa" &&
          "border-l-4 border-l-brand-amber bg-[var(--surf-warn)]",
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
