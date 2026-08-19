"use client";

import { useActionState, useState } from "react";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  importarBaseAction,
  type ImportState,
} from "@/lib/actions/importacao";

// Dialog de geração da base: envia a planilha (CSV/XLSX) para a server action.
export function ImportBaseDialog({ instrumentoId }: { instrumentoId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importarBaseAction.bind(null, instrumentoId),
    null
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Gerar base de dotações">
          <Database className="size-4" aria-hidden />
          Gerar base
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar base de dotações</DialogTitle>
          <DialogDescription>
            Envie a planilha (CSV/XLSX) com a classificação orçamentária. As
            dotações são vinculadas a este projeto de lei. Reimportar atualiza os
            valores (idempotente).
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="arquivo">Arquivo</Label>
            <input
              id="arquivo"
              name="arquivo"
              type="file"
              accept=".csv,.xlsx,.xls"
              required
              className="block w-full text-sm file:mr-3 file:rounded-[10px] file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Colunas: orgao_codigo, orgao_nome, unidade_codigo, …, valor_inicial.
              Planilha de prioridades: programa_codigo, acao_codigo, descricao.
            </p>
          </div>

          {state ? (
            <div
              role="status"
              className={
                state.ok
                  ? "rounded-lg bg-[var(--blue-100)] px-3 py-2.5 text-[13px] font-medium text-[#2f6f97]"
                  : "rounded-lg bg-[#fdecec] px-3 py-2.5 text-[13px] font-medium text-destructive"
              }
            >
              <p>{state.mensagem}</p>
              {!state.ok && state.erros && state.erros.length > 0 ? (
                <ul className="mt-2 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5">
                  {state.erros.map((e, i) => (
                    <li key={i}>
                      Linha {e.linha}: {e.motivo}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Processando…" : "Importar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
