import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmendasLista } from "@/components/emendas/emendas-lista";
import { getAnoAtivo } from "@/lib/exercicio";
import { listarEmendas } from "@/lib/queries-orcamento";

export default async function TodasEmendasPage() {
  const ano = await getAnoAtivo();
  const emendas = await listarEmendas({ exercicioAno: ano });
  const qs = ano ? `?ano=${ano}` : "";

  return (
    <div>
      <PageHeader
        titulo="Todas as emendas"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Emendas", href: "/legislativo/emendas" },
          { titulo: "Todas as emendas" },
        ]}
        acao={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/export/emendas${qs}${qs ? "&" : "?"}formato=csv`}>
                <Download className="size-4" aria-hidden /> CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/export/emendas${qs}${qs ? "&" : "?"}formato=xlsx`}>
                <Download className="size-4" aria-hidden /> XLSX
              </a>
            </Button>
          </div>
        }
      />
      <EmendasLista emendas={emendas} />
    </div>
  );
}
