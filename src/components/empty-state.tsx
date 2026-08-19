import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IlustracaoVazio } from "./e360/ilustracoes";

// Estado vazio elegante e reutilizável (carregamento/erro/vazio consistentes).
export function EmptyState({
  icon: Icon,
  titulo,
  descricao,
  acao,
  className,
}: {
  icon?: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl bg-secondary p-10 text-center",
        className
      )}
    >
      {Icon ? (
        <div className="mb-3 rounded-[11px] bg-card p-3 shadow-card">
          <Icon className="size-6 text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <IlustracaoVazio className="mb-2" />
      )}
      <h3 className="text-[13.5px] font-bold tracking-[-.015em]">{titulo}</h3>
      {descricao ? (
        <p className="mt-1 max-w-sm text-[12.5px] font-medium text-muted-foreground">
          {descricao}
        </p>
      ) : null}
      {acao ? <div className="mt-4">{acao}</div> : null}
    </div>
  );
}
