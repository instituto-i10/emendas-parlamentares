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
import { InstrumentoStatus } from "@/components/executivo/instrumento-status";
import { ROTULO_ESPECIE, ROTULO_TIPO_INSTRUMENTO } from "@/lib/rotulos";

export default async function InstrumentosPage() {
  const instrumentos = await listarInstrumentos();

  return (
    <div>
      <PageHeader
        titulo="Instrumentos"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Planejamento & Orçamento", href: "/executivo/planejamento" },
          { titulo: "Instrumentos" },
        ]}
      />
      {instrumentos.length === 0 ? (
        <EmptyState
          titulo="Nenhum instrumento"
          descricao="Cadastre o projeto de lei em Configurações → Instrumentos."
        />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Espécie</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Exercício</TableHead>
                <TableHead>Dotações</TableHead>
                <TableHead>Ciclo de vida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instrumentos.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <Badge variant={i.especie === "PROJETO_LEI" ? "secondary" : "default"}>
                      {ROTULO_ESPECIE[i.especie] ?? i.especie}
                    </Badge>
                  </TableCell>
                  <TableCell>{ROTULO_TIPO_INSTRUMENTO[i.tipo] ?? i.tipo}</TableCell>
                  <TableCell className="font-medium">{i.numero}</TableCell>
                  <TableCell>{i.exercicio?.ano ?? "—"}</TableCell>
                  <TableCell>{i._count.dotacoes}</TableCell>
                  <TableCell>
                    <InstrumentoStatus id={i.id} status={i.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
