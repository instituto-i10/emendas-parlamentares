import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/emendas/print-button";
import { RelatorioValidacao } from "@/components/emendas/relatorio-validacao";
import { getEmendaCompleta } from "@/lib/queries-orcamento";
import {
  ROTULO_STATUS_EMENDA,
  ROTULO_TIPO_EMENDA,
  ROTULO_TIPO_INSTRUMENTO,
} from "@/lib/rotulos";
import type { ResultadoMotor, ItemValidacao } from "@/lib/validation/motor";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  );
}

export default async function EmendaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const e = await getEmendaCompleta(id);
  if (!e) notFound();

  const d = e.dotacao;
  const validacao = e.validacoes[0];
  const relatorio: ResultadoMotor | null = validacao
    ? { resultado: validacao.resultado, itens: validacao.itens as unknown as ItemValidacao[] }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        titulo={`Emenda nº ${e.numero}`}
        descricao={`${ROTULO_TIPO_EMENDA[e.tipo] ?? e.tipo} · ${e.autor.nome}`}
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Emendas", href: "/legislativo/emendas" },
          { titulo: `Nº ${e.numero}` },
        ]}
        acao={<PrintButton />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/legislativo/emendas/${e.id}/plano-trabalho`}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-secondary px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-accent print:hidden"
        >
          <ClipboardList className="size-4" aria-hidden />
          Plano de trabalho
        </Link>
        <Badge>{ROTULO_STATUS_EMENDA[e.status] ?? e.status}</Badge>
        <Badge variant="outline">Exercício {e.exercicio.ano}</Badge>
        <Badge variant="outline">
          Base: {ROTULO_TIPO_INSTRUMENTO[e.instrumentoBase.tipo] ?? e.instrumentoBase.tipo}{" "}
          {e.instrumentoBase.numero}
        </Badge>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Classificação orçamentária</h2>
        <div className="rounded-lg border p-4">
          <Campo rotulo="Órgão" valor={`${d.orgao.codigo} — ${d.orgao.nome}`} />
          <Campo rotulo="Unidade orçamentária" valor={`${d.unidadeOrcamentaria.codigo} — ${d.unidadeOrcamentaria.nome}`} />
          <Campo rotulo="Função" valor={`${d.funcao.codigo} — ${d.funcao.nome}`} />
          <Campo rotulo="Subfunção" valor={`${d.subfuncao.codigo} — ${d.subfuncao.nome}`} />
          <Campo rotulo="Programa" valor={`${d.programa.codigo} — ${d.programa.nome}`} />
          <Campo rotulo="Ação" valor={`${d.acao.codigo} — ${d.acao.nome}`} />
          <Campo
            rotulo="Natureza da despesa"
            valor={`${d.naturezaDespesa.codigo}${d.naturezaDespesa.nome ? ` — ${d.naturezaDespesa.nome}` : ""}`}
          />
          <Campo rotulo="Fonte de recurso" valor={`${d.fonteRecurso.codigo} — ${d.fonteRecurso.nome}`} />
          <Campo rotulo="Valor" valor={brl(Number(e.valor))} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Objeto</h2>
        <p className="whitespace-pre-wrap text-sm">{e.objeto}</p>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Justificativa</h2>
        <p className="whitespace-pre-wrap text-sm">{e.justificativa}</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Validação</h2>
        {relatorio ? (
          <RelatorioValidacao relatorio={relatorio} />
        ) : (
          <p className="text-sm text-muted-foreground">Ainda não validada.</p>
        )}
      </section>
    </div>
  );
}
