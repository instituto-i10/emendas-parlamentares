import { PageHeader } from "@/components/page-header";
import { EmendasLista } from "@/components/emendas/emendas-lista";
import { getCurrentUser } from "@/lib/session";
import { getAnoAtivo } from "@/lib/exercicio";
import { listarEmendas } from "@/lib/queries-orcamento";

export default async function MinhasEmendasPage() {
  const user = await getCurrentUser();
  const ano = await getAnoAtivo();
  const emendas = await listarEmendas({ exercicioAno: ano, autorUsuarioId: user.id });

  return (
    <div>
      <PageHeader
        titulo="Minhas emendas"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Emendas", href: "/legislativo/emendas" },
          { titulo: "Minhas emendas" },
        ]}
      />
      <EmendasLista emendas={emendas} mostrarAutor={false} />
    </div>
  );
}
