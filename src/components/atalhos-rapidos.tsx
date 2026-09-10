import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { modulosVisiveis } from "@/config/navegacao";
import { vistasVisiveis } from "@/config/vistas360";

// ---------------------------------------------------------------------------
// "Atalhos para acesso rápido" — no alto da tela inicial de cada perfil.
//
// Eles já foram cartões com descrição no rodapé, depois viraram fichas
// pequenas na primeira dobra. Agora são cartões grandes, a pedido do cliente:
// atalho pequeno é uma linha de texto disputando atenção com o painel inteiro,
// e quem chega aqui todo dia precisa de um alvo óbvio, não de um discreto.
//
// A descrição voltou junto com o tamanho. Ela cabe agora porque o cartão é
// largo — e sem ela "Tramitação & Acompanhamento" e "Acompanhamento" ficam
// dois nomes parecidos sem nada que os distinga.
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
      <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[1.4px] text-muted-foreground">
        Atalhos para acesso rápido
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {atalhos.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.id}
              href={m.href}
              className="group flex min-w-0 items-start gap-3.5 rounded-xl bg-card p-4 shadow-card transition-colors hover:bg-accent"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-secondary transition-colors group-hover:bg-card">
                <Icon className="size-5 text-accent-foreground" aria-hidden />
              </span>
              {/* O título QUEBRA em vez de truncar: "Tramitação & Ac…" e
                  "Planejamento & …" não dizem para onde levam, e um atalho que
                  esconde o próprio nome deixou de ser atalho. */}
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold leading-tight">
                  {m.titulo}
                </span>
                <span className="mt-1.5 block text-[12px] leading-relaxed text-muted-foreground">
                  {m.descricao}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
