import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ItemValidacao, ResultadoMotor } from "@/lib/validation/motor";

// Verde/âmbar/vermelho nos tokens --on-*: convenção de sempre, tonalidade
// profunda.
function Icone({ status }: { status: ItemValidacao["status"] }) {
  if (status === "OK")
    return <CheckCircle2 className="size-4 text-[var(--on-ok)]" aria-hidden />;
  if (status === "ALERTA")
    return <AlertTriangle className="size-4 text-[var(--on-warn)]" aria-hidden />;
  return <XCircle className="size-4 text-[var(--on-bad)]" aria-hidden />;
}

// Relatório item a item da pré-checagem.
//
// O rótulo é deliberadamente "pré-checagem", e não "validação": a ferramenta
// confere as condições de validade e auxilia na análise da documentação — não
// atesta a legalidade da emenda nem substitui o parecer. Posição do jurídico do
// cliente, que vale para toda a linguagem do produto.
export function RelatorioValidacao({ relatorio }: { relatorio: ResultadoMotor }) {
  const semPendencia = relatorio.resultado === "VALIDA";
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Pré-checagem:</span>
        <Badge variant={semPendencia ? "default" : "destructive"}>
          {semPendencia ? "sem pendências" : "com pendências"}
        </Badge>
      </div>
      <ul className="space-y-2">
        {relatorio.itens.map((it) => (
          <li key={it.codigo} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5">
              <Icone status={it.status} />
            </span>
            <div>
              <p className="font-medium">{it.descricao}</p>
              <p className="text-muted-foreground">{it.detalhe}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t pt-2.5 text-[11.5px] font-medium leading-relaxed text-muted-foreground">
        Conferência automática das condições de validade. Não substitui a
        análise técnica nem o parecer jurídico — o mérito e a assinatura são do
        parlamentar.
      </p>
    </div>
  );
}
