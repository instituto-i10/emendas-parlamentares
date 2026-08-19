import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAnoAtivo } from "@/lib/exercicio";
import { emendasPorPrograma } from "@/lib/queries-acompanhamento";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function RelatoriosPage() {
  const ano = await getAnoAtivo();
  const porPrograma = await emendasPorPrograma(ano);
  const qs = ano ? `?ano=${ano}` : "";

  return (
    <div>
      <PageHeader
        titulo="Relatórios"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Tramitação & Acompanhamento", href: "/legislativo/tramitacao" },
          { titulo: "Relatórios" },
        ]}
        acao={
          <Button asChild variant="outline" size="sm">
            <a href={`/api/export/emendas${qs}${qs ? "&" : "?"}formato=xlsx`}>
              <Download className="size-4" aria-hidden /> Exportar XLSX
            </a>
          </Button>
        }
      />
      {porPrograma.length === 0 ? (
        <EmptyState titulo="Sem dados" descricao="Nenhuma emenda no exercício." />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programa</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acatadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porPrograma.map((p) => (
                <TableRow key={p.programa}>
                  <TableCell className="max-w-md truncate" title={p.programa}>
                    {p.programa}
                  </TableCell>
                  <TableCell className="text-right">{p.quantidade}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(p.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(p.acatadas)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
