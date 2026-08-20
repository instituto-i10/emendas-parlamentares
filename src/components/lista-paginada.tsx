"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const CONTROLE_FILTRO =
  "h-9 rounded-[10px] border border-input bg-card pl-3 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 campo-select";

export type FiltroSelecao = {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  /** Rótulo da opção "sem filtro". */
  vazio: string;
  opcoes: { valor: string; rotulo: string }[];
};

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Lista com busca, filtros de seleção e paginação.
 *
 * Existe porque lista longa transfere para a pessoa o trabalho de achar — e é
 * achar que ela veio fazer. O recorte roda no cliente: o volume de um exercício
 * cabe em memória e a resposta é imediata, sem ida ao servidor a cada tecla.
 *
 * Os filtros de seleção ficam de fora (controlados por quem usa) porque cada
 * lista filtra por coisas diferentes; o que se repete — busca, contagem e
 * paginação — mora aqui.
 */
export function ListaPaginada<T>({
  itens,
  textoBusca,
  placeholder,
  porPagina = 15,
  filtros = [],
  rotuloItens,
  children,
}: {
  itens: T[];
  /** Texto concatenado do item, no qual a busca procura. */
  textoBusca: (item: T) => string;
  placeholder: string;
  porPagina?: number;
  filtros?: FiltroSelecao[];
  /** Ex.: "emendas", "beneficiários". */
  rotuloItens: string;
  children: (visiveis: T[]) => ReactNode;
}) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return itens;
    return itens.filter((i) => normalizar(textoBusca(i)).includes(termo));
  }, [itens, busca, textoBusca]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  // Filtrar encurta a lista: a página atual pode ter deixado de existir.
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const visiveis = filtradas.slice(inicio, inicio + porPagina);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* No celular a busca ocupa a linha inteira e empurra os filtros para
            baixo. Com `flex-1` + `min-w-0` ela encolhia até virar só a lupa,
            porque os selects seguravam a própria largura. */}
        <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="pl-9"
            placeholder={placeholder}
            aria-label={placeholder}
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
        </div>

        {filtros.map((f) => (
          <select
            key={f.rotulo}
            className={`${CONTROLE_FILTRO} min-w-0 flex-1 sm:flex-none`}
            aria-label={f.rotulo}
            value={f.valor}
            onChange={(e) => {
              f.onChange(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">{f.vazio}</option>
            {f.opcoes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        ))}

        <span className="ml-auto shrink-0 text-[12.5px] font-medium text-muted-foreground">
          {filtradas.length === itens.length
            ? `${itens.length} ${rotuloItens}`
            : `${filtradas.length} de ${itens.length}`}
        </span>
      </div>

      {children(visiveis)}

      {totalPaginas > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12.5px] font-medium text-muted-foreground">
            {inicio + 1}–{Math.min(inicio + porPagina, filtradas.length)} de{" "}
            {filtradas.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={paginaAtual <= 1}
              onClick={() => setPagina(paginaAtual - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden /> Anterior
            </Button>
            <span className="text-[12.5px] font-semibold tabular-nums">
              {paginaAtual} / {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={paginaAtual >= totalPaginas}
              onClick={() => setPagina(paginaAtual + 1)}
            >
              Próxima <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
