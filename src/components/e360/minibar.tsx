import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Barra horizontal: rótulo + barra + valor à direita. Preenchimento no
// gradiente cyan→mint da identidade, âmbar quando exige atenção.
// `marcaPct` desenha o tique vertical do limite/reserva.
export function MiniBar({
  rotulo,
  pct,
  valor,
  marcaPct,
  alerta,
  larguraRotulo = 230,
}: {
  rotulo: string;
  pct: number;
  valor: string;
  marcaPct?: number;
  alerta?: boolean;
  larguraRotulo?: number;
}) {
  return (
    <div
      className="my-1.5 flex flex-wrap items-center gap-2 text-xs sm:flex-nowrap"
      style={{ "--lb": `${larguraRotulo}px` } as CSSProperties}
    >
      <span className="w-full shrink-0 truncate sm:w-(--lb)" title={rotulo}>
        {rotulo}
      </span>
      <div className="relative h-2.5 min-w-24 flex-1 overflow-hidden rounded-md bg-secondary">
        <i
          className={cn(
            "block h-full rounded-md",
            alerta ? "bg-[var(--estado-atencao)]" : "bg-brand-cyan"
          )}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
        {marcaPct != null ? (
          <span
            className="absolute -top-0.5 bottom-[-2px] w-0.5 bg-foreground"
            style={{ left: `${Math.min(100, Math.max(0, marcaPct))}%` }}
            aria-hidden
          />
        ) : null}
      </div>
      <span className="ml-auto shrink-0 text-right font-bold tabular-nums sm:ml-0 sm:w-[170px]">
        {valor}
      </span>
    </div>
  );
}
