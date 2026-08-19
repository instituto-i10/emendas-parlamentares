"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  BadgeCheck,
  FileStack,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Presentation,
  ScanSearch,
  Settings2,
  Trophy,
  UserSquare2,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sair } from "@/lib/actions/auth";
import { Avatar360 } from "@/components/e360/avatar";
import { LogoEmendas360 } from "./logo-emendas360";

export type VistaTab = { id: string; titulo: string; href: string };

// Rotas das ferramentas legadas agrupadas sob o item "Ferramentas".
const PREFIXOS_FERRAMENTAS = ["/hub", "/legislativo", "/executivo", "/config"];

const ICONE: Record<string, LucideIcon> = {
  painel: LayoutDashboard,
  tramitacao360: Workflow,
  emendas360: FileStack,
  vereador360: UserSquare2,
  analise: ScanSearch,
  placar: Trophy,
  conformidade: BadgeCheck,
  ferramentas: Settings2,
  pitch: Presentation,
};

// Agrupamento por natureza do trabalho — o que painel administrativo grande faz
// para uma navegação de dez itens não virar uma lista plana.
const GRUPOS: { titulo: string; ids: string[] }[] = [
  { titulo: "Acompanhar", ids: ["painel", "tramitacao360", "placar"] },
  { titulo: "Operar", ids: ["emendas360", "analise", "vereador360"] },
  { titulo: "Governança", ids: ["conformidade", "pitch"] },
  { titulo: "Sistema", ids: ["ferramentas"] },
];

function itemAtivo(pathname: string, tab: VistaTab): boolean {
  if (tab.href === "/hub") {
    return PREFIXOS_FERRAMENTAS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }
  return pathname === tab.href || pathname.startsWith(tab.href + "/");
}

export function SideNav({
  vistas,
  contadores,
  usuario,
}: {
  vistas: VistaTab[];
  /** Pendências por vista — o número que faz a navegação virar fila de trabalho. */
  contadores?: Record<string, number>;
  usuario: { nome: string; papel: string };
}) {
  const pathname = usePathname();
  const [saindo, iniciarSaida] = useTransition();

  const porId = new Map(vistas.map((v) => [v.id, v]));
  const grupos = GRUPOS.map((g) => ({
    titulo: g.titulo,
    itens: g.ids.map((id) => porId.get(id)).filter(Boolean) as VistaTab[],
  })).filter((g) => g.itens.length > 0);

  return (
    <aside className="sticky top-0 z-40 flex h-screen w-[72px] shrink-0 flex-col bg-sidebar text-sidebar-foreground xl:w-[248px]">
      {/* marca */}
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-3 xl:px-5">
        <Link href="/painel" className="flex items-center">
          <LogoEmendas360 compacta className="xl:hidden" tamanho={30} />
          <LogoEmendas360 compacta className="hidden xl:flex" tamanho={30} />
        </Link>
      </div>

      {/* navegação */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 xl:px-3">
        {grupos.map((g, i) => (
          <div key={g.titulo} className={cn(i > 0 && "mt-5")}>
            <div className="mb-1.5 hidden px-3 text-[9.5px] font-bold uppercase tracking-[1.6px] text-white/35 xl:block">
              {g.titulo}
            </div>
            {i > 0 ? (
              <div className="mx-3 mb-3 h-px bg-sidebar-border xl:hidden" aria-hidden />
            ) : null}
            <div className="flex flex-col gap-0.5">
              {g.itens.map((v) => {
                const Icon = ICONE[v.id] ?? LayoutDashboard;
                const ativo = itemAtivo(pathname, v);
                const n = contadores?.[v.id];
                return (
                  // O contador é irmão do link, não filho: `abasVisiveis` nos
                  // testes de permissão lê o textContent das âncoras da nav, e
                  // o número entraria no meio do rótulo.
                  <div key={v.id} className="group relative">
                    <Link
                      href={v.href}
                      title={v.titulo}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-[10px] py-2.5 pl-3 text-[13px] font-semibold transition-colors",
                        n ? "pr-11" : "pr-3",
                        "justify-center xl:justify-start",
                        ativo
                          ? "bg-white/12 text-white"
                          : "text-sidebar-foreground hover:bg-white/6 hover:text-white"
                      )}
                    >
                      {ativo ? (
                        <span
                          className="grad-hi absolute -left-2.5 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full xl:-left-3"
                          aria-hidden
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          "size-[18px] shrink-0 transition-colors",
                          ativo
                            ? "text-brand-mint"
                            : "text-white/55 group-hover:text-white/80"
                        )}
                        aria-hidden
                      />
                      <span className="hidden truncate xl:inline">{v.titulo}</span>
                    </Link>
                    {n ? (
                      <>
                        <span
                          className={cn(
                            "pointer-events-none absolute right-3 top-1/2 hidden min-w-[22px] -translate-y-1/2 rounded-full px-1.5 py-0.5 text-center text-[10.5px] font-bold tabular-nums xl:inline-block",
                            ativo
                              ? "bg-brand-mint text-brand-deep"
                              : "bg-white/12 text-white/80"
                          )}
                        >
                          {n}
                        </span>
                        {/* no modo régua o contador vira um ponto */}
                        <span
                          className="pointer-events-none absolute right-2 top-1.5 size-1.5 rounded-full bg-brand-mint xl:hidden"
                          aria-hidden
                        />
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* conta */}
      <div className="shrink-0 border-t border-sidebar-border p-2.5 xl:p-3">
        <div className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-1.5">
          <Avatar360 nome={usuario.nome} tamanho="md" />
          <div className="hidden min-w-0 flex-1 xl:block">
            <div className="truncate text-[12.5px] font-bold text-white">
              {usuario.nome}
            </div>
            <div className="truncate text-[10.5px] font-medium text-white/50">
              {usuario.papel}
            </div>
          </div>
          <button
            type="button"
            title="Sair"
            aria-label="Sair"
            disabled={saindo}
            onClick={() => iniciarSaida(() => void sair())}
            className="hidden size-8 shrink-0 place-items-center rounded-[9px] text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 xl:grid"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          title="Sair"
          aria-label="Sair"
          disabled={saindo}
          onClick={() => iniciarSaida(() => void sair())}
          className="mt-1 grid w-full place-items-center rounded-[10px] py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white xl:hidden"
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
