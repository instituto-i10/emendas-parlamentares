"use client";

import { useState, useTransition } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampoRedacao, SugestaoResult } from "@/lib/actions/redacao";
import {
  TEXTO_DECLARACAO,
  exigenciasDoPlano,
  pendenciasDoPlano,
  totalItem,
  totalPlanilha,
  type CategoriaBeneficiario,
  type ItemPlanilha,
} from "@/lib/plano-trabalho";

const controle =
  "flex w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Contexto que a IA recebe para redigir. Sem ele o botão não aparece. */
export type ContextoRedacaoForm = {
  objeto: string;
  beneficiario: string | null;
  sugerir: (
    campo: CampoRedacao,
    textoAtual: string
  ) => Promise<SugestaoResult>;
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

export type ValoresPlano = {
  justificativa: string;
  objetivo: string;
  declaracaoAceita: boolean;
  itens: ItemPlanilha[];
};

// Formulário único, usado nas duas portas de entrada: a tela do gabinete e a
// página pública que a entidade abre pelo link. O que muda entre elas é só
// quem salva — por isso `onSalvar` vem de fora.
export function PlanoTrabalhoForm({
  categoria,
  valorEmenda,
  inicial,
  onSalvar,
  cabecalho,
  exigirResponsavel = false,
  redacao,
}: {
  categoria: CategoriaBeneficiario | null;
  valorEmenda: number;
  inicial: ValoresPlano;
  onSalvar: (v: ValoresPlano, responsavel: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
  cabecalho?: React.ReactNode;
  /** Na página da entidade, quem preenche precisa se identificar. */
  exigirResponsavel?: boolean;
  /** Ausente = sem apoio de redação (o campo continua livre para digitar). */
  redacao?: ContextoRedacaoForm;
}) {
  const [pending, start] = useTransition();
  const [justificativa, setJustificativa] = useState(inicial.justificativa);
  const [objetivo, setObjetivo] = useState(inicial.objetivo);
  const [declaracaoAceita, setDeclaracao] = useState(inicial.declaracaoAceita);
  const [itens, setItens] = useState<ItemPlanilha[]>(
    inicial.itens.length > 0
      ? inicial.itens
      : [{ descricao: "", quantidade: 1, valorUnitario: 0 }]
  );
  const [responsavel, setResponsavel] = useState("");

  const exige = exigenciasDoPlano(categoria);
  const valores: ValoresPlano = { justificativa, objetivo, declaracaoAceita, itens };
  const pendencias = pendenciasDoPlano(valores, categoria, valorEmenda);
  const total = totalPlanilha(itens.filter((i) => i.descricao.trim()));
  const diferenca = valorEmenda > 0 ? total - valorEmenda : 0;

  function alterarItem(i: number, campo: keyof ItemPlanilha, valor: string) {
    setItens((xs) =>
      xs.map((x, k) => {
        if (k !== i) return x;
        if (campo === "descricao") return { ...x, descricao: valor };
        const n = Number(valor.replace(/\./g, "").replace(",", "."));
        return { ...x, [campo]: Number.isFinite(n) ? n : 0 };
      })
    );
  }

  function salvar() {
    start(async () => {
      const r = await onSalvar(valores, responsavel);
      if (r.ok) toast.success(r.message ?? "Plano de trabalho salvo.");
      else toast.error(r.error ?? "Não foi possível salvar.");
    });
  }

  return (
    <div className="space-y-6">
      {cabecalho}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plano de trabalho</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <p className="rounded-lg bg-secondary p-3 text-[12.5px] leading-relaxed text-muted-foreground">
            {exige.planilha ? (
              <>
                O beneficiário é uma <b>entidade do terceiro setor</b>: além da
                justificativa, o plano pede o objetivo, a declaração e a planilha
                orçamentária.
              </>
            ) : (
              <>
                O beneficiário é da <b>administração pública</b>: aqui o plano
                pede apenas a justificativa.
              </>
            )}{" "}
            Este é o plano <b>simplificado</b> da apresentação da emenda. O plano
            de trabalho completo, quando houver repasse, é elaborado na execução
            orçamentária.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="pt-justificativa">Justificativa</Label>
            <textarea
              id="pt-justificativa"
              className={`${controle} min-h-28`}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que o recurso é necessário e como será aplicado."
            />
            {redacao ? (
              <BotaoRedacao
                campo="justificativa"
                textoAtual={justificativa}
                ctx={redacao}
                onAplicar={setJustificativa}
              />
            ) : null}
          </div>

          {exige.objetivo ? (
            <div className="space-y-1.5">
              <Label htmlFor="pt-objetivo">Objetivo</Label>
              <textarea
                id="pt-objetivo"
                className={`${controle} min-h-24`}
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                placeholder="O que se pretende alcançar com o recurso."
              />
              {redacao ? (
                <BotaoRedacao
                  campo="objetivo"
                  textoAtual={objetivo}
                  ctx={redacao}
                  onAplicar={setObjetivo}
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
                onChange={(e) => setDeclaracao(e.target.checked)}
              />
              <span className="text-[12.5px] leading-relaxed">
                {TEXTO_DECLARACAO}
              </span>
            </label>
          ) : null}
        </CardContent>
      </Card>

      {exige.planilha ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planilha orçamentária</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
                  onClick={() => setItens((xs) => xs.filter((_, k) => k !== i))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setItens((xs) => [...xs, { descricao: "", quantidade: 1, valorUnitario: 0 }])
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
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {exigirResponsavel ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quem está preenchendo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="pt-responsavel">Nome do responsável</Label>
            <Input
              id="pt-responsavel"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Nome completo de quem preenche pela entidade"
            />
            <p className="text-[12px] text-muted-foreground">
              Fica registrado junto ao plano, para que o gabinete saiba quem
              respondeu.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={salvar} disabled={pending}>
          Salvar plano de trabalho
        </Button>
        {pendencias.length > 0 ? (
          <span className="text-[12px] font-medium text-muted-foreground">
            Salva assim mesmo. Para a emenda poder ser remetida, falta{" "}
            {pendencias.join("; ")}.
          </span>
        ) : (
          <span className="text-[12px] font-medium text-[var(--on-ok)]">
            Plano completo para esta categoria de beneficiário.
          </span>
        )}
      </div>
    </div>
  );
}
