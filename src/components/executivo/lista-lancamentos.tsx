"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListaPaginada, CONTROLE_FILTRO } from "@/components/lista-paginada";
import { registrarAndamentoExecucao } from "@/lib/actions/executivo";
import { ROTULO_ETAPA_EXECUCAO } from "@/lib/rotulos";

type Andamento = {
  id: string;
  etapa: string;
  data: string;
  valor: number;
  numeroDocumento: string | null;
  observacao: string | null;
};

export type ItemExecucao = {
  id: string;
  numero: string;
  objeto: string;
  valor: number;
  autor: string;
  beneficiario: string | null;
  andamentos: Andamento[];
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Soma por etapa. As etapas são cumulativas na despesa pública: o que foi pago
// já passou por liquidação e empenho, então cada linha é lida por si.
function somar(andamentos: Andamento[], etapa: string): number {
  return andamentos
    .filter((a) => a.etapa === etapa)
    .reduce((t, a) => t + a.valor, 0);
}

export function ListaLancamentos({ itens }: { itens: ItemExecucao[] }) {
  const [alvo, setAlvo] = useState<ItemExecucao | null>(null);
  const [filtro, setFiltro] = useState("");

  const filtradas =
    filtro === "sem"
      ? itens.filter((i) => i.andamentos.length === 0)
      : filtro === "com"
        ? itens.filter((i) => i.andamentos.length > 0)
        : itens;

  return (
    <>
      <ListaPaginada
        itens={filtradas}
        rotuloItens="emendas"
        placeholder="Buscar por número, autor, beneficiário ou objeto…"
        textoBusca={(i) =>
          `${i.numero} ${i.autor} ${i.beneficiario ?? ""} ${i.objeto}`
        }
        filtros={[
          {
            rotulo: "Lançamentos",
            valor: filtro,
            onChange: setFiltro,
            vazio: "Todas",
            opcoes: [
              { valor: "sem", rotulo: "Sem lançamento" },
              { valor: "com", rotulo: "Com lançamento" },
            ],
          },
        ]}
      >
        {(visiveis) => (
          <ul className="space-y-3">
            {visiveis.map((i) => {
              const pago = somar(i.andamentos, "PAGAMENTO");
              const pct = i.valor > 0 ? Math.min(100, (pago / i.valor) * 100) : 0;
              return (
                <li key={i.id} className="rounded-xl bg-card p-4 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Emenda {i.numero}</p>
                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        {i.autor}
                        {i.beneficiario ? ` · ${i.beneficiario}` : ""} ·{" "}
                        {brl(i.valor)} aprovados
                      </p>
                      <p className="mt-1 max-w-2xl break-words text-sm">
                        {i.objeto}
                      </p>
                    </div>
                    <Button type="button" size="sm" onClick={() => setAlvo(i)}>
                      Lançar
                    </Button>
                  </div>

                  <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                    {(["EMPENHO", "LIQUIDACAO", "PAGAMENTO"] as const).map((e) => (
                      <div key={e} className="rounded-[10px] bg-muted/50 p-3">
                        <dt className="text-xs text-muted-foreground">
                          {ROTULO_ETAPA_EXECUCAO[e]}
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium tabular-nums">
                          {brl(somar(i.andamentos, e))}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Pago sobre o aprovado
                    </p>
                    <Progress value={pct} />
                  </div>

                  {i.andamentos.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {i.andamentos.map((a) => (
                        <li
                          key={a.id}
                          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                        >
                          <Badge variant="secondary">
                            {ROTULO_ETAPA_EXECUCAO[a.etapa] ?? a.etapa}
                          </Badge>
                          <span className="tabular-nums">{brl(a.valor)}</span>
                          <span className="text-muted-foreground">
                            {a.data}
                            {a.numeroDocumento ? ` · doc. ${a.numeroDocumento}` : ""}
                            {a.observacao ? ` · ${a.observacao}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </ListaPaginada>

      <DialogLancamento alvo={alvo} onClose={() => setAlvo(null)} />
    </>
  );
}

function DialogLancamento({
  alvo,
  onClose,
}: {
  alvo: ItemExecucao | null;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!alvo) return;
    const dados = Object.fromEntries(new FormData(e.currentTarget).entries());
    start(async () => {
      const res = await registrarAndamentoExecucao({
        ...dados,
        emendaId: alvo.id,
      });
      if (res.ok) {
        toast.success(res.message ?? "Lançamento registrado.");
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  const campo =
    "flex h-9 w-full rounded-[10px] border border-input bg-card px-3 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <Dialog open={!!alvo} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar andamento</DialogTitle>
          <DialogDescription>
            {alvo
              ? `Emenda ${alvo.numero} · ${alvo.autor} · ${brl(alvo.valor)} aprovados.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="etapa" className="text-sm font-medium">
              Etapa *
            </label>
            <select
              id="etapa"
              name="etapa"
              required
              defaultValue="EMPENHO"
              className={`${CONTROLE_FILTRO} w-full`}
            >
              {Object.entries(ROTULO_ETAPA_EXECUCAO).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="data" className="text-sm font-medium">
                Data *
              </label>
              <input id="data" name="data" type="date" required className={campo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="valor" className="text-sm font-medium">
                Valor (R$) *
              </label>
              <input
                id="valor"
                name="valor"
                type="number"
                step="0.01"
                min="0.01"
                required
                className={campo}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="numeroDocumento" className="text-sm font-medium">
              Número do documento
            </label>
            <input
              id="numeroDocumento"
              name="numeroDocumento"
              placeholder="nº do empenho, da liquidação ou da ordem de pagamento"
              className={campo}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="observacao" className="text-sm font-medium">
              Observação
            </label>
            <input id="observacao" name="observacao" className={campo} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Registrando…" : "Registrar lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
