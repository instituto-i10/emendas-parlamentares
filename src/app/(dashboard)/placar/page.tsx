import { getAnoAtivo } from "@/lib/exercicio";
import { getDados360, brl, brlCompacto } from "@/lib/queries-360";
import { ROTULO_TIPO_EMENDA } from "@/lib/rotulos";
import { SecTitle } from "@/components/e360/sec-title";
import { KpiCard } from "@/components/e360/kpi-card";
import { Card360, Eyebrow } from "@/components/e360/card360";
import { MiniBar } from "@/components/e360/minibar";
import { PrintButton } from "@/components/emendas/print-button";

export default async function PlacarPage() {
  const ano = await getAnoAtivo();
  const {
    params,
    consolidado: c,
    porAutor,
    porDestino,
    porTipo,
  } = await getDados360(ano);

  const pctSaude = c.valor > 0 ? Math.round((c.valorSaude / c.valor) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SecTitle
          titulo={`Resumo Consolidado — exercício ${ano ?? "—"}`}
        />
        <div className="mt-7">
          <PrintButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          variante="hi"
          eyebrow="Teto global"
          numero={c.tetoGlobal != null ? brlCompacto(c.tetoGlobal) : "—"}
          rotulo={
            c.tetoGlobal != null
              ? `cota de ${brlCompacto(params.cotaPorAutor!)} × ${c.totalAutores} autores`
              : "defina TETO_VALOR_AUTOR"
          }
        />
        <KpiCard
          eyebrow="Emendas"
          numero={String(c.qtd)}
          rotulo={`${c.autoresComEmenda} autores · ${brlCompacto(c.valor)}`}
        />
        <KpiCard
          eyebrow="Saúde"
          numero={brlCompacto(c.valorSaude)}
          rotulo={`${c.qtdSaude} itens · ${pctSaude}% do total`}
          delta={
            c.limiteDemaisGlobal != null
              ? c.valorDemais <= c.limiteDemaisGlobal + 0.5
                ? { tom: "up", texto: "reserva preservada" }
                : { tom: "warn", texto: "reserva invadida" }
              : undefined
          }
        />
        <KpiCard
          eyebrow="Demais áreas"
          numero={brlCompacto(c.valorDemais)}
          rotulo={`${c.qtdDemais} itens`}
        />
      </div>

      <SecTitle
        titulo="Como o recurso se distribui"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card360>
          <Eyebrow>Por tipo de emenda</Eyebrow>
          {porTipo.map((t) => (
            <MiniBar
              key={t.status}
              rotulo={ROTULO_TIPO_EMENDA[t.status] ?? t.status}
              pct={c.valor > 0 ? (t.valor / c.valor) * 100 : 0}
              valor={`${brl(t.valor)} · ${t.qtd} itens`}
            />
          ))}
        </Card360>
        <Card360>
          <Eyebrow>Maiores destinos por valor</Eyebrow>
          {porDestino.slice(0, 7).map((d) => (
            <MiniBar
              key={d.nome}
              rotulo={d.nome}
              larguraRotulo={210}
              pct={porDestino[0]?.valor > 0 ? (d.valor / porDestino[0].valor) * 100 : 0}
              valor={brl(d.valor)}
            />
          ))}
        </Card360>
      </div>

      <Card360 className="mt-4">
        <Eyebrow>
          Cota × reserva de saúde por autor
          {params.cotaPorAutor != null
            ? ` — cada barra = ${brl(params.cotaPorAutor)}`
            : ""}
        </Eyebrow>
        {porAutor.map((a) => {
          const base = params.cotaPorAutor ?? Math.max(a.valorTotal, 1);
          return (
            <MiniBar
              key={a.autorId}
              rotulo={a.nome}
              pct={(a.valorSaude / base) * 100}
              valor={`Saúde ${brl(a.valorSaude)} · total ${brl(a.valorTotal)}`}
              marcaPct={
                c.pisoSaudeAutor != null && params.cotaPorAutor != null
                  ? (c.pisoSaudeAutor / params.cotaPorAutor) * 100
                  : undefined
              }
              alerta={
                c.limiteDemaisAutor != null &&
                a.valorDemais > c.limiteDemaisAutor + 0.5
              }
            />
          );
        })}
        {/* A marca e a cor da barra só significam algo com a legenda. */}
        {c.pisoSaudeAutor != null || c.limiteDemaisAutor != null ? (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t pt-3 text-[11px] font-medium text-muted-foreground">
            {c.pisoSaudeAutor != null ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-0.5 bg-foreground" aria-hidden />
                reserva da saúde ({brl(c.pisoSaudeAutor)})
              </span>
            ) : null}
            {c.limiteDemaisAutor != null ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-4 rounded-full bg-brand-amber"
                  aria-hidden
                />
                demais áreas acima do limite de {brl(c.limiteDemaisAutor)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <span className="grad-hi h-2 w-4 rounded-full" aria-hidden />
              parcela em saúde
            </span>
          </div>
        ) : null}
      </Card360>
    </div>
  );
}
