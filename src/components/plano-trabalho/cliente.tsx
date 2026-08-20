"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanoTrabalhoForm, type ValoresPlano } from "./form";
import {
  gerarLinkEntidade,
  revogarLinkEntidade,
  salvarPlanoTrabalho,
} from "@/lib/actions/plano-trabalho";
import { sugerirRedacao } from "@/lib/actions/redacao";
import type { CategoriaBeneficiario } from "@/lib/plano-trabalho";

// Painel do gabinete: além do formulário, controla o link que a entidade usa
// para preencher sem ter conta no sistema.
export function PlanoTrabalhoCliente({
  emendaId,
  categoria,
  valorEmenda,
  objeto,
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
  beneficiario: string | null;
  editavel: boolean;
  temLink: boolean;
  tokenAtual: string | null;
  linkExpiraEm: string | null;
  preenchidoPor: string | null;
  inicial: ValoresPlano;
}) {
  const [pending, start] = useTransition();
  const [token, setToken] = useState(tokenAtual);
  const [expira, setExpira] = useState(linkExpiraEm);

  // A URL absoluta só existe no cliente — o servidor não conhece o host pelo
  // qual o usuário chegou.
  const url =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/plano-trabalho/${token}`
      : null;

  function gerar() {
    start(async () => {
      const r = await gerarLinkEntidade(emendaId);
      if (r.ok && r.url) {
        setToken(r.url.split("/").pop() ?? null);
        setExpira(new Date(Date.now() + 30 * 864e5).toISOString());
        toast.success("Link gerado. Copie e envie à entidade.");
      } else if (!r.ok) toast.error(r.error);
    });
  }

  function revogar() {
    start(async () => {
      const r = await revogarLinkEntidade(emendaId);
      if (r.ok) {
        setToken(null);
        setExpira(null);
        toast.success("Link revogado.");
      } else toast.error(r.error);
    });
  }

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não consegui copiar — selecione o endereço e copie à mão.");
    }
  }

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
          <CardContent className="space-y-3">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Boa parte do que o plano pede é informação que só a entidade tem.
              Gere um link e envie para ela preencher — não precisa de conta no
              sistema. Você pode preencher aqui do mesmo jeito.
            </p>

            {url ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-[12px]">
                    {url}
                  </code>
                  <Button variant="outline" size="sm" onClick={copiar}>
                    <Copy className="size-4" aria-hidden /> Copiar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={revogar}
                    disabled={pending}
                  >
                    <ShieldOff className="size-4" aria-hidden /> Revogar
                  </Button>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Quem tiver este endereço pode preencher o plano desta emenda.
                  {expira
                    ? ` Vale até ${new Date(expira).toLocaleDateString("pt-BR")}.`
                    : ""}
                </p>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={gerar} disabled={pending}>
                <Link2 className="size-4" aria-hidden /> Gerar link para a entidade
              </Button>
            )}

            {preenchidoPor ? (
              <p className="border-t pt-2.5 text-[12px] font-medium text-muted-foreground">
                Último preenchimento por <b>{preenchidoPor}</b>.
              </p>
            ) : null}
          </CardContent>
        </Card>
      }
    />
  );
}
