"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CampoMoeda } from "@/components/ui/campo-moeda";
import { Obrigatorio } from "@/components/ui/obrigatorio";
import { PesquisaPreco } from "./pesquisa-preco";
import {
  totalCronograma,
  totalItem,
  totalMemoria,
  type DadosPlano,
  type ItemMemoria,
  type Meta,
} from "@/lib/plano-trabalho";

// ---------------------------------------------------------------------------
// O NÚCLEO do plano de trabalho — metas, memória de cálculo e cronograma.
//
// Os quatro modelos pedem estas três seções, e por isso elas moram aqui, num
// componente só. O que varia entre eles — entidade, declarações e assinatura do
// Modelo III — vive em componentes próprios, montados ao redor destes campos.
//
// CONTROLADO: o estado vive fora porque o plano tem duas casas. Nos modelos I,
// II e IV ele é preenchido pelo autor, na tela da emenda; no III, pela própria
// entidade, pelo link. Os campos são os mesmos; quem guarda é que muda.
//
// A memória de cálculo fala o MESMO VOCABULÁRIO das metas — beneficiários e
// meta física — porque é a mesma entrega, agora precificada: cada linha daqui
// corresponde a uma linha de lá.
// ---------------------------------------------------------------------------

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TITULO_COLUNA =
  "px-2 pb-2 text-left text-[10.5px] font-bold uppercase tracking-[1.1px] text-muted-foreground whitespace-nowrap";

// Coluna sem `texto` é a do botão de remover, que não tem rótulo visível. O `*`
// marca só o que se PREENCHE: "Parcela" e "Valor total" são derivados — a ordem
// da linha e a multiplicação — e marcá-los pediria à pessoa algo que ela não
// pode dar.
type Coluna = { texto?: string; obrigatorio?: boolean; direita?: boolean };

function Cabecalho({ colunas }: { colunas: Coluna[] }) {
  return (
    <thead>
      <tr>
        {colunas.map((c, i) => (
          <th
            key={i}
            className={TITULO_COLUNA + (c.direita ? " text-right" : "")}
            scope="col"
          >
            {c.texto ?? <span className="sr-only">Remover</span>}
            {c.obrigatorio ? <Obrigatorio /> : null}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function BotaoRemover({
  onClick,
  desabilitado,
  rotulo,
}: {
  onClick: () => void;
  desabilitado: boolean;
  rotulo: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={onClick}
    >
      <Trash2 className="size-4" aria-hidden />
    </Button>
  );
}

// A soma e o "fecha / não fecha" andam juntos: o número sozinho obriga a pessoa
// a fazer a subtração de cabeça para saber se está certo.
function Fecho({
  rotulo,
  total,
  valorEmenda,
  quandoFecha,
  quandoNaoFecha,
}: {
  rotulo: string;
  total: number;
  valorEmenda: number;
  quandoFecha: string;
  quandoNaoFecha: (diferenca: number) => string;
}) {
  const diferenca = total - valorEmenda;
  const fecha = Math.abs(diferenca) <= 0.01;
  return (
    <>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t pt-3">
        <span className="text-sm font-semibold">{rotulo}</span>
        <span className="text-base font-extrabold tabular-nums">{brl(total)}</span>
      </div>
      <p
        className={`mt-2 text-[12.5px] font-medium ${
          valorEmenda <= 0
            ? "text-muted-foreground"
            : fecha
              ? "text-[var(--on-ok)]"
              : "text-destructive"
        }`}
      >
        {valorEmenda <= 0
          ? "Informe o valor da emenda para conferir."
          : fecha
            ? quandoFecha
            : quandoNaoFecha(diferenca)}
      </p>
    </>
  );
}

export function PlanoTrabalhoCampos({
  valores,
  onChange,
  valorEmenda,
  engenharia = false,
  desabilitado = false,
}: {
  valores: DadosPlano;
  onChange: (v: DadosPlano) => void;
  valorEmenda: number;
  /** Plano de obra: a pesquisa de preço prioriza composições por m². */
  engenharia?: boolean;
  desabilitado?: boolean;
}) {
  const { metas, itens, parcelas } = valores;
  const alterar = (parcial: Partial<DadosPlano>) => onChange({ ...valores, ...parcial });

  const trocarMeta = (i: number, campo: keyof Meta, v: string | number) =>
    alterar({ metas: metas.map((m, k) => (k === i ? { ...m, [campo]: v } : m)) });

  const trocarItem = (i: number, campo: keyof ItemMemoria, v: string | number) =>
    alterar({ itens: itens.map((x, k) => (k === i ? { ...x, [campo]: v } : x)) });

  // Meta física aceita fracionário (4.250 m², 1,5 tonelada) — por isso não é
  // um `type=number` com passo inteiro.
  const numero = (v: string) => {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <div className="grid min-w-0 gap-7">
      {/* ------------------------------------------------------------ metas */}
      <section className="min-w-0">
        <h3 className="text-base font-medium">Metas</h3>
        <p className="mb-3 mt-1 text-[12px] leading-relaxed text-muted-foreground">
          Quem será atendido e quanto será entregue. Sem meta física e sem forma
          de comprovação a linha não serve para prestar contas.
        </p>
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[640px] border-collapse">
            <Cabecalho
              colunas={[
                { texto: "Beneficiários", obrigatorio: true },
                { texto: "Unidade", obrigatorio: true },
                { texto: "Meta física", obrigatorio: true, direita: true },
                { texto: "Como será comprovada", obrigatorio: true },
                {},
              ]}
            />
            <tbody>
              {metas.map((m, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">
                    <Input
                      aria-label={`Beneficiários da meta ${i + 1}`}
                      placeholder="Quem será atendido"
                      disabled={desabilitado}
                      value={m.beneficiarios}
                      onChange={(e) => trocarMeta(i, "beneficiarios", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      aria-label={`Unidade da meta ${i + 1}`}
                      placeholder="unidade"
                      disabled={desabilitado}
                      value={m.unidade}
                      onChange={(e) => trocarMeta(i, "unidade", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      aria-label={`Meta física da meta ${i + 1}`}
                      inputMode="decimal"
                      className="text-right tabular-nums"
                      disabled={desabilitado}
                      value={String(m.metaFisica)}
                      onChange={(e) => trocarMeta(i, "metaFisica", numero(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      aria-label={`Comprovação da meta ${i + 1}`}
                      placeholder="Como será comprovada"
                      disabled={desabilitado}
                      value={m.comprovacao}
                      onChange={(e) => trocarMeta(i, "comprovacao", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <BotaoRemover
                      rotulo={`Remover meta ${i + 1}`}
                      desabilitado={desabilitado || metas.length === 1}
                      onClick={() => alterar({ metas: metas.filter((_, k) => k !== i) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={desabilitado}
          onClick={() =>
            alterar({
              metas: [...metas, { beneficiarios: "", unidade: "", metaFisica: 0, comprovacao: "" }],
            })
          }
        >
          <Plus className="size-4" aria-hidden /> Adicionar linha
        </Button>
      </section>

      {/* ------------------------------------------------ memória de cálculo */}
      <section className="min-w-0 border-t pt-6">
        <h3 className="text-base font-medium">Memória de cálculo</h3>
        <p className="mb-3 mt-1 text-[12px] leading-relaxed text-muted-foreground">
          As mesmas linhas das metas, agora com preço. Toda linha precisa apontar
          de onde veio o valor — ata de registro, banco de preços, tabela oficial
          ou orçamento de fornecedor.
        </p>

        {/* A pesquisa fica ANTES da tabela porque é por onde a linha nasce
            quando existe preço público — e depois de nascer ela é editável
            como qualquer outra. Quem já sabe o preço ignora e digita. */}
        <div className="mb-4">
          <PesquisaPreco
            engenharia={engenharia}
            desabilitado={desabilitado}
            onAdicionar={(linha) =>
              alterar({
                // Substitui a primeira linha se ela ainda estiver em branco: a
                // tabela abre com uma linha vazia, e empurrá-la para baixo
                // deixaria um buraco no meio da memória de cálculo.
                itens:
                  itens.length === 1 && !itens[0].beneficiarios.trim()
                    ? [linha]
                    : [...itens, linha],
              })
            }
          />
        </div>
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[720px] border-collapse">
            <Cabecalho
              colunas={[
                { texto: "Beneficiários", obrigatorio: true },
                { texto: "Meta física", obrigatorio: true, direita: true },
                { texto: "Valor unitário", obrigatorio: true, direita: true },
                { texto: "Valor total", direita: true },
                { texto: "Origem do preço", obrigatorio: true },
                {},
              ]}
            />
            <tbody>
              {itens.map((it, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">
                    <Input
                      aria-label={`Beneficiários do item ${i + 1}`}
                      placeholder="Quem será atendido"
                      disabled={desabilitado}
                      value={it.beneficiarios}
                      onChange={(e) => trocarItem(i, "beneficiarios", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      aria-label={`Meta física do item ${i + 1}`}
                      inputMode="decimal"
                      className="text-right tabular-nums"
                      disabled={desabilitado}
                      value={String(it.metaFisica)}
                      onChange={(e) => trocarItem(i, "metaFisica", numero(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <CampoMoeda
                      aria-label={`Valor unitário do item ${i + 1}`}
                      disabled={desabilitado}
                      value={it.valorUnitario}
                      onChange={(v) => trocarItem(i, "valorUnitario", v)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-right text-sm font-semibold tabular-nums">
                    {brl(totalItem(it))}
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      aria-label={`Origem do preço do item ${i + 1}`}
                      placeholder="Ata, banco de preços, SINAPI…"
                      disabled={desabilitado}
                      value={it.origemPreco}
                      onChange={(e) => trocarItem(i, "origemPreco", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <BotaoRemover
                      rotulo={`Remover item ${i + 1}`}
                      desabilitado={desabilitado || itens.length === 1}
                      onClick={() => alterar({ itens: itens.filter((_, k) => k !== i) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={desabilitado}
          onClick={() =>
            alterar({
              itens: [
                ...itens,
                { beneficiarios: "", metaFisica: 1, valorUnitario: 0, origemPreco: "" },
              ],
            })
          }
        >
          <Plus className="size-4" aria-hidden /> Adicionar linha
        </Button>

        <Fecho
          rotulo="Total da memória de cálculo"
          total={totalMemoria(itens.filter((i) => i.beneficiarios.trim()))}
          valorEmenda={valorEmenda}
          quandoFecha={`Fecha com o valor da emenda (${brl(valorEmenda)}).`}
          quandoNaoFecha={(d) =>
            `A emenda é de ${brl(valorEmenda)} — ${d > 0 ? "sobram" : "faltam"} ${brl(
              Math.abs(d)
            )} para fechar.`
          }
        />
      </section>

      {/* ------------------------------------------------------- cronograma */}
      <section className="min-w-0 border-t pt-6">
        <h3 className="text-base font-medium">Cronograma de desembolso previsto</h3>
        <p className="mb-3 mt-1 text-[12px] leading-relaxed text-muted-foreground">
          Previsão de pagamento, em parcelas. A soma tem de bater com o valor da
          emenda. As datas se definem na execução, não aqui.
        </p>
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[380px] border-collapse">
            <Cabecalho
              colunas={[
                { texto: "Parcela" },
                { texto: "Valor final", obrigatorio: true, direita: true },
                {},
              ]}
            />
            <tbody>
              {parcelas.map((p, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap px-2 py-1 text-sm font-bold">
                    {i + 1}ª parcela
                  </td>
                  <td className="px-2 py-1">
                    <CampoMoeda
                      aria-label={`Valor final da parcela ${i + 1}`}
                      disabled={desabilitado}
                      value={p.valor}
                      onChange={(v) =>
                        alterar({
                          parcelas: parcelas.map((x, k) => (k === i ? { valor: v } : x)),
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <BotaoRemover
                      rotulo={`Remover parcela ${i + 1}`}
                      desabilitado={desabilitado || parcelas.length === 1}
                      onClick={() =>
                        alterar({ parcelas: parcelas.filter((_, k) => k !== i) })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={desabilitado}
          onClick={() => alterar({ parcelas: [...parcelas, { valor: 0 }] })}
        >
          <Plus className="size-4" aria-hidden /> Adicionar parcela
        </Button>

        <Fecho
          rotulo="Total do cronograma"
          total={totalCronograma(parcelas)}
          valorEmenda={valorEmenda}
          quandoFecha="As parcelas somam o valor da emenda."
          quandoNaoFecha={(d) =>
            `As parcelas somam ${brl(totalCronograma(parcelas))} — ${
              d > 0 ? "excedem" : "faltam"
            } ${brl(Math.abs(d))}.`
          }
        />
      </section>
    </div>
  );
}
