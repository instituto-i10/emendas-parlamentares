"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { gerarLinkEntidade, revogarLinkEntidade } from "@/lib/actions/plano-trabalho";

// ---------------------------------------------------------------------------
// Link que a entidade usa para preencher o plano sem ter conta no sistema —
// funcionalidade pedida diretamente pelo jurídico do cliente.
//
// Vive nas duas casas do plano: na página própria e dentro do bloco 3 do
// formulário da emenda. Como o token é gravado no banco, ele exige uma emenda
// já existente — por isso `garantirEmenda`, que no formulário salva o rascunho
// antes de gerar.
// ---------------------------------------------------------------------------
export function LinkEntidade({
  tokenAtual,
  linkExpiraEm,
  preenchidoPor,
  garantirEmenda,
}: {
  tokenAtual: string | null;
  linkExpiraEm: string | null;
  preenchidoPor: string | null;
  /** Devolve o id da emenda (salvando-a se preciso) ou null se não der. */
  garantirEmenda: () => Promise<string | null>;
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
      const emendaId = await garantirEmenda();
      if (!emendaId) return;
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
      const emendaId = await garantirEmenda();
      if (!emendaId) return;
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

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        Gere o link e envie para a entidade preencher — ela não precisa de conta
        no sistema. É ela quem assina o plano ao enviar.
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
            <Button variant="ghost" size="sm" onClick={revogar} disabled={pending}>
              <ShieldOff className="size-4" aria-hidden /> Revogar
            </Button>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Quem tiver este endereço pode preencher o plano desta emenda.
            {expira ? ` Vale até ${new Date(expira).toLocaleDateString("pt-BR")}.` : ""}
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
    </div>
  );
}
