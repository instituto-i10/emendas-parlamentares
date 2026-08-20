import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PlanoTrabalhoCliente } from "@/components/plano-trabalho/cliente";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { podeGerirEmenda } from "@/lib/authz";
import { ROTULO_TIPO_BENEFICIARIO } from "@/lib/rotulos";
import type { CategoriaBeneficiario } from "@/lib/plano-trabalho";

export default async function PlanoTrabalhoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const u = await getCurrentUser();

  const emenda = await prisma.emenda.findUnique({
    where: { id },
    select: {
      id: true,
      numero: true,
      objeto: true,
      valor: true,
      status: true,
      autor: { select: { nome: true, usuarioId: true } },
      beneficiario: { select: { nome: true, tipo: true } },
      planoTrabalho: {
        include: { itens: { orderBy: { ordem: "asc" } } },
      },
    },
  });
  if (!emenda) notFound();
  if (!podeGerirEmenda(u, { autorUsuarioId: emenda.autor.usuarioId })) notFound();

  const plano = emenda.planoTrabalho;
  const categoria = (emenda.beneficiario?.tipo as CategoriaBeneficiario) ?? null;

  return (
    <div className="space-y-6">
      <Link
        href={`/legislativo/emendas/${emenda.id}`}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Voltar à emenda
      </Link>

      <PageHeader
        titulo={`Plano de trabalho — emenda ${emenda.numero}`}
        descricao={
          categoria
            ? `Beneficiário: ${emenda.beneficiario?.nome} · ${ROTULO_TIPO_BENEFICIARIO[categoria]}`
            : "Beneficiário final ainda não informado na emenda — informe-o para saber o que o plano precisa conter."
        }
      />

      <PlanoTrabalhoCliente
        emendaId={emenda.id}
        categoria={categoria}
        valorEmenda={Number(emenda.valor)}
        objeto={emenda.objeto}
        beneficiario={emenda.beneficiario?.nome ?? null}
        editavel={emenda.status === "RASCUNHO" || emenda.status === "INVALIDA"}
        temLink={!!plano?.token}
        tokenAtual={plano?.token ?? null}
        linkExpiraEm={plano?.tokenExpiraEm?.toISOString() ?? null}
        preenchidoPor={plano?.preenchidoPor ?? null}
        inicial={{
          justificativa: plano?.justificativa ?? "",
          objetivo: plano?.objetivo ?? "",
          declaracaoAceita: plano?.declaracaoAceita ?? false,
          itens:
            plano?.itens.map((i) => ({
              descricao: i.descricao,
              quantidade: Number(i.quantidade),
              valorUnitario: Number(i.valorUnitario),
            })) ?? [],
        }}
      />
    </div>
  );
}
