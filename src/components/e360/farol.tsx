import Link from "next/link";
import { Check, CircleAlert, CircleSlash } from "lucide-react";
import { cn } from "@/lib/utils";

export type FarolTom = "r" | "a" | "g";

export type FarolItemDado = {
  tom: FarolTom;
  titulo: string;
  texto: string;
  fix?: string;
  href?: string;
};

// Verde/âmbar/vermelho na versão profunda dos tokens --estado-*. Fundo sólido
// e glifo branco: a linha inteira já é uma superfície lavada, e um círculo
// lavado sobre ela some — o item precisa ser lido de relance.
const DOT: Record<FarolTom, string> = {
  r: "bg-[var(--estado-bloqueio)] text-white",
  a: "bg-[var(--estado-atencao)] text-white",
  g: "bg-[var(--estado-ok)] text-white",
};

const ICONE = { r: CircleSlash, a: CircleAlert, g: Check } as const;

function Item({ item }: { item: FarolItemDado }) {
  const conteudo = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          DOT[item.tom]
        )}
        aria-hidden
      >
        {(() => {
          const Icone = ICONE[item.tom];
          return <Icone className="size-3" strokeWidth={3} />;
        })()}
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

// Farol de conformidade: lista de itens com ícone de estado.
export function Farol({ itens }: { itens: FarolItemDado[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {itens.map((it, i) => (
        <Item key={`${it.titulo}-${i}`} item={it} />
      ))}
    </div>
  );
}
