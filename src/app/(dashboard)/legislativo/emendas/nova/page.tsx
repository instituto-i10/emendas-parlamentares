import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getCurrentUser } from "@/lib/session";
import { podeCriarEmenda } from "@/lib/authz";
import { getAnoAtivo } from "@/lib/exercicio";
import { getInstrumentoBaseAberto } from "@/lib/queries-orcamento";
import { listarBeneficiariosOpcoes } from "@/lib/queries";
import { NovaEmendaForm } from "@/components/emendas/nova-emenda-form";

const crumbs = [
  { titulo: "Hub", href: "/hub" },
  { titulo: "Emendas", href: "/legislativo/emendas" },
  { titulo: "Nova emenda" },
];

export default async function NovaEmendaPage() {
  const user = await getCurrentUser();

  if (!podeCriarEmenda(user)) {
    return (
      <div>
        <PageHeader titulo="Nova emenda" crumbs={crumbs} />
        <EmptyState
          titulo="Sem permissão"
          descricao="Seu perfil não pode apresentar emendas."
        />
      </div>
    );
  }

  const ano = await getAnoAtivo();
  const [base, beneficiarios] = await Promise.all([
    getInstrumentoBaseAberto(ano),
    listarBeneficiariosOpcoes(),
  ]);

  return (
    <div>
      <PageHeader
        titulo="Nova emenda"
        crumbs={crumbs}
      />
      {base ? (
        <NovaEmendaForm
          base={{ id: base.id, numero: base.numero, tipo: base.tipo, ano: base.exercicio.ano }}
          beneficiarios={beneficiarios.map((b) => ({ id: b.id, nome: b.nome }))}
        />
      ) : (
        <EmptyState
          titulo="Nenhum projeto de lei aberto para emendas"
          descricao="É preciso um projeto de lei em tramitação no exercício ativo."
        />
      )}
    </div>
  );
}
