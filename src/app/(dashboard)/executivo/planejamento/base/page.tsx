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
import { ROTULO_STATUS_INSTRUMENTO, ROTULO_TIPO_INSTRUMENTO } from "@/lib/rotulos";
import { requirePermissao } from "@/lib/access";

export default async function BasePage() {
  await requirePermissao("gerirPlanejamento");
  const instrumentos = (await listarInstrumentos()).filter(
    (i) => i.especie === "PROJETO_LEI"
  );

  return (
    <div>
      <PageHeader
        titulo="Base de dotações"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Planejamento & Orçamento", href: "/executivo/planejamento" },
          { titulo: "Base de dotações" },
        ]}
      />
      {instrumentos.length === 0 ? (
        <EmptyState
          titulo="Nenhum projeto de lei"
          descricao="Cadastre o PL em Configurações → Instrumentos e gere a base."
        />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dotações</TableHead>
                <TableHead>Emendas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instrumentos.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{ROTULO_TIPO_INSTRUMENTO[i.tipo] ?? i.tipo}</TableCell>
                  <TableCell className="font-medium">{i.numero}</TableCell>
                  <TableCell>
                    <Badge variant={i.status === "EM_TRAMITACAO" ? "default" : "secondary"}>
                      {ROTULO_STATUS_INSTRUMENTO[i.status] ?? i.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{i._count.dotacoes}</TableCell>
                  <TableCell>{i._count.emendas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        Para importar/atualizar a base, vá em{" "}
        <Link href="/config" className="underline">
          Configurações → Instrumentos
        </Link>
        .
      </p>
    </div>
  );
}
