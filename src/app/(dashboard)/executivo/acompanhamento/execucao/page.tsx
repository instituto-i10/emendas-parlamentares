import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAnoAtivo } from "@/lib/exercicio";
import {
  consumoTetoPorAutor,
  resumoTramitacao,
} from "@/lib/queries-acompanhamento";
import { ROTULO_STATUS_EMENDA } from "@/lib/rotulos";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function ExecucaoPage() {
  const ano = await getAnoAtivo();
  const [tramitacao, teto] = await Promise.all([
    resumoTramitacao(ano),
    consumoTetoPorAutor(ano),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Execução e acompanhamento"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Acompanhamento", href: "/executivo/acompanhamento" },
          { titulo: "Execução" },
        ]}
      />

      <section>
        <h2 className="mb-3 text-sm font-medium">Situação de tramitação</h2>
        {tramitacao.length === 0 ? (
          <EmptyState titulo="Sem emendas" descricao="Nenhuma emenda no exercício." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tramitacao.map((t) => (
              <Card key={t.status}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    <Badge variant="secondary">
                      {ROTULO_STATUS_EMENDA[t.status] ?? t.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{t.quantidade}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {brl(t.total)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">
          Consumo do teto por autor
          {teto.teto != null ? (
            <span className="ml-2 text-muted-foreground">
              (teto {brl(teto.teto)})
            </span>
          ) : (
            <span className="ml-2 text-muted-foreground">(sem teto configurado)</span>
          )}
        </h2>
        {teto.autores.length === 0 ? (
          <EmptyState titulo="Sem consumo" descricao="Nenhuma emenda válida/submetida por autor." />
        ) : (
          <div className="space-y-4">
            {teto.autores.map((a) => {
              const pct = teto.teto ? Math.min(100, (a.total / teto.teto) * 100) : 0;
              const estourou = teto.teto != null && a.total > teto.teto;
              return (
                <div key={a.autorId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{a.nome}</span>
                    <span className={estourou ? "text-destructive tabular-nums" : "tabular-nums"}>
                      {brl(a.total)}
                      {teto.teto ? ` / ${brl(teto.teto)}` : ""}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
