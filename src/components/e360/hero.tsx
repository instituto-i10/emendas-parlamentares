import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Painel de abertura no padrão `.hero` da referência: à esquerda a saudação
// (data pequena, título forte, uma linha de contexto), à direita os tiles de
// indicador. Aqui o painel usa o gradiente navy→cyan da identidade, com os
// tiles brancos por cima.
export function Hero({
  data,
  titulo,
  sub,
  children,
  className,
}: {
  data?: string;
  titulo: string;
  sub?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grad-main grid gap-4 rounded-xl p-5 text-white",
        "lg:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]",
        className
      )}
    >
      <div className="flex flex-col py-1.5 pr-2">
        {data ? (
          <div className="text-[12.5px] font-semibold text-white/70">{data}</div>
        ) : null}
        <h1 className="mb-1.5 mt-auto text-[28px] font-extrabold leading-tight tracking-[-.03em]">
          {titulo}
        </h1>
        {sub ? (
          <p className="m-0 text-[13px] font-medium text-white/80">{sub}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
