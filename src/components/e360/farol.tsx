import Link from "next/link";
import { cn } from "@/lib/utils";

export type FarolTom = "r" | "a" | "g";

export type FarolItemDado = {
  tom: FarolTom;
  titulo: string;
  texto: string;
  fix?: string;
  href?: string;
};

const DOT: Record<FarolTom, string> = {
  r: "bg-destructive shadow-[0_0_0_3px_rgba(229,72,77,.15)]",
  a: "bg-brand-amber shadow-[0_0_0_3px_rgba(245,165,36,.18)]",
  g: "bg-brand-green shadow-[0_0_0_3px_rgba(0,178,120,.15)]",
};

const SINAL: Record<FarolTom, string> = { r: "✕", a: "!", g: "✓" };

function Item({ item }: { item: FarolItemDado }) {
  const conteudo = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black leading-none text-white",
          DOT[item.tom]
        )}
        aria-hidden
      >
        {SINAL[item.tom]}
      </span>
      <div className="min-w-0">
        <b className="block text-[13px] font-bold leading-snug tracking-[-.015em]">
          {item.titulo}
        </b>
        <span className="text-[11.5px] font-medium text-muted-foreground">
          {item.texto}
        </span>
        {item.fix ? (
          <span className="mt-0.5 block text-[11.5px] font-bold text-accent-foreground">
            {item.fix}
          </span>
        ) : null}
      </div>
    </>
  );

  // Linha de lista no padrão da referência: bloco cinza-claro, canto 14px,
  // sem borda — igual às linhas de tarefa do mock.
  const classes =
    "flex items-start gap-3 rounded-lg bg-secondary px-3.5 py-3.5 transition-colors";
  if (item.href) {
    return (
      <Link href={item.href} className={cn(classes, "hover:bg-accent")}>
        {conteudo}
      </Link>
    );
  }
  return <div className={classes}>{conteudo}</div>;
}

// Farol de conformidade do mockup: lista de itens com bolinha ✓/!/✕.
export function Farol({ itens }: { itens: FarolItemDado[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {itens.map((it, i) => (
        <Item key={`${it.titulo}-${i}`} item={it} />
      ))}
    </div>
  );
}
