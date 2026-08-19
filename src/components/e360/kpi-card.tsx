import Link from "next/link";
import { cn } from "@/lib/utils";

export type Delta = {
  tom: "up" | "down" | "neutral" | "warn";
  texto: string;
};

// Pílulas de variação no padrão do `.trend` da referência: fundo azul-claro
// para o positivo, laranja para atenção, vermelho para queda, cinza neutro.
const TOM_DELTA: Record<Delta["tom"], string> = {
  up: "bg-[var(--surf-ok)] text-[var(--on-ok)]",
  down: "bg-[var(--surf-bad)] text-[var(--on-bad)]",
  neutral: "bg-secondary text-muted-foreground",
  warn: "bg-[var(--surf-warn)] text-[var(--on-warn)]",
};

// Card KPI da referência: rótulo-antena, número forte e grande, rótulo cinza
// e a pílula de variação. `variante` hi/dark usa as superfícies de ênfase;
// `href` torna o card clicável com o rodapé "ver detalhe →".
export function KpiCard({
  eyebrow,
  numero,
  rotulo,
  delta,
  href,
  variante = "padrao",
  fonte,
  className,
}: {
  eyebrow: string;
  numero: string;
  rotulo: string;
  delta?: Delta;
  href?: string;
  variante?: "padrao" | "hi" | "dark";
  fonte?: string;
  className?: string;
}) {
  const escuro = variante !== "padrao";
  const corpo = (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl p-[22px] transition-all duration-150",
        variante === "padrao" && "bg-card shadow-card",
        variante === "hi" && "grad-main text-white shadow-card",
        variante === "dark" && "grad-dark text-white shadow-card",
        href && "hover:-translate-y-0.5 hover:shadow-card-hover",
        className
      )}
    >
      <div className={cn("eyebrow", escuro && "text-white/70")}>{eyebrow}</div>
      <div className="kpi-num mt-2" style={{ fontSize: 24 }}>
        {numero}
      </div>
      <div className={cn("kpi-lbl", escuro && "text-white/75")}>{rotulo}</div>
      {delta ? (
        <span
          className={cn(
            "mt-2.5 w-fit rounded-full px-2.5 py-1 text-[11.5px] font-bold",
            escuro ? "bg-white/15 text-white" : TOM_DELTA[delta.tom]
          )}
        >
          {delta.texto}
        </span>
      ) : null}
      {fonte ? (
        <div
          className={cn(
            "mt-auto pt-3 text-[11px] font-medium",
            escuro ? "text-white/55" : "text-muted-foreground"
          )}
        >
          {fonte}
        </div>
      ) : null}
      {href ? (
        <span
          className={cn(
            "mt-2 text-[11px] font-bold",
            escuro ? "text-white" : "text-primary"
          )}
        >
          ver detalhe →
        </span>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {corpo}
      </Link>
    );
  }
  return corpo;
}
