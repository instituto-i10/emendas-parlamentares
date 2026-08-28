"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  BadgeCheck,
  FileStack,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  Presentation,
  ScanSearch,
  Settings,
  Settings2,
  ShieldCheck,
  Trophy,
  Users,
  UserSquare2,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sair } from "@/lib/actions/auth";
import { Avatar360 } from "@/components/e360/avatar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogoEmendas360 } from "./logo-emendas360";

export type VistaTab = { id: string; titulo: string; href: string };

// Rotas das ferramentas legadas agrupadas sob o item "Ferramentas". /config saiu
// da lista: Usuários, Perfis e Configurações têm item próprio no trilho, e sem
// isso "Ferramentas" acenderia junto com eles.
const PREFIXOS_FERRAMENTAS = ["/hub", "/legislativo", "/executivo"];

const ICONE: Record<string, LucideIcon> = {
  painel: LayoutDashboard,
  tramitacao360: Workflow,
  emendas360: FileStack,
  vereador360: UserSquare2,
  analise: ScanSearch,
  placar: Trophy,
  conformidade: BadgeCheck,
  usuarios: Users,
  perfis: ShieldCheck,
  configuracoes: Settings,
  ferramentas: Settings2,
  pitch: Presentation,
};

// Agrupamento por natureza do trabalho — o que painel administrativo grande faz
// para uma navegação de dez itens não virar uma lista plana.
const GRUPOS: { titulo: string; ids: string[] }[] = [
  { titulo: "Acompanhar", ids: ["painel", "tramitacao360", "placar"] },
  { titulo: "Operar", ids: ["emendas360", "analise", "vereador360"] },
  { titulo: "Governança", ids: ["conformidade", "pitch"] },
  { titulo: "Sistema", ids: ["usuarios", "perfis", "configuracoes", "ferramentas"] },
];

function itemAtivo(pathname: string, aba: string | null, tab: VistaTab): boolean {
  if (tab.href === "/hub") {
    return PREFIXOS_FERRAMENTAS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }
  // Itens que apontam para a mesma rota e se distinguem pela aba (/config).
  const [caminho, query] = tab.href.split("?");
  if (query) {
    const abaDoItem = new URLSearchParams(query).get("aba");
    return pathname === caminho && aba === abaDoItem;
  }
  if (caminho === "/config") {
    // "Configurações" acende nas abas que não têm item próprio no trilho.
    return pathname === "/config" && aba !== "usuarios" && aba !== "perfis";
  }
  return pathname === caminho || pathname.startsWith(caminho + "/");
}

type Usuario = { nome: string; papel: string };

type PropsNav = {
  vistas: VistaTab[];
  /** Pendências por vista — o número que faz a navegação virar fila de trabalho. */
  contadores?: Record<string, number>;
  usuario: Usuario;
};

function agrupar(vistas: VistaTab[]) {
  const porId = new Map(vistas.map((v) => [v.id, v]));
  return GRUPOS.map((g) => ({
    titulo: g.titulo,
    itens: g.ids.map((id) => porId.get(id)).filter(Boolean) as VistaTab[],
  })).filter((g) => g.itens.length > 0);
}

// Miolo da navegação, compartilhado pelo trilho fixo (desktop) e pela gaveta
// (celular). `expandido` decide se os rótulos aparecem sempre ou só a partir de
// xl — na gaveta há largura de sobra, então nunca é modo-régua.
function ConteudoNav({
  vistas,
  contadores,
  usuario,
  expandido,
  aoNavegar,
}: PropsNav & { expandido: boolean; aoNavegar?: () => void }) {
  const pathname = usePathname();
  const aba = useSearchParams().get("aba");
  const [saindo, iniciarSaida] = useTransition();
  const grupos = agrupar(vistas);

  // Classes que mudam entre o trilho estreito e a versão com rótulo.
  const cls = {
    marca: expandido ? "px-5" : "px-3 xl:px-5",
    nav: expandido ? "px-3" : "px-2.5 xl:px-3",
    tituloGrupo: expandido ? "block" : "hidden xl:block",
    separador: expandido ? "hidden" : "xl:hidden",
    link: expandido ? "justify-start" : "justify-center xl:justify-start",
    marcador: expandido ? "-left-3" : "-left-2.5 xl:-left-3",
    rotulo: expandido ? "inline" : "hidden xl:inline",
    contador: expandido ? "inline-block" : "hidden xl:inline-block",
    ponto: expandido ? "hidden" : "xl:hidden",
    conta: expandido ? "p-3" : "p-2.5 xl:p-3",
    identidade: expandido ? "block" : "hidden xl:block",
    sairLinha: expandido ? "grid" : "hidden xl:grid",
    sairBloco: expandido ? "hidden" : "xl:hidden",
  };

  return (
    <>
      {/* marca */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border",
          cls.marca
        )}
      >
        <Link href="/painel" className="flex items-center" onClick={aoNavegar}>
          <LogoEmendas360 compacta tamanho={30} />
        </Link>
      </div>

      {/* navegação */}
      <nav className={cn("flex-1 overflow-y-auto py-4", cls.nav)}>
        {grupos.map((g, i) => (
          <div key={g.titulo} className={cn(i > 0 && "mt-5")}>
            <div
              className={cn(
                "mb-1.5 px-3 text-[9.5px] font-bold uppercase tracking-[1.6px] text-white/35",
                cls.tituloGrupo
              )}
            >
              {g.titulo}
            </div>
            {i > 0 ? (
              <div
                className={cn("mx-3 mb-3 h-px bg-sidebar-border", cls.separador)}
                aria-hidden
              />
            ) : null}
            <div className="flex flex-col gap-0.5">
              {g.itens.map((v) => {
                const Icon = ICONE[v.id] ?? LayoutDashboard;
                const ativo = itemAtivo(pathname, aba, v);
                const n = contadores?.[v.id];
                return (
                  // O contador é irmão do link, não filho: `abasVisiveis` nos
                  // testes de permissão lê o textContent das âncoras da nav, e
                  // o número entraria no meio do rótulo.
                  <div key={v.id} className="group relative">
                    <Link
                      href={v.href}
                      title={v.titulo}
                      onClick={aoNavegar}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-[10px] py-2.5 pl-3 text-[13px] font-semibold transition-colors",
                        n ? "pr-11" : "pr-3",
                        cls.link,
                        ativo
                          ? "bg-white/12 text-white"
                          : "text-sidebar-foreground hover:bg-white/6 hover:text-white"
                      )}
                    >
                      {ativo ? (
                        <span
                          className={cn(
                            "absolute top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-cyan",
                            cls.marcador
                          )}
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
                      <span className={cn("truncate", cls.rotulo)}>
                        {v.titulo}
                      </span>
                    </Link>
                    {n ? (
                      <>
                        <span
                          className={cn(
                            "pointer-events-none absolute right-3 top-1/2 min-w-[22px] -translate-y-1/2 rounded-full px-1.5 py-0.5 text-center text-[10.5px] font-bold tabular-nums",
                            cls.contador,
                            ativo
                              ? "bg-brand-mint text-brand-deep"
                              : "bg-white/12 text-white/80"
                          )}
                        >
                          {n}
                        </span>
                        {/* no modo régua o contador vira um ponto */}
                        <span
                          className={cn(
                            "pointer-events-none absolute right-2 top-1.5 size-1.5 rounded-full bg-brand-mint",
                            cls.ponto
                          )}
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
      <div className={cn("shrink-0 border-t border-sidebar-border", cls.conta)}>
        <div className="flex items-center gap-2.5 rounded-[10px] px-1.5 py-1.5">
          <Avatar360 nome={usuario.nome} tamanho="md" />
          <div className={cn("min-w-0 flex-1", cls.identidade)}>
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
            className={cn(
              "size-8 shrink-0 place-items-center rounded-[9px] text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50",
              cls.sairLinha
            )}
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
          className={cn(
            "mt-1 grid w-full place-items-center rounded-[10px] py-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white",
            cls.sairBloco
          )}
        >
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </>
  );
}

// Trilho fixo — só a partir de lg. Abaixo disso 72px de menu comeriam um quinto
// da tela de um celular, e a navegação vai para a gaveta (`SideNavMobile`).
export function SideNav(props: PropsNav) {
  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-[72px] shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex xl:w-[248px]">
      <ConteudoNav {...props} expandido={false} />
    </aside>
  );
}

// Gaveta do celular: o mesmo menu, sempre com rótulo, aberto pelo botão da
// topbar e fechado ao navegar.
export function SideNavMobile(props: PropsNav) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();
  // A aba entra na chave: Usuários e Perfis compartilham o caminho /config e se
  // distinguem só pela query. Sem ela, ir de um ao outro deixaria a gaveta
  // aberta sobre a tela que a pessoa acabou de pedir.
  const rota = `${pathname}?${useSearchParams().get("aba") ?? ""}`;
  const [rotaDaAbertura, setRotaDaAbertura] = useState(rota);

  // Fecha a gaveta quando a rota muda — inclusive no voltar/avançar do
  // navegador, que não passa pelo onClick dos links. Ajuste durante a
  // renderização (e não num efeito): é a forma recomendada de derivar estado
  // de uma prop que mudou, sem a renderização em cascata de um useEffect.
  if (rota !== rotaDaAbertura) {
    setRotaDaAbertura(rota);
    if (aberto) setAberto(false);
  }

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="-ml-1.5 grid size-10 shrink-0 place-items-center rounded-[10px] text-foreground transition-colors hover:bg-accent lg:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="flex w-[262px] max-w-[85vw] flex-col gap-0 border-0 bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">Navegação</SheetTitle>
        <ConteudoNav
          {...props}
          expandido
          aoNavegar={() => setAberto(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
