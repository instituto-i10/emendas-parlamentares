import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Banner } from "@/components/e360/banner";
import { Banknote } from "lucide-react";
import { requireAccess } from "@/lib/access";
import { Poder } from "@/generated/prisma/enums";
import { getAnoAtivo } from "@/lib/exercicio";
import { emendasParaExecucao } from "@/lib/queries-acompanhamento";
import { ListaLancamentos } from "@/components/executivo/lista-lancamentos";

// Lançamento do andamento da execução orçamentária das emendas aprovadas.
export default async function LancamentosPage() {
  await requireAccess({
    poder: Poder.EXECUTIVO,
    permissoes: ["registrarExecucao"],
  });
  const ano = await getAnoAtivo();
  const emendas = await emendasParaExecucao(ano);

  const itens = emendas.map((e) => ({
    id: e.id,
    numero: e.numero,
    objeto: e.objeto,
    valor: Number(e.valor),
    autor: e.autor.nome,
    beneficiario: e.beneficiario?.nome ?? null,
    andamentos: e.andamentos.map((a) => ({
      id: a.id,
      etapa: a.etapa as string,
      data: new Date(a.data).toLocaleDateString("pt-BR"),
      valor: Number(a.valor),
      numeroDocumento: a.numeroDocumento,
      observacao: a.observacao,
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Execução das emendas"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Acompanhamento", href: "/executivo/acompanhamento" },
          { titulo: "Execução das emendas" },
        ]}
      />

      <Banner tom="roxo" icone={Banknote}>
        <b>Lançamento manual, nas três etapas da despesa.</b> Empenho,
        liquidação e pagamento seguem o vocabulário da Lei 4.320/1964: se um dia
        estes dados passarem a vir do sistema financeiro do município, os campos
        já são os mesmos e a digitação apenas cessa.
      </Banner>

      {itens.length === 0 ? (
        <EmptyState
          titulo="Nenhuma emenda aprovada"
          descricao="A execução orçamentária começa depois que a emenda é acatada na lei."
        />
      ) : (
        <ListaLancamentos itens={itens} />
      )}
    </div>
  );
}
