import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PlanoTrabalhoCliente } from "@/components/plano-trabalho/cliente";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { podeGerirEmenda } from "@/lib/authz";
import { planoDoBanco } from "@/lib/plano-db";
import { PLANO_VAZIO } from "@/lib/plano-trabalho";
import { derivarModeloPlano } from "@/lib/plano-modelo";

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
      justificativa: true,
      valor: true,
      status: true,
      autor: { select: { nome: true, usuarioId: true } },
      beneficiario: { select: { nome: true, tipo: true } },
      dotacao: {
        select: {
          naturezaDespesa: {
            select: { grupo: true, modalidadeAplicacao: true, elemento: true },
          },
        },
      },
      planoTrabalho: {
        include: {
          metas: { orderBy: { ordem: "asc" } },
          itens: { orderBy: { ordem: "asc" } },
          parcelas: { orderBy: { ordem: "asc" } },
        },
      },
    },
  });
  if (!emenda) notFound();
  if (!podeGerirEmenda(u, { autorUsuarioId: emenda.autor.usuarioId })) notFound();

  const plano = emenda.planoTrabalho;
  // O modelo sai da dotação, não da escolha do autor — a mesma regra que o
  // motor aplica na hora de validar.
  const modelo = derivarModeloPlano(
    emenda.dotacao?.naturezaDespesa ?? null,
    emenda.beneficiario?.tipo ?? null
  );

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
          modelo
            ? undefined
            : "Escolha a dotação da emenda: é ela que define o que o plano de trabalho precisa conter."
        }
      />

      <PlanoTrabalhoCliente
        emendaId={emenda.id}
        modelo={modelo}
        valorEmenda={Number(emenda.valor)}
        editavel={emenda.status === "RASCUNHO" || emenda.status === "INVALIDA"}
        tokenAtual={plano?.token ?? null}
        linkExpiraEm={plano?.tokenExpiraEm?.toISOString() ?? null}
        preenchidoPor={plano?.preenchidoPor ?? null}
        preenchidoEm={plano?.preenchidoEm?.toISOString() ?? null}
        assinadoEm={plano?.assinadoEm?.toISOString() ?? null}
        assinantePor={plano?.assinanteNome ?? null}
        inicial={planoDoBanco(plano) ?? PLANO_VAZIO}
      />
    </div>
  );
}
