"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buscarItemCatalogo } from "@/lib/actions/precos";
import type { PrecoEncontrado } from "@/lib/precos-catalogo";
import type { ItemMemoria } from "@/lib/plano-trabalho";

// ---------------------------------------------------------------------------
// Pesquisa de preço praticado, para alimentar a memória de cálculo.
//
// Nada entra na lista sozinho: a busca MOSTRA os preços e o vereador clica no
// que quer. Um preço público que entra sem ser escolhido vira número que
// ninguém conferiu — e é o autor quem assina.
//
// A linha traz MENOR · MEDIANA · MAIOR de uma vez, sem passo intermediário. Os
// três juntos dizem o que nenhum diz sozinho: a mediana é o valor defensável, e
// a distância até os extremos avisa quando a amostra é dispersa demais para
// confiar nela.
//
// Preço de TABELA (SINAPI, SICRO, SIE-SC) não tem faixa: o valor é o publicado
// na competência, e inventar uma dispersão que não existe seria mentir sobre a
// natureza do número. Nesses casos a linha mostra a unidade e a competência,
// que é o que se confere.
//
// O botão adiciona pela MEDIANA. É a estatística que aguenta a pergunta "de
// onde veio este valor?" na análise técnica.
// ---------------------------------------------------------------------------

const brl = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  });

function Preco({ rotulo, valor, forte }: { rotulo: string; valor: number; forte?: boolean }) {
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[10px] font-bold uppercase tracking-[.6px] text-muted-foreground">
        {rotulo}
      </span>
      <span
        className={
          forte
            ? "text-[12.5px] font-extrabold tabular-nums text-[var(--on-info)]"
            : "text-[12px] font-semibold tabular-nums"
        }
      >
        {brl(valor)}
      </span>
    </span>
  );
}

export function PesquisaPreco({
  onAdicionar,
  engenharia = false,
  desabilitado = false,
}: {
  /** Recebe a linha pronta para entrar na memória de cálculo. */
  onAdicionar: (linha: ItemMemoria) => void;
  /** Plano de obra: composições por m² vêm primeiro na lista. */
  engenharia?: boolean;
  desabilitado?: boolean;
}) {
  const [termo, setTermo] = useState("");
  const [itens, setItens] = useState<PrecoEncontrado[] | null>(null);
  const [buscando, buscar] = useTransition();

  function pesquisar() {
    if (termo.trim().length < 3) {
      toast.error("Digite ao menos 3 letras.");
      return;
    }
    buscar(async () => {
      const r = await buscarItemCatalogo(termo, engenharia);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setItens(r.itens);
    });
  }

  function adicionar(item: PrecoEncontrado) {
    // A origem é escrita por extenso porque é ela que o Executivo e o Tribunal
    // vão ler para decidir se o preço se sustenta.
    const amostra =
      item.contratos > 0
        ? ` — mediana de ${item.contratos} contrato(s)` +
          (item.municipios ? ` em ${item.municipios} município(s)` : "")
        : "";
    onAdicionar({
      beneficiarios: item.descricao,
      metaFisica: 1,
      valorUnitario: item.mediana,
      origemPreco:
        `${item.fonte}${amostra}` +
        (item.unidade ? ` · por ${item.unidade.toLowerCase()}` : ""),
    });
    toast.success(
      item.origem === "ENGENHARIA"
        ? "Linha adicionada pelo preço de tabela. Ajuste a meta física."
        : "Linha adicionada pela mediana. Ajuste a meta física."
    );
  }

  return (
    <div className="min-w-0 rounded-xl bg-[var(--surf-info)] p-4">
      <p className="text-[10.5px] font-bold uppercase tracking-[1.2px] text-[var(--on-info)]">
        Pesquisa de preço
      </p>
      <p className="mb-3 mt-1.5 text-[12px] leading-relaxed text-[var(--on-info)]">
        Digite o {engenharia ? "serviço ou material" : "produto"}. Mostramos o
        que outros órgãos pagaram e as tabelas oficiais de obra, e você escolhe
        se quer usar — nada entra na lista sozinho.
      </p>

      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-[200px] flex-1 bg-card"
          placeholder={
            engenharia
              ? "recapeamento, concreto, alvenaria…"
              : "ultrassom, cadeira, autoclave…"
          }
          aria-label="Produto a pesquisar"
          disabled={desabilitado}
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              pesquisar();
            }
          }}
        />
        <Button type="button" onClick={pesquisar} disabled={desabilitado || buscando}>
          {buscando ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Search className="size-4" aria-hidden />
          )}
          {buscando ? "Consultando…" : "Pesquisar"}
        </Button>
      </div>

      {itens && itens.length === 0 ? (
        <p className="mt-3 text-[12.5px] font-semibold text-[var(--on-warn)]">
          Nada encontrado com preço registrado. Tente outra palavra, ou lance a
          linha à mão informando a origem do preço.
        </p>
      ) : null}

      {itens && itens.length > 0 ? (
        <>
          {/* Cinco linhas à vista (74px de linha + 8px de espaço), o resto rola
              dentro da caixa. A lista inteira empurrava a tabela da memória de
              cálculo para fora da tela. */}
          <ul className="mt-3 flex max-h-[402px] min-w-0 flex-col gap-2 overflow-y-auto pr-1">
            {itens.map((i) => (
              <li
                key={i.id}
                // `shrink-0` é obrigatório: numa coluna flex com altura máxima os
                // filhos encolhem para caber, e com `overflow-hidden` a linha de
                // preços simplesmente sumia em vez de a lista rolar.
                className="min-w-0 shrink-0 overflow-hidden rounded-[10px] bg-card p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <p
                    className="min-w-0 flex-1 truncate text-[12.5px] font-semibold"
                    title={i.descricao}
                  >
                    {i.descricao}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    disabled={desabilitado}
                    onClick={() => adicionar(i)}
                  >
                    <Plus className="size-4" aria-hidden /> Adicionar
                  </Button>
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  {/* Contrato tem faixa; tabela oficial não. Mostrar "menor" e
                      "maior" iguais à mediana sugeriria uma dispersão que não
                      foi medida. */}
                  {i.menor != null ? <Preco rotulo="menor" valor={i.menor} /> : null}
                  <Preco
                    rotulo={i.origem === "ENGENHARIA" ? "tabela" : "mediana"}
                    valor={i.mediana}
                    forte
                  />
                  {i.maior != null ? <Preco rotulo="maior" valor={i.maior} /> : null}
                  <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                    {i.unidade ? `por ${i.unidade.toLowerCase()} · ` : ""}
                    {i.contratos > 0
                      ? `${i.contratos} contrato(s)` +
                        (i.municipios ? ` · ${i.municipios} município(s)` : "")
                      : i.fonte}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-2.5 text-[11.5px] leading-relaxed text-[var(--on-info)]">
            Preço de contrato entra pela <b>mediana</b> — ela não se move quando
            um único órgão paga muito caro; se menor e maior estiverem distantes,
            a amostra é dispersa e vale conferir. Preço de <b>tabela</b> (SINAPI,
            SICRO, SIE-SC) é o publicado na competência, por unidade de medida. Os
            dois entram editáveis.
          </p>
        </>
      ) : null}
    </div>
  );
}
