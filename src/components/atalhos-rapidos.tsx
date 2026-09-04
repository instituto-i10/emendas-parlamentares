import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { modulosVisiveis } from "@/config/navegacao";
import { vistasVisiveis } from "@/config/vistas360";

// ---------------------------------------------------------------------------
// "Atalhos para acesso rápido" — no alto da tela inicial de cada perfil.
//
// Antes eram cards com descrição, no rodapé. Duas mudanças: subiram para a
// primeira dobra, porque atalho que exige rolar não é atalho; e perderam a
// descrição, porque na tela inicial eles competem com o conteúdo — quem chega
// aqui já sabe o que é "Emendas", e a frase explicativa só ocupava a altura que
// empurrava o painel para baixo.
//
// O que NÃO entra: módulo cuja rota já é item do menu lateral. Repetir o mesmo
// destino em dois lugares da mesma tela não dá duas maneiras de chegar lá — dá
// a dúvida sobre se são a mesma coisa. A comparação é por ROTA, não por nome,
// porque é a rota que define o destino.
// ---------------------------------------------------------------------------
export async function AtalhosRapidos() {
  const user = await getCurrentUser();

  // `?aba=usuarios` e `/config` levam ao mesmo lugar; comparar sem a query
  // evita que "Configurações" apareça nos dois lados.
  const semQuery = (href: string) => href.split("?")[0];
  const noMenu = new Set(vistasVisiveis(user).map((v) => semQuery(v.href)));

  const atalhos = modulosVisiveis(user).filter(
    (m) => !noMenu.has(semQuery(m.href))
  );
  if (atalhos.length === 0) return null;

  return (
    <section aria-label="Atalhos para acesso rápido" className="mb-6">
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[1.4px] text-muted-foreground">
        Atalhos para acesso rápido
      </p>
      {/* Uma linha só. `flex-wrap` em vez de rolagem horizontal: com quatro
          atalhos eles cabem em qualquer tela de trabalho, e numa estreita
          quebrar é mais usável do que esconder o que sobrou fora da borda. */}
      <div className="flex flex-wrap gap-2">
        {atalhos.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.id}
              href={m.href}
              className="group flex min-w-0 items-center gap-2.5 rounded-[10px] bg-card px-3.5 py-2.5 shadow-card transition-colors hover:bg-accent"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary transition-colors group-hover:bg-card">
                <Icon className="size-4 text-accent-foreground" aria-hidden />
              </span>
              <span className="truncate text-[13px] font-semibold">{m.titulo}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
