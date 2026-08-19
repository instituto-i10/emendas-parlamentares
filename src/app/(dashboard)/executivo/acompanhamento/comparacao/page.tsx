import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getAnoAtivo } from "@/lib/exercicio";
import { compararPLxLei, listarComparacoes } from "@/lib/queries-acompanhamento";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function ComparacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ lei?: string }>;
}) {
  const { lei } = await searchParams;
  const ano = await getAnoAtivo();
  const comparacoes = await listarComparacoes(ano);
  const detalhe = lei ? await compararPLxLei(lei) : null;

  return (
    <div>
      <PageHeader
        titulo="PL × Lei aprovada"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Acompanhamento", href: "/executivo/acompanhamento" },
          { titulo: "PL × Lei aprovada" },
        ]}
      />

      {comparacoes.length === 0 ? (
        <EmptyState
          titulo="Aguardando lei aprovada"
          descricao="Suba uma lei aprovada vinculada a um projeto de lei para habilitar o comparativo."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Leis aprovadas</p>
            {comparacoes.map((c) => (
              <Link
                key={c.id}
                href={`?lei=${c.id}`}
                className={cn(
                  "block rounded-[10px] bg-secondary px-3 py-2.5 text-[12.5px] font-semibold transition-colors hover:bg-accent hover:text-accent-foreground",
                  lei === c.id && "border-primary bg-accent"
                )}
              >
                Lei {c.numero}
                <span className="block text-xs text-muted-foreground">
                  origem: PL {c.instrumentoOrigem?.numero}
                </span>
              </Link>
            ))}
          </div>

          <div className="lg:col-span-2">
            {!detalhe ? (
              <div className="rounded-xl bg-secondary p-6 text-center text-[12.5px] font-medium text-muted-foreground">
                Selecione uma lei aprovada para ver o comparativo.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground">
                        Projeto de lei {detalhe.pl?.numero}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold tabular-nums">
                      {brl(detalhe.totalPL.inicial)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground">
                        Lei aprovada {detalhe.lei.numero}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-semibold tabular-nums">
                      {brl(detalhe.totalLei.inicial)}
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Emendas incorporadas</p>
                  {detalhe.emendasAcatadas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma emenda acatada registrada.
                    </p>
                  ) : (
                    <div className="rounded-xl bg-card p-4 shadow-card">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-14">Nº</TableHead>
                            <TableHead>Autor</TableHead>
                            <TableHead>Programa</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detalhe.emendasAcatadas.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell>{e.numero}</TableCell>
                              <TableCell>{e.autor}</TableCell>
                              <TableCell className="max-w-56 truncate" title={e.programa}>
                                {e.programa}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {brl(e.valor)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
