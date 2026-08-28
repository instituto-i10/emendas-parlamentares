import { getCurrentUser } from "@/lib/session";
import { moduloPorId, podeVerFerramenta } from "@/config/navegacao";
import { PageHeader } from "./page-header";
import { GradeCards } from "./cards-navegacao";
import { EmptyState } from "./empty-state";

// Landing de um macro-módulo: exibe as ferramentas (2º nível) permitidas ao
// usuário — nada de mostrar tudo de uma vez.
export async function ModuloLanding({ moduloId }: { moduloId: string }) {
  const user = await getCurrentUser();
  const modulo = moduloPorId(moduloId);
  if (!modulo) return null;

  const nav = user;
  const ferramentas = modulo.ferramentas.filter((f) =>
    podeVerFerramenta(nav, modulo, f)
  );

  return (
    <div>
      <PageHeader
        titulo={modulo.titulo}
        descricao={modulo.descricao}
        crumbs={[{ titulo: "Hub", href: "/hub" }, { titulo: modulo.titulo }]}
      />
      {ferramentas.length > 0 ? (
        <GradeCards
          itens={ferramentas.map((f) => ({
            titulo: f.titulo,
            descricao: f.descricao,
            href: f.href,
            icon: f.icon,
          }))}
        />
      ) : (
        <EmptyState
          titulo="Nenhuma ferramenta disponível"
          descricao="Seu perfil não tem ferramentas neste módulo."
        />
      )}
    </div>
  );
}
