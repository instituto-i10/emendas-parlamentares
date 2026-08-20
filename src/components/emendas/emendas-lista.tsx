"use client";

import { useMemo, useState } from "react";
import { ListaPaginada } from "@/components/lista-paginada";
import { EmendasTable, type EmendaLinha } from "./emendas-table";
import { ROTULO_STATUS_EMENDA, ROTULO_TIPO_EMENDA } from "@/lib/rotulos";

/** Lista de emendas com busca por nº/autor/programa/ação e filtros de situação e tipo. */
export function EmendasLista({
  emendas,
  mostrarAutor = true,
}: {
  emendas: EmendaLinha[];
  mostrarAutor?: boolean;
}) {
  const [status, setStatus] = useState("");
  const [tipo, setTipo] = useState("");

  const opcoes = useMemo(
    () => ({
      status: [...new Set(emendas.map((e) => e.status))].sort().map((s) => ({
        valor: s,
        rotulo: ROTULO_STATUS_EMENDA[s] ?? s,
      })),
      tipo: [...new Set(emendas.map((e) => e.tipo))].sort().map((t) => ({
        valor: t,
        rotulo: ROTULO_TIPO_EMENDA[t] ?? t,
      })),
    }),
    [emendas]
  );

  // Os filtros de seleção recortam antes da busca; a ListaPaginada cuida do
  // resto (texto, contagem e páginas).
  const recortadas = useMemo(
    () =>
      emendas.filter(
        (e) => (!status || e.status === status) && (!tipo || e.tipo === tipo)
      ),
    [emendas, status, tipo]
  );

  return (
    <ListaPaginada
      itens={recortadas}
      rotuloItens="emendas"
      placeholder="Buscar por nº, autor, programa ou ação"
      textoBusca={(e) => `${e.numero} ${e.autor} ${e.programa} ${e.acao}`}
      filtros={[
        {
          rotulo: "Filtrar por situação",
          vazio: "Todas as situações",
          valor: status,
          onChange: setStatus,
          opcoes: opcoes.status,
        },
        {
          rotulo: "Filtrar por tipo",
          vazio: "Todos os tipos",
          valor: tipo,
          onChange: setTipo,
          opcoes: opcoes.tipo,
        },
      ]}
    >
      {(visiveis) => (
        <EmendasTable emendas={visiveis} mostrarAutor={mostrarAutor} />
      )}
    </ListaPaginada>
  );
}
