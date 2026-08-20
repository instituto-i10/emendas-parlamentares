"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ListaPaginada } from "@/components/lista-paginada";
import { EmptyState } from "@/components/empty-state";
import { Tag360, tomDoStatus } from "@/components/e360/tag360";
import { TramitacaoActions } from "@/components/emendas/tramitacao-actions";
import { ROTULO_STATUS_EMENDA } from "@/lib/rotulos";

export type ItemFila = {
  id: string;
  numero: string;
  objeto: string;
  autorNome: string;
  orgaoNome: string;
  valor: number;
  status: string;
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Fila de saneamento e parecer.
 *
 * É a tela onde a Mesa passa o dia: fechar um exercício significa esvaziar
 * esta lista. Por isso ela tem busca e filtro de situação — sem eles, achar
 * "aquela emenda do bairro tal" vira rolagem.
 */
export function FilaAnalise({
  itens,
  podeAgir,
}: {
  itens: ItemFila[];
  podeAgir: boolean;
}) {
  const [status, setStatus] = useState("");

  const opcoesStatus = useMemo(
    () =>
      [...new Set(itens.map((e) => e.status))].sort().map((s) => ({
        valor: s,
        rotulo: ROTULO_STATUS_EMENDA[s] ?? s,
      })),
    [itens]
  );

  const recortadas = useMemo(
    () => (status ? itens.filter((e) => e.status === status) : itens),
    [itens, status]
  );

  if (itens.length === 0) {
    return (
      <EmptyState
        titulo="Fila vazia"
        descricao="Nenhuma emenda aguardando saneamento ou parecer neste exercício."
      />
    );
  }

  return (
    <ListaPaginada
      itens={recortadas}
      rotuloItens="na fila"
      porPagina={10}
      placeholder="Buscar por nº, objeto, autor ou destino"
      textoBusca={(e) =>
        `${e.numero} ${e.objeto} ${e.autorNome} ${e.orgaoNome}`
      }
      filtros={[
        {
          rotulo: "Filtrar por situação",
          vazio: "Todas as situações",
          valor: status,
          onChange: setStatus,
          opcoes: opcoesStatus,
        },
      ]}
    >
      {(visiveis) => (
        <div className="flex flex-col gap-2.5">
          {visiveis.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center gap-3 rounded-[10px] border bg-background/60 px-3.5 py-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/legislativo/emendas/${e.id}`}
                  className="block truncate text-[13.5px] font-bold hover:text-brand-cyan hover:underline"
                >
                  Emenda {e.numero} — {e.objeto}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {e.autorNome} · {e.orgaoNome} · {brl(e.valor)}
                </span>
              </div>
              <Tag360 tom={tomDoStatus(e.status)}>
                {ROTULO_STATUS_EMENDA[e.status] ?? e.status}
              </Tag360>
              {podeAgir && e.status === "SUBMETIDA" ? (
                <TramitacaoActions id={e.id} />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </ListaPaginada>
  );
}
