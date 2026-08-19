import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ItemCard = {
  titulo: string;
  descricao?: string;
  href: string;
  icon: LucideIcon;
};

// Grade de cards grandes (hub e landing dos macro-módulos). Navegável por teclado.
export function GradeCards({ itens }: { itens: ItemCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-card-hover">
              <CardHeader>
                <div className="mb-1 flex items-center gap-3">
                  <div className="grad-main rounded-[11px] p-2.5 text-white">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <CardTitle className="text-base font-bold">
                    {it.titulo}
                  </CardTitle>
                </div>
                {it.descricao ? (
                  <CardDescription>{it.descricao}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-cyan group-hover:underline">
                  Abrir <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
