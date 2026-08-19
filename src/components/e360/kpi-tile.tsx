import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TOM_ICONE = {
  navy: "grad-main",
  cyan: "bg-brand-cyan",
  mint: "bg-brand-mint text-brand-deep",
  amber: "bg-brand-amber",
  bad: "bg-destructive",
} as const;

// Tile de indicador no padrão `.kpi` da referência: quadradinho de ícone no
// alto, número forte embaixo, rótulo cinza — e a marca d'água de dois
// semicírculos saindo pela borda direita.
export function KpiTile({
  icon: Icon,
  valor,
  rotulo,
  tom = "navy",
  href,
  className,
}: {
  icon: LucideIcon;
  valor: string;
  rotulo: string;
  tom?: keyof typeof TOM_ICONE;
  href?: string;
  className?: string;
}) {
  const corpo = (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-lg bg-card p-4 pb-3.5 text-card-foreground",
        href && "transition-shadow hover:shadow-card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-[11px] text-white",
            TOM_ICONE[tom]
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      {/* marca d'água: dois semicírculos claros no canto */}
      <svg
        className="pointer-events-none absolute -right-3.5 bottom-4 opacity-50"
        width="70"
        height="56"
        viewBox="0 0 70 56"
        fill="none"
        aria-hidden
      >
        <path d="M8 0a28 28 0 0 1 0 56Z" fill="#DCEBFA" />
        <path d="M40 0a28 28 0 0 1 0 56Z" fill="#DCEBFA" />
      </svg>
      <div className="kpi-num relative mt-6" style={{ fontSize: 24 }}>
        {valor}
      </div>
      <div className="kpi-lbl relative">{rotulo}</div>
    </div>
  );

  return href ? (
    <Link href={href} className="rounded-lg">
      {corpo}
    </Link>
  ) : (
    corpo
  );
}
