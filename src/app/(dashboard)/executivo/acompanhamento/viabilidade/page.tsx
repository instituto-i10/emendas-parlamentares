import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Banner } from "@/components/e360/banner";
import { Scale } from "lucide-react";
import { requireAccess } from "@/lib/access";
import { Poder } from "@/generated/prisma/enums";
import { getAnoAtivo } from "@/lib/exercicio";
import { emendasParaViabilidade } from "@/lib/queries-acompanhamento";
import { ListaViabilidade } from "@/components/executivo/lista-viabilidade";

// Manifestação do Executivo sobre a viabilidade técnica das emendas.
// Guard duplo: Poder Executivo E permissão de analisar viabilidade.
export default async function ViabilidadePage() {
  await requireAccess({
    poder: Poder.EXECUTIVO,
    permissoes: ["analisarViabilidade"],
  });
  const ano = await getAnoAtivo();
  const emendas = await emendasParaViabilidade(ano);

  const itens = emendas.map((e) => ({
    id: e.id,
    numero: e.numero,
    objeto: e.objeto,
    valor: Number(e.valor),
    status: e.status as string,
    autor: e.autor.nome,
    parecer: e.pareceres[0]
      ? {
          resultado: e.pareceres[0].resultado as string,
          justificativa: e.pareceres[0].justificativa,
          criadoEm: new Date(e.pareceres[0].criadoEm).toLocaleDateString("pt-BR"),
          autor:
            e.pareceres[0].usuario?.name ??
            e.pareceres[0].usuario?.email ??
            "—",
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Viabilidade técnica"
        crumbs={[
          { titulo: "Hub", href: "/hub" },
          { titulo: "Acompanhamento", href: "/executivo/acompanhamento" },
          { titulo: "Viabilidade técnica" },
        ]}
      />

      <Banner tom="roxo" icone={Scale}>
        <b>O parecer é informativo e não trava a tramitação.</b> Ele fica
        registrado na emenda e à vista da Comissão, que decide com ele em mãos
        — antes da votação como subsídio, depois da aprovação como impedimento
        técnico. A emenda em si não é alterada por esta tela.
      </Banner>

      {itens.length === 0 ? (
        <EmptyState
          titulo="Nenhuma emenda submetida"
          descricao="A manifestação do Executivo cabe a partir da submissão da emenda pelo gabinete."
        />
      ) : (
        <ListaViabilidade itens={itens} />
      )}
    </div>
  );
}
