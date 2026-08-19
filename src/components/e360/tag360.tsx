import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Badges no padrão da referência de UI: pílula, peso 700, fundo lavado do
// próprio matiz. Azul para o que está conforme, laranja para atenção,
// vermelho para o que barra, cinza para o que ainda não começou.
const TONS = {
  ok: "bg-[var(--surf-ok)] text-[var(--on-ok)]",
  warn: "bg-[var(--surf-warn)] text-[var(--on-warn)]",
  bad: "bg-[var(--surf-bad)] text-[var(--on-bad)]",
  info: "bg-[var(--surf-info)] text-[var(--on-info)]",
  roxo: "bg-[var(--surf-roxo)] text-[var(--on-roxo)]",
  pend: "bg-secondary text-muted-foreground",
} as const;

export type TomTag = keyof typeof TONS;

// Tag/pílula de status do mockup (ok/warn/bad/info/roxo/pend).
export function Tag360({
  tom,
  children,
  className,
}: {
  tom: TomTag;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold leading-none",
        TONS[tom],
        className
      )}
    >
      {children}
    </span>
  );
}

// Mapeia o StatusEmenda do domínio para o tom visual do mockup.
export function tomDoStatus(status: string): TomTag {
  switch (status) {
    case "APROVADA":
      return "ok";
    case "VALIDA":
      return "info";
    case "SUBMETIDA":
    case "EM_TRAMITACAO":
      return "roxo";
    case "INVALIDA":
    case "REJEITADA":
      return "bad";
    case "EM_VALIDACAO":
      return "warn";
    default:
      return "pend";
  }
}
