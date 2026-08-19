import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listarInstrumentos } from "@/lib/queries";
import { ROTULO_STATUS_INSTRUMENTO } from "@/lib/rotulos";

export default async function LeiAprovadaPage() {
  const leis = (await listarInstrumentos()).filter(
    (i) => i.especie === "LEI_APROVADA"
  );

  return (
    <div>
      <PageHeader
        titulo="Lei aprovada"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Planejamento & Orçamento", href: "/executivo/planejamento" },
          { titulo: "Lei aprovada" },
        ]}
      />
      {leis.length === 0 ? (
        <EmptyState
          titulo="Nenhuma lei aprovada"
          descricao="Após a sanção, suba a lei aprovada vinculada ao PL de origem."
        />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Origem (PL)</TableHead>
                <TableHead>Exercício</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leis.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.numero}</TableCell>
                  <TableCell>{i.instrumentoOrigem?.numero ?? "—"}</TableCell>
                  <TableCell>{i.exercicio?.ano ?? "—"}</TableCell>
                  <TableCell>
                    <Badge>{ROTULO_STATUS_INSTRUMENTO[i.status] ?? i.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        Subir lei aprovada:{" "}
        <Link href="/config" className="underline">
          Configurações → Instrumentos
        </Link>
        .
      </p>
    </div>
  );
}
