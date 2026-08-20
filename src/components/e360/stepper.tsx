import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type EstadoEtapa = "done" | "now" | "next";

export type Etapa = {
  id: string;
  titulo: string;
  icon: LucideIcon;
  estado: EstadoEtapa;
  /** Número que a etapa carrega hoje (emendas na fila, por exemplo). */
  contador?: string;
  nota?: string;
  href?: string;
};

// Esteira horizontal do processo: o padrão de progresso de sistema
// administrativo. Substitui o fluxograma vertical — ocupa uma faixa em vez de
// uma tela inteira e deixa a etapa corrente óbvia à primeira vista.
export function Stepper({ etapas }: { etapas: Etapa[] }) {
  return (
    <ol className="flex min-w-0 list-none gap-0 overflow-x-auto p-0">
      {etapas.map((e, i) => {
        const primeiro = i === 0;
        const ultimo = i === etapas.length - 1;
        const Icon = e.icon;

        const corpo = (
          <>
            {/* trilho: metade esquerda e metade direita, para os cantos ficarem retos */}
            <span
              className={cn(
                "absolute top-[22px] h-[3px]",
                primeiro ? "left-1/2" : "left-0",
                ultimo ? "right-1/2" : "right-0",
                e.estado === "next" ? "bg-border" : "bg-brand-cyan"
              )}
              aria-hidden
            />
            <span
              className={cn(
                "relative grid size-11 place-items-center rounded-full transition-colors",
                e.estado === "done" && "grad-main text-white",
                e.estado === "now" &&
                  "bg-card text-primary ring-[3px] ring-brand-mint",
                e.estado === "next" && "bg-secondary text-muted-foreground"
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="mt-3 block px-2 text-center">
              <span
                className={cn(
                  "block text-[12.5px] font-bold leading-tight tracking-[-.015em]",
                  e.estado === "next" ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {e.titulo}
              </span>
              {e.contador ? (
                <span
                  className={cn(
                    "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold",
                    e.estado === "now"
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {e.contador}
                </span>
              ) : null}
              {e.nota ? (
                <span className="mt-1 block text-[10.5px] font-medium text-muted-foreground">
                  {e.nota}
                </span>
              ) : null}
            </span>
          </>
        );

        return (
          <li
            key={e.id}
            className="relative flex min-w-[128px] flex-1 flex-col items-center"
            aria-current={e.estado === "now" ? "step" : undefined}
          >
            {e.href ? (
              <Link
                href={e.href}
                className="flex flex-col items-center rounded-lg transition-opacity hover:opacity-80"
              >
                {corpo}
              </Link>
            ) : (
              <span className="flex flex-col items-center">{corpo}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
