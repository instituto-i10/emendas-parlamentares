import Link from "next/link";
import { cn } from "@/lib/utils";

export type Subtab = { id: string; titulo: string };

// Sub-navegação no padrão do chip de filtro da referência (.chip): retângulo
// de canto 10px, cinza-claro, sem borda; o ativo é laranja cheio. Server-side:
// cada pílula é um link com ?aba=<id>, mantendo as vistas no servidor.
export function Subtabs({
  base,
  abas,
  ativa,
}: {
  base: string;
  abas: Subtab[];
  ativa: string;
}) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.id === abas[0].id ? base : `${base}?aba=${a.id}`}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
            a.id === ativa
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {a.titulo}
        </Link>
      ))}
    </div>
  );
}
