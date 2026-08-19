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
import { getCurrentUser } from "@/lib/session";
import { podeTramitar } from "@/lib/authz";
import { getAnoAtivo } from "@/lib/exercicio";
import { listarEmendas } from "@/lib/queries-orcamento";
import { TramitacaoActions } from "@/components/emendas/tramitacao-actions";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function StatusTramitacaoPage() {
  const user = await getCurrentUser();
  const ano = await getAnoAtivo();
  const submetidas = await listarEmendas({ exercicioAno: ano, status: "SUBMETIDA" });
  const podeAgir = podeTramitar(user);

  return (
    <div>
      <PageHeader
        titulo="Situação das emendas"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Tramitação & Acompanhamento", href: "/legislativo/tramitacao" },
          { titulo: "Situação das emendas" },
        ]}
      />
      {submetidas.length === 0 ? (
        <EmptyState
          titulo="Nada para tramitar"
          descricao="Não há emendas submetidas no exercício."
        />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Nº</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Programa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                {podeAgir ? <TableHead className="w-56">Ações</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {submetidas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.numero}</TableCell>
                  <TableCell>{e.autor}</TableCell>
                  <TableCell className="max-w-56 truncate" title={e.programa}>
                    {e.programa}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{brl(e.valor)}</TableCell>
                  {podeAgir ? (
                    <TableCell>
                      <TramitacaoActions id={e.id} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
