import type { ReactNode } from "react";
import type { Poder, Role } from "@/generated/prisma/enums";
import { vistasVisiveis } from "@/config/vistas360";
import { ROTULO_ROLE } from "@/lib/rotulos";
import { SideNav } from "./side-nav";
import { ExercicioSelector } from "./exercicio-selector";
import { AssistenteWidget } from "./assistente/widget";

type ExercicioOpcao = { id: string; ano: number; status: string };

// Casca da aplicação: menu lateral navy à esquerda (marca, vistas do papel
// agrupadas por natureza do trabalho, conta) e, à direita, uma topbar enxuta
// com o contexto de exercício. O assistente vive flutuando sobre tudo.
export function AppShell({
  user,
  exercicios,
  anoAtivo,
  contadores,
  contexto,
  children,
}: {
  user: { nome: string; poder: Poder | null; role: Role };
  exercicios: ExercicioOpcao[];
  anoAtivo: number | null;
  /** Pendências por vista, exibidas como contador no menu. */
  contadores?: Record<string, number>;
  /** Instrumento base do exercício, mostrado como contexto na topbar. */
  contexto?: string;
  children: ReactNode;
}) {
  const vistas = vistasVisiveis(user.role).map(({ id, titulo, href }) => ({
    id,
    titulo,
    href,
  }));

  return (
    <div className="flex min-h-screen">
      <SideNav
        vistas={vistas}
        contadores={contadores}
        usuario={{ nome: user.nome, papel: ROTULO_ROLE[user.role] ?? user.role }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl backdrop-saturate-150">
          <div className="flex h-16 items-center gap-3 px-5 lg:px-7">
            {contexto ? (
              <span className="hidden items-center gap-2 text-[12.5px] font-semibold text-muted-foreground md:flex">
                <span className="size-1.5 rounded-full bg-brand-mint" aria-hidden />
                {contexto}
              </span>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              <ExercicioSelector exercicios={exercicios} anoAtivo={anoAtivo} />
            </div>
          </div>
        </header>

        <main className="w-full flex-1 px-5 pb-12 pt-6 lg:px-7">{children}</main>

        <footer className="px-5 lg:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t py-5 pb-24 text-[11.5px] font-medium text-muted-foreground lg:pr-20">
            <span>
              <b className="font-extrabold text-primary">Emendas360</b> ·
              orçamento impositivo
            </span>
            <span>A decisão de mérito e a assinatura são do parlamentar.</span>
          </div>
        </footer>
      </div>

      <AssistenteWidget />
    </div>
  );
}
