"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanoTrabalhoForm, type ValoresPlano } from "./form";
import { LinkEntidade } from "./link-entidade";
import { salvarPlanoTrabalho } from "@/lib/actions/plano-trabalho";
import { sugerirRedacao } from "@/lib/actions/redacao";
import type { CategoriaBeneficiario } from "@/lib/plano-trabalho";

// Painel do gabinete: além do formulário, controla o link que a entidade usa
// para preencher sem ter conta no sistema.
export function PlanoTrabalhoCliente({
  emendaId,
  categoria,
  valorEmenda,
  objeto,
  justificativaEmenda,
  beneficiario,
  editavel,
  tokenAtual,
  linkExpiraEm,
  preenchidoPor,
  inicial,
}: {
  emendaId: string;
  categoria: CategoriaBeneficiario | null;
  valorEmenda: number;
  objeto: string;
  justificativaEmenda: string;
  beneficiario: string | null;
  editavel: boolean;
  temLink: boolean;
  tokenAtual: string | null;
  linkExpiraEm: string | null;
  preenchidoPor: string | null;
  inicial: ValoresPlano;
}) {
  if (!editavel) {
    return (
      <div className="rounded-xl bg-secondary p-6 text-[13px] font-medium text-muted-foreground">
        Esta emenda já saiu do rascunho — o plano de trabalho não pode mais ser
        alterado.
      </div>
    );
  }

  return (
    <PlanoTrabalhoForm
      categoria={categoria}
      valorEmenda={valorEmenda}
      inicial={inicial}
      justificativaDaEmenda={justificativaEmenda}
      onSalvar={(v) => salvarPlanoTrabalho(emendaId, v)}
      redacao={{
        objeto,
        beneficiario,
        sugerir: (campo, textoAtual) =>
          sugerirRedacao({
            campo,
            objeto,
            valor: valorEmenda,
            beneficiario,
            terceiroSetor: categoria === "TERCEIRO_SETOR",
            textoAtual,
          }),
      }}
      cabecalho={
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Preenchimento pela entidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LinkEntidade
              tokenAtual={tokenAtual}
              linkExpiraEm={linkExpiraEm}
              preenchidoPor={preenchidoPor}
              garantirEmenda={async () => emendaId}
            />
          </CardContent>
        </Card>
      }
    />
  );
}
