"use client";

import { useState, useTransition } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CampoRedacao, SugestaoResult } from "@/lib/actions/redacao";
import {
  TEXTO_DECLARACAO,
  exigenciasDoPlano,
  reusaJustificativaDaEmenda,
  totalItem,
  totalPlanilha,
  type CategoriaBeneficiario,
  type ItemPlanilha,
} from "@/lib/plano-trabalho";

// ---------------------------------------------------------------------------
// Campos do plano de trabalho simplificado — CONTROLADOS.
//
// O estado vive fora porque o plano tem duas casas: a página própria (onde ele
// se salva sozinho, com botão) e o bloco 3 do formulário da emenda (onde ele é
// salvo junto com o rascunho). Os campos são os mesmos; quem guarda é que muda.
// ---------------------------------------------------------------------------

const controle =
  "flex w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Contexto que a IA recebe para redigir. Sem ele o botão não aparece. */
export type ContextoRedacaoForm = {
  objeto: string;
  beneficiario: string | null;
  sugerir: (campo: CampoRedacao, textoAtual: string) => Promise<SugestaoResult>;
};

export type ValoresPlano = {
  justificativa: string;
  objetivo: string;
  declaracaoAceita: boolean;
  itens: ItemPlanilha[];
};

export const PLANO_VAZIO: ValoresPlano = {
  justificativa: "",
  objetivo: "",
  declaracaoAceita: false,
  itens: [{ descricao: "", quantidade: 1, valorUnitario: 0 }],
};

// Botão de apoio à redação. Nunca sobrescreve calado: o texto sugerido entra
// numa área de revisão e só vai para o campo se o autor mandar.
function BotaoRedacao({
  campo,
  textoAtual,
  ctx,
  onAplicar,
}: {
  campo: CampoRedacao;
  textoAtual: string;
  ctx: ContextoRedacaoForm;
  onAplicar: (texto: string) => void;
}) {
  const [pending, start] = useTransition();
  const [sugestao, setSugestao] = useState<string | null>(null);

  function pedir() {
    start(async () => {
      const r = await ctx.sugerir(campo, textoAtual);
      if (r.ok) setSugestao(r.texto);
      else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={pedir} disabled={pending}>
        <Sparkles className="size-4" aria-hidden />
        {pending
          ? "Escrevendo…"
          : textoAtual.trim()
            ? "Melhorar a redação"
            : "Sugerir um texto"}
      </Button>
      {sugestao ? (
        <div className="space-y-2 rounded-xl border bg-secondary/40 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-muted-foreground">
            Sugestão — revise antes de usar
          </p>
          <p className="text-[13px] leading-relaxed">{sugestao}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                onAplicar(sugestao);
                setSugestao(null);
                toast.success("Texto aplicado. Edite à vontade.");
              }}
            >
              Usar este texto
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSugestao(null)}>
              Descartar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PlanoTrabalhoCampos({
  categoria,
  valorEmenda,
  valores,
  onChange,
  redacao,
  justificativaDaEmenda,
}: {
  categoria: CategoriaBeneficiario | null;
  valorEmenda: number;
  valores: ValoresPlano;
  onChange: (v: ValoresPlano) => void;
  /** Ausente = sem apoio de redação (o campo continua livre para digitar). */
  redacao?: ContextoRedacaoForm;
  /**
   * Justificativa da emenda. Fora do terceiro setor é ELA que vale como
   * justificativa do plano — o campo separado não aparece. Ausente só onde a
   * tela não conhece a emenda.
   */
  justificativaDaEmenda?: string;
}) {
  const exige = exigenciasDoPlano(categoria);
  const reusa =
    justificativaDaEmenda !== undefined && reusaJustificativaDaEmenda(categoria);
  const { justificativa, objetivo, declaracaoAceita, itens } = valores;
  const total = totalPlanilha(itens.filter((i) => i.descricao.trim()));
  const diferenca = valorEmenda > 0 ? total - valorEmenda : 0;

  const alterar = (parcial: Partial<ValoresPlano>) =>
    onChange({ ...valores, ...parcial });

  function alterarItem(i: number, campo: keyof ItemPlanilha, valor: string) {
    alterar({
      itens: itens.map((x, k) => {
        if (k !== i) return x;
        if (campo === "descricao") return { ...x, descricao: valor };
        const n = Number(valor.replace(/\./g, "").replace(",", "."));
        return { ...x, [campo]: Number.isFinite(n) ? n : 0 };
      }),
    });
  }

  return (
    <div className="grid gap-5">
      <p className="rounded-lg bg-secondary p-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {categoria === null ? (
          <>
            Escolha o <b>tipo de destino</b> do beneficiário para o plano mostrar
            o que aquela categoria exige. Para órgão público o plano é a própria
            justificativa da emenda; para entidade do terceiro setor ele pede
            também objetivo, declaração e planilha.
          </>
        ) : exige.planilha ? (
          <>
            O beneficiário é uma <b>entidade do terceiro setor</b>: além da
            justificativa, o plano pede o objetivo, a declaração e a planilha
            orçamentária. Aqui a justificativa é a da <b>entidade</b>, separada
            da justificativa da emenda — quem escreve é ela.
          </>
        ) : (
          <>
            O beneficiário é da <b>administração pública</b>: o plano é a própria
            justificativa da emenda. Não há entidade externa para preencher nada,
            e o mesmo texto não é pedido duas vezes.
          </>
        )}{" "}
        Este é o plano <b>simplificado</b> da apresentação da emenda. O plano de
        trabalho completo, quando houver repasse, é elaborado na execução
        orçamentária.
      </p>

      {reusa ? (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Justificativa</span>
          <div className="rounded-[10px] border bg-secondary/40 p-3 text-[13px] leading-relaxed">
            {justificativaDaEmenda!.trim() || (
              <span className="text-muted-foreground">
                Ainda não escrita — a justificativa da emenda é que vale aqui.
              </span>
            )}
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Esta é a justificativa da emenda. Para órgão público ela vale como a
            do plano — edite-a no campo <b>Justificativa da emenda</b>.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="pt-justificativa">Justificativa do plano</Label>
          <textarea
            id="pt-justificativa"
            className={`${controle} min-h-28`}
            value={justificativa}
            onChange={(e) => alterar({ justificativa: e.target.value })}
            placeholder="Por que o recurso é necessário e como será aplicado."
          />
          {redacao ? (
            <BotaoRedacao
              campo="justificativa"
              textoAtual={justificativa}
              ctx={redacao}
              onAplicar={(t) => alterar({ justificativa: t })}
            />
          ) : null}
        </div>
      )}

      {exige.objetivo ? (
        <div className="space-y-1.5">
          <Label htmlFor="pt-objetivo">Objetivo</Label>
          <textarea
            id="pt-objetivo"
            className={`${controle} min-h-24`}
            value={objetivo}
            onChange={(e) => alterar({ objetivo: e.target.value })}
            placeholder="O que se pretende alcançar com o recurso."
          />
          {redacao ? (
            <BotaoRedacao
              campo="objetivo"
              textoAtual={objetivo}
              ctx={redacao}
              onAplicar={(t) => alterar({ objetivo: t })}
            />
          ) : null}
        </div>
      ) : null}

      {exige.declaracao ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0"
            checked={declaracaoAceita}
            onChange={(e) => alterar({ declaracaoAceita: e.target.checked })}
          />
          <span className="text-[12.5px] leading-relaxed">{TEXTO_DECLARACAO}</span>
        </label>
      ) : null}

      {exige.planilha ? (
        <div className="space-y-3 border-t pt-5">
          <h3 className="text-base font-medium">Planilha orçamentária</h3>
          <div className="hidden gap-2 text-[11px] font-bold uppercase tracking-[1.1px] text-muted-foreground sm:grid sm:grid-cols-[1fr_88px_136px_136px_40px]">
            <span>Item</span>
            <span>Qtd.</span>
            <span>Valor unitário</span>
            <span className="text-right">Total</span>
            <span />
          </div>
          {itens.map((it, i) => (
            <div
              key={i}
              className="grid gap-2 sm:grid-cols-[1fr_88px_136px_136px_40px] sm:items-center"
            >
              <Input
                aria-label={`Descrição do item ${i + 1}`}
                value={it.descricao}
                onChange={(e) => alterarItem(i, "descricao", e.target.value)}
                placeholder="Descrição do item"
              />
              <Input
                aria-label={`Quantidade do item ${i + 1}`}
                inputMode="decimal"
                value={String(it.quantidade)}
                onChange={(e) => alterarItem(i, "quantidade", e.target.value)}
              />
              <Input
                aria-label={`Valor unitário do item ${i + 1}`}
                inputMode="decimal"
                value={String(it.valorUnitario)}
                onChange={(e) => alterarItem(i, "valorUnitario", e.target.value)}
              />
              <span className="text-right text-sm font-semibold tabular-nums">
                {brl(totalItem(it))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remover item ${i + 1}`}
                disabled={itens.length === 1}
                onClick={() => alterar({ itens: itens.filter((_, k) => k !== i) })}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              alterar({
                itens: [...itens, { descricao: "", quantidade: 1, valorUnitario: 0 }],
              })
            }
          >
            <Plus className="size-4" aria-hidden /> Adicionar item
          </Button>

          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-3">
            <span className="text-sm font-semibold">Total da planilha</span>
            <span className="text-base font-extrabold tabular-nums">{brl(total)}</span>
          </div>
          {valorEmenda > 0 ? (
            <p
              className={`text-[12.5px] font-medium ${
                Math.abs(diferenca) <= 0.01 ? "text-muted-foreground" : "text-destructive"
              }`}
            >
              {Math.abs(diferenca) <= 0.01
                ? `Fecha com o valor da emenda (${brl(valorEmenda)}).`
                : `A emenda é de ${brl(valorEmenda)} — ${
                    diferenca > 0 ? "sobram" : "faltam"
                  } ${brl(Math.abs(diferenca))} para fechar.`}
            </p>
          ) : (
            <p className="text-[12.5px] font-medium text-muted-foreground">
              Informe o valor da emenda para conferir se a planilha fecha com ele.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
