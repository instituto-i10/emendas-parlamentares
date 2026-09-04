"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanoTrabalhoCampos } from "./campos";
import { LinkEntidade } from "./link-entidade";
import { salvarPlanoTrabalho } from "@/lib/actions/plano-trabalho";
import {
  pendenciasDoPlano,
  totalCronograma,
  totalMemoria,
  type DadosPlano,
} from "@/lib/plano-trabalho";
import type { ModeloPlano } from "@/lib/plano-modelo";

// ---------------------------------------------------------------------------
// O plano na tela do GABINETE.
//
// Duas telas diferentes, conforme o modelo:
//
//   Modelo III — o autor NÃO preenche. Meta física, preço praticado e forma de
//   comprovação são informação que só a entidade tem, e o formulário vive no
//   link enviado a ela. Aqui ele gera o link, acompanha e confere o que voltou.
//
//   Modelos I, II e IV — quem executa é o próprio Município, e o autor preenche
//   ali mesmo. Não há link: não haveria a quem enviá-lo.
// ---------------------------------------------------------------------------

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Totais({ plano, valorEmenda }: { plano: DadosPlano; valorEmenda: number }) {
  const linhas: [string, number, string][] = [
    ["Memória de cálculo", totalMemoria(plano.itens), "memória"],
    ["Cronograma previsto", totalCronograma(plano.parcelas), "cronograma"],
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {linhas.map(([rotulo, total, nome]) => {
        const fecha = Math.abs(total - valorEmenda) <= 0.01;
        return (
          <div key={nome} className="rounded-[10px] bg-secondary px-3.5 py-3">
            <dt className="text-[11px] font-semibold text-muted-foreground">{rotulo}</dt>
            <dd className="mt-1 text-base font-extrabold tabular-nums">{brl(total)}</dd>
            <dd
              className={`mt-1 text-[11.5px] font-semibold ${
                fecha ? "text-[var(--on-ok)]" : "text-destructive"
              }`}
            >
              {fecha
                ? "Fecha com o valor da emenda."
                : `Não fecha: a emenda é de ${brl(valorEmenda)}.`}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function PlanoTrabalhoCliente({
  emendaId,
  modelo,
  valorEmenda,
  editavel,
  tokenAtual,
  linkExpiraEm,
  preenchidoPor,
  preenchidoEm,
  assinadoEm,
  assinantePor,
  inicial,
}: {
  emendaId: string;
  modelo: ModeloPlano | null;
  valorEmenda: number;
  editavel: boolean;
  tokenAtual: string | null;
  linkExpiraEm: string | null;
  preenchidoPor: string | null;
  preenchidoEm: string | null;
  assinadoEm: string | null;
  assinantePor: string | null;
  inicial: DadosPlano;
}) {
  const [valores, setValores] = useState<DadosPlano>(inicial);
  const [pending, start] = useTransition();

  const pendencias = pendenciasDoPlano(valores, modelo, valorEmenda);

  function salvar() {
    start(async () => {
      const r = await salvarPlanoTrabalho(emendaId, valores);
      toast[r.ok ? "success" : "error"](r.ok ? "Plano de trabalho salvo." : r.error);
    });
  }

  if (!modelo) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="mx-auto max-w-[56ch] text-[13px] leading-relaxed text-muted-foreground">
            Escolha a dotação da emenda para o plano de trabalho aparecer. É ela
            que define o que o plano precisa conter.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------------ Modelo III --
  if (modelo === "TERCEIRO_SETOR") {
    const recebido = !!preenchidoEm;
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preenchimento pela entidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Meta física, preço praticado e forma de comprovação são informação
              que só a entidade tem. Por isso estes campos <b>não ficam nesta
              tela</b>: eles vivem no link que você envia. Você acompanha aqui o
              que voltar.
            </p>
            <LinkEntidade
              tokenAtual={tokenAtual}
              linkExpiraEm={linkExpiraEm}
              preenchidoPor={preenchidoPor}
              garantirEmenda={async () => emendaId}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">O que a entidade enviou</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!recebido ? (
              <p
                className={`rounded-[10px] px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed ${
                  tokenAtual
                    ? "bg-[var(--surf-warn)] text-[var(--on-warn)]"
                    : "bg-[var(--surf-bad)] text-[var(--on-bad)]"
                }`}
              >
                {tokenAtual
                  ? "Link enviado. Aguardando o preenchimento da entidade."
                  : "Sem link, a entidade não tem como preencher — e a emenda não pode ser remetida."}
              </p>
            ) : (
              <>
                <p className="rounded-[10px] bg-[var(--surf-ok)] px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed text-[var(--on-ok)]">
                  {assinadoEm
                    ? `Plano assinado por ${assinantePor} em ${new Date(
                        assinadoEm
                      ).toLocaleString("pt-BR")}.`
                    : `Preenchido por ${preenchidoPor} em ${new Date(
                        preenchidoEm!
                      ).toLocaleString("pt-BR")} — ainda sem assinatura.`}
                </p>
                <Totais plano={valores} valorEmenda={valorEmenda} />
                {valores.metas.length > 0 ? (
                  <div className="-mx-1 overflow-x-auto px-1">
                    <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
                      <thead>
                        <tr className="text-left text-[10.5px] font-bold uppercase tracking-[1.1px] text-muted-foreground">
                          <th className="px-2 pb-2">Beneficiários</th>
                          <th className="px-2 pb-2">Unidade</th>
                          <th className="px-2 pb-2 text-right">Meta física</th>
                          <th className="px-2 pb-2">Como será comprovada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {valores.metas.map((m, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-2">{m.beneficiarios}</td>
                            <td className="px-2 py-2">{m.unidade}</td>
                            <td className="px-2 py-2 text-right font-semibold tabular-nums">
                              {m.metaFisica}
                            </td>
                            <td className="px-2 py-2">{m.comprovacao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </>
            )}

            {pendencias.length > 0 ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Para a emenda poder ser remetida, falta {pendencias.join("; ")}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ------------------------------------------------------ Modelos I, II e IV -
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plano de trabalho</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <PlanoTrabalhoCampos
          valores={valores}
          onChange={setValores}
          valorEmenda={valorEmenda}
          engenharia={modelo === "OBRAS"}
          desabilitado={!editavel || pending}
        />

        {pendencias.length > 0 ? (
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            O plano é salvo mesmo pela metade. Para a emenda poder ser remetida,
            falta {pendencias.join("; ")}.
          </p>
        ) : null}

        {editavel ? (
          <Button onClick={salvar} disabled={pending}>
            Salvar plano de trabalho
          </Button>
        ) : (
          <p className="text-[12.5px] font-medium text-muted-foreground">
            A emenda já foi remetida — o plano não é mais editável.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
