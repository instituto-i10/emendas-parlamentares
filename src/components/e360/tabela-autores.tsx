import { cn } from "@/lib/utils";

export type LinhaAutor = {
  autorId: string;
  nome: string;
  valorSaude: number;
  valorDemais: number;
  valorTotal: number;
};

// Milhares sem "R$" e sem centavos: o cifrão vai uma vez no cabeçalho da
// coluna, e centavo em coluna de comparação é ruído.
const mil = (n: number) => Math.round(n).toLocaleString("pt-BR");
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Cota por autor: barra empilhada + números.
 *
 * A barra diz a PROPORÇÃO (quanto da cota foi usado, e como se divide entre
 * saúde e demais áreas); as colunas dizem o VALOR. Antes a barra mostrava só a
 * parcela de saúde, e para saber o uso da cota era preciso ler um texto ao
 * lado — a informação principal estava no lugar menos legível.
 *
 * Números em `tabular-nums` alinhados à direita: o que se compara aqui é
 * coluna, não linha.
 */
export function TabelaAutores({
  linhas,
  cota,
  limiteDemais,
}: {
  linhas: LinhaAutor[];
  /** Cota por autor. Sem ela não há proporção — a barra usa o maior total. */
  cota: number | null;
  /** Teto das demais áreas (cota − reserva da saúde). */
  limiteDemais: number | null;
}) {
  const base = cota ?? Math.max(...linhas.map((l) => l.valorTotal), 1);
  const pctReserva = cota && limiteDemais != null ? (limiteDemais / cota) * 100 : null;

  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-[11px] font-bold uppercase tracking-[1.1px] text-muted-foreground">
            <th className="px-1 pb-2 text-left font-bold">Autor</th>
            <th className="px-1 pb-2 text-left font-bold">Uso da cota</th>
            <th className="px-1 pb-2 text-right font-bold">Saúde R$</th>
            <th className="px-1 pb-2 text-right font-bold">Demais R$</th>
            <th className="px-1 pb-2 text-right font-bold">Apresentado R$</th>
            <th className="px-1 pb-2 text-right font-bold">% cota</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((a) => {
            const pctSaude = (a.valorSaude / base) * 100;
            const pctDemais = (a.valorDemais / base) * 100;
            const pctTotal = Math.round((a.valorTotal / base) * 100);
            const invade =
              limiteDemais != null && a.valorDemais > limiteDemais + 0.5;
            const acima = cota != null && a.valorTotal > cota + 0.5;

            return (
              <tr key={a.autorId} className="border-b last:border-0">
                <td className="max-w-[190px] truncate px-1 py-2 font-medium" title={a.nome}>
                  {a.nome}
                </td>
                <td className="px-1 py-2">
                  <div
                    className="relative h-2.5 w-full min-w-[120px] overflow-hidden rounded-full bg-secondary"
                    title={`Saúde ${brl(a.valorSaude)} · demais ${brl(a.valorDemais)}`}
                  >
                    <div className="flex h-full w-full">
                      <span
                        className="h-full bg-brand-cyan"
                        style={{ width: `${Math.min(pctSaude, 100)}%` }}
                      />
                      <span
                        className={cn(
                          "h-full",
                          invade
                            ? "bg-[var(--estado-atencao)]"
                            : "bg-[var(--navy-300)]"
                        )}
                        style={{ width: `${Math.min(pctDemais, 100 - Math.min(pctSaude, 100))}%` }}
                      />
                    </div>
                    {/* Marca da reserva: até aqui vão as demais áreas. */}
                    {pctReserva != null ? (
                      <span
                        className="absolute top-0 h-full w-px bg-foreground/45"
                        style={{ left: `${pctReserva}%` }}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                </td>
                <td className="px-1 py-2 text-right tabular-nums">{mil(a.valorSaude)}</td>
                <td
                  className={cn(
                    "px-1 py-2 text-right tabular-nums",
                    invade && "font-semibold text-[var(--on-warn)]"
                  )}
                >
                  {mil(a.valorDemais)}
                </td>
                <td className="px-1 py-2 text-right font-semibold tabular-nums">
                  {mil(a.valorTotal)}
                </td>
                <td
                  className={cn(
                    "px-1 py-2 text-right tabular-nums",
                    acima && "font-semibold text-[var(--on-bad)]"
                  )}
                >
                  {pctTotal}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
