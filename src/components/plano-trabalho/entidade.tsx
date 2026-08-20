"use client";

import { PlanoTrabalhoForm } from "./form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { salvarPlanoPorToken, type PlanoPorToken } from "@/lib/actions/plano-trabalho";
import { sugerirRedacaoPorToken } from "@/lib/actions/redacao";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// O que a entidade vê. Deliberadamente enxuto: número da emenda, objeto, valor
// e autor — o suficiente para ela saber do que se trata e conferir que o
// pedido é legítimo, sem abrir o resto do processo legislativo.
export function PlanoEntidade({
  token,
  plano,
}: {
  token: string;
  plano: PlanoPorToken;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-.03em]">
          Plano de trabalho
        </h1>
        <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-muted-foreground">
          O gabinete de <b>{plano.autor}</b> apresentou uma emenda ao orçamento
          municipal destinada a{" "}
          <b>{plano.beneficiario ?? "sua entidade"}</b> e precisa que você
          preencha o plano de trabalho abaixo.
        </p>
      </div>

      <PlanoTrabalhoForm
        categoria={plano.categoria}
        valorEmenda={plano.valor}
        exigirResponsavel
        inicial={{
          justificativa: plano.justificativa,
          objetivo: plano.objetivo,
          declaracaoAceita: plano.declaracaoAceita,
          itens: plano.itens,
        }}
        onSalvar={(v, responsavel) => salvarPlanoPorToken(token, responsavel, v)}
        redacao={{
          objeto: plano.objeto,
          beneficiario: plano.beneficiario,
          sugerir: (campo, textoAtual) =>
            sugerirRedacaoPorToken(token, {
              campo,
              objeto: plano.objeto,
              valor: plano.valor,
              beneficiario: plano.beneficiario,
              terceiroSetor: plano.categoria === "TERCEIRO_SETOR",
              textoAtual,
            }),
        }}
        cabecalho={
          <Card>
            <CardHeader>
              <CardTitle className="text-base">A emenda</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-[13px]">
              <div className="flex justify-between gap-4 border-b pb-1.5">
                <span className="text-muted-foreground">Número</span>
                <span className="font-medium">{plano.numero}</span>
              </div>
              <div className="flex justify-between gap-4 border-b pb-1.5">
                <span className="text-muted-foreground">Objeto</span>
                <span className="text-right font-medium">{plano.objeto}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-semibold">{brl(plano.valor)}</span>
              </div>
            </CardContent>
          </Card>
        }
      />

      <p className="rounded-xl bg-secondary p-4 text-[12px] leading-relaxed text-muted-foreground">
        Este endereço é pessoal e temporário. Não o repasse a terceiros: quem o
        tiver consegue alterar este plano de trabalho. Em caso de dúvida, fale
        com o gabinete que o enviou.
      </p>
    </div>
  );
}
