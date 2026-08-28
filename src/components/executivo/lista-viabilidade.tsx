"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListaPaginada, CONTROLE_FILTRO } from "@/components/lista-paginada";
import { registrarParecerViabilidade } from "@/lib/actions/executivo";
import {
  ROTULO_RESULTADO_VIABILIDADE,
  ROTULO_STATUS_EMENDA,
} from "@/lib/rotulos";

type Parecer = {
  resultado: string;
  justificativa: string;
  criadoEm: string;
  autor: string;
};

export type ItemViabilidade = {
  id: string;
  numero: string;
  objeto: string;
  valor: number;
  status: string;
  autor: string;
  parecer: Parecer | null;
};

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Sem semáforo: o resultado é texto com peso, não cor de trânsito. "Inviável"
// não é um erro do autor da emenda — é uma posição do Executivo, e pintá-la de
// vermelho antecipa um juízo que quem lê ainda vai fazer.
const ESTILO: Record<string, string> = {
  VIAVEL: "font-medium",
  VIAVEL_COM_RESSALVA: "font-medium",
  INVIAVEL: "font-medium",
};

export function ListaViabilidade({ itens }: { itens: ItemViabilidade[] }) {
  const [alvo, setAlvo] = useState<ItemViabilidade | null>(null);
  const [filtro, setFiltro] = useState("");

  const filtradas =
    filtro === "pendentes"
      ? itens.filter((i) => !i.parecer)
      : filtro === "manifestadas"
        ? itens.filter((i) => i.parecer)
        : itens;

  return (
    <>
      <ListaPaginada
        itens={filtradas}
        rotuloItens="emendas"
        placeholder="Buscar por número, autor ou objeto…"
        textoBusca={(i) => `${i.numero} ${i.autor} ${i.objeto}`}
        filtros={[
          {
            rotulo: "Manifestação",
            valor: filtro,
            onChange: setFiltro,
            vazio: "Todas",
            opcoes: [
              { valor: "pendentes", rotulo: "Sem parecer" },
              { valor: "manifestadas", rotulo: "Com parecer" },
            ],
          },
        ]}
      >
        {(visiveis) => (
          <ul className="space-y-3">
            {visiveis.map((i) => (
              <li key={i.id} className="rounded-xl bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span>Emenda {i.numero}</span>
                      <Badge variant="secondary">
                        {ROTULO_STATUS_EMENDA[i.status] ?? i.status}
                      </Badge>
                    </p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {i.autor} · {brl(i.valor)}
                    </p>
                    <p className="mt-1 max-w-2xl break-words text-sm">
                      {i.objeto}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={i.parecer ? "outline" : "default"}
                    size="sm"
                    onClick={() => setAlvo(i)}
                  >
                    {i.parecer ? "Novo parecer" : "Manifestar-se"}
                  </Button>
                </div>

                {i.parecer ? (
                  <div className="mt-3 rounded-[10px] bg-muted/50 p-3">
                    <p className="text-sm">
                      <span className={ESTILO[i.parecer.resultado]}>
                        {ROTULO_RESULTADO_VIABILIDADE[i.parecer.resultado] ??
                          i.parecer.resultado}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {i.parecer.autor} · {i.parecer.criadoEm}
                      </span>
                    </p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {i.parecer.justificativa}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </ListaPaginada>

      <DialogParecer alvo={alvo} onClose={() => setAlvo(null)} />
    </>
  );
}

function DialogParecer({
  alvo,
  onClose,
}: {
  alvo: ItemViabilidade | null;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!alvo) return;
    const dados = Object.fromEntries(new FormData(e.currentTarget).entries());
    start(async () => {
      const res = await registrarParecerViabilidade({
        ...dados,
        emendaId: alvo.id,
      });
      if (res.ok) {
        toast.success(res.message ?? "Parecer registrado.");
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={!!alvo} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Parecer de viabilidade</DialogTitle>
          <DialogDescription>
            {alvo ? `Emenda ${alvo.numero} · ${alvo.autor}. ` : ""}O parecer
            fica registrado e visível à Comissão. Não altera a emenda.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="resultado" className="text-sm font-medium">
              Resultado *
            </label>
            <select
              id="resultado"
              name="resultado"
              required
              defaultValue="VIAVEL"
              className={`${CONTROLE_FILTRO} w-full`}
            >
              {Object.entries(ROTULO_RESULTADO_VIABILIDADE).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="justificativa" className="text-sm font-medium">
              Justificativa *
            </label>
            <textarea
              id="justificativa"
              name="justificativa"
              required
              minLength={20}
              placeholder="Fundamento técnico da manifestação — é o que a Comissão vai ler."
              className="flex min-h-28 w-full rounded-[10px] border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Registrando…" : "Registrar parecer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
