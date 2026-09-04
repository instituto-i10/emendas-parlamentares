import { getAnoAtivo } from "@/lib/exercicio";
import { getDados360, brlCompacto } from "@/lib/queries-360";
import { ROTULO_TIPO_EMENDA } from "@/lib/rotulos";
import { SecTitle } from "@/components/e360/sec-title";
import { KpiCard } from "@/components/e360/kpi-card";
import { Card360, Eyebrow } from "@/components/e360/card360";
import { MiniBar } from "@/components/e360/minibar";
import { TabelaAutores } from "@/components/e360/tabela-autores";
import { PrintButton } from "@/components/emendas/print-button";
import { SemEmendasNoExercicio } from "@/components/sem-emendas";

export default async function PlacarPage() {
  const ano = await getAnoAtivo();
  const {
    params,
    consolidado: c,
    porAutor,
    porDestino,
    porTipo,
  } = await getDados360(ano);

  // Exercício sem emenda nenhuma: o consolidado seria um teto de milhões ao
  // lado de R$ 0,00 e dois gráficos vazios — parece defeito, não começo de
  // ciclo.
  if (c.qtd === 0) {
    return (
      <div>
        <SecTitle titulo={`Resumo Consolidado — exercício ${ano ?? ""}`} />
        <SemEmendasNoExercicio ano={ano} />
      </div>
    );
  }

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
              valor={`${brlCompacto(t.valor)} · ${t.qtd}`}
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
              valor={brlCompacto(d.valor)}
            />
          ))}
        </Card360>
      </div>

      <Card360 className="mt-4">
        <Eyebrow>
          Cota × reserva de saúde por autor
          {params.cotaPorAutor != null
            ? ` — cota de ${brlCompacto(params.cotaPorAutor)}`
            : ""}
        </Eyebrow>
        {/* Sem legenda de rodapé: a barra empilhada e os cabeçalhos das colunas
            já dizem o que cada faixa é. A legenda existia para explicar uma
            barra que mostrava só a saúde. */}
        <TabelaAutores
          linhas={porAutor}
          cota={params.cotaPorAutor}
          limiteDemais={c.limiteDemaisAutor}
        />
      </Card360>
    </div>
  );
}
