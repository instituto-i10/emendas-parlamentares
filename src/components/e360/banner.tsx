import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Superfícies lavadas, sem borda — o tom já basta para separar do fundo.
const TONS = {
  warn: "bg-[var(--surf-warn)] text-[var(--on-warn)]",
  ok: "bg-[var(--surf-ok)] text-[var(--on-ok)]",
  roxo: "bg-[var(--surf-roxo)] text-[var(--on-roxo)]",
  vermelho: "bg-[var(--surf-bad)] text-[var(--on-bad)]",
} as const;

// Faixa de aviso do topo das vistas (mockup .banner): emoji + texto + tag,
// inteira clicável quando tem destino.
export function Banner({
  tom,
  emoji,
  children,
  tag,
  href,
  className,
}: {
  tom: keyof typeof TONS;
  emoji: string;
  children: ReactNode;
  tag?: ReactNode;
  href?: string;
  className?: string;
}) {
  const corpo = (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center gap-3 rounded-lg px-4 py-3.5 text-[13px] font-medium",
        TONS[tom],
        href && "transition-shadow hover:shadow-card",
        className
      )}
    >
      <span aria-hidden>{emoji}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {tag ? <span className="ml-auto">{tag}</span> : null}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {corpo}
      </Link>
    );
  }
  return corpo;
}
