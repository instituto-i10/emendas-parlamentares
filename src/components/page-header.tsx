import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { titulo: string; href?: string };

// Cabeçalho de página com breadcrumb opcional. Um objetivo claro por tela.
export function PageHeader({
  titulo,
  descricao,
  crumbs,
  acao,
}: {
  titulo: string;
  descricao?: string;
  crumbs?: Crumb[];
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 ? (
        <nav
          aria-label="Trilha de navegação"
          className="mb-1.5 flex flex-wrap items-center gap-1 text-[12px] font-semibold text-muted-foreground"
        >
          {crumbs.map((c, i) => (
            <span key={`${c.titulo}-${i}`} className="flex items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="size-3.5" aria-hidden />
              ) : null}
              {c.href ? (
                <Link href={c.href} className="transition-colors hover:text-foreground">
                  {c.titulo}
                </Link>
              ) : (
                <span className="text-foreground">{c.titulo}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-extrabold tracking-[-.03em]">
              {titulo}
            </h1>
            <span className="sec-bar" aria-hidden />
          </div>
          {descricao ? (
            <p className="text-[13px] font-medium text-muted-foreground">
              {descricao}
            </p>
          ) : null}
        </div>
        {acao ? <div className="shrink-0">{acao}</div> : null}
      </div>
    </div>
  );
}
