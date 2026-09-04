import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { vistaInicial } from "@/config/vistas360";
import { getAnoAtivo } from "@/lib/exercicio";
import { getDados360, brl, brlCompacto } from "@/lib/queries-360";
import { ClipboardCheck, Landmark, ScanSearch, Wallet } from "lucide-react";
import { SecTitle } from "@/components/e360/sec-title";
import { Hero } from "@/components/e360/hero";
import { KpiTile } from "@/components/e360/kpi-tile";
import { Card360, Eyebrow } from "@/components/e360/card360";
import {
  Barras,
  Donut,
  DonutLegenda,
  Gauge,
  Legenda,
  Ring,
} from "@/components/e360/graficos";
import { Farol, type FarolItemDado } from "@/components/e360/farol";
import { Tag360 } from "@/components/e360/tag360";
import { EmptyState } from "@/components/empty-state";
import { AtalhosRapidos } from "@/components/atalhos-rapidos";

export default async function PainelPage() {
  const user = await getCurrentUser();
  // Gabinete do vereador cai direto na sua visão 360.
  // Perfil de gabinete entra pela sua cota, não pelo Painel geral.
  if (vistaInicial(user) !== "/painel") redirect(vistaInicial(user));

  const ano = await getAnoAtivo();
  const { params, emendas, consolidado: c, porAutor, porDestino, porStatus } =
    await getDados360(ano);

  const tituloPainel =
    user.poder === "EXECUTIVO" ? "Painel do Executivo" : "Painel da Comissão";

  if (!ano || emendas.length === 0) {
    return (
      <div>
        <AtalhosRapidos />
        <SecTitle titulo={tituloPainel} />
        <EmptyState
          icon={ClipboardCheck}
          titulo="Sem emendas no exercício"
          acao={
            <Link
              href="/legislativo/emendas/nova"
              className="text-sm font-bold text-accent-foreground hover:underline"
            >
              Apresentar emenda →
            </Link>
          }
        />
      </div>
    );
  }

  // Regra da reserva: apresentar emenda é faculdade do autor — o que não pode
  // é ULTRAPASSAR limites. Demais áreas ficam limitadas a (cota − reserva);
  // a parcela reservada só pode ir para a saúde.
  const reservaInvadidaGlobal =
    c.limiteDemaisGlobal != null && c.valorDemais > c.limiteDemaisGlobal + 0.5;
  const invalidas = porStatus.find((s) => s.status === "INVALIDA");
  const submetidas = porStatus.find((s) => s.status === "SUBMETIDA");
  const acimaDaCota =
    params.cotaPorAutor != null
      ? porAutor.filter((a) => a.valorTotal > params.cotaPorAutor! + 0.5)
      : [];
  const invadiramReserva =
    c.limiteDemaisAutor != null
      ? porAutor.filter((a) => a.valorDemais > c.limiteDemaisAutor! + 0.5)
      : [];

  const farol: FarolItemDado[] = [];
  if (reservaInvadidaGlobal) {
    farol.push({
      tom: "a",
      titulo: "Reserva da saúde invadida",
      texto: `demais áreas ${brlCompacto(c.valorDemais)} × limite ${brlCompacto(c.limiteDemaisGlobal!)}`,
      fix: "Reclassificar ou reduzir emendas de outras áreas",
      href: "/emendas?aba=conformidade",
    });
  }
  if (invadiramReserva.length > 0) {
    farol.push({
      tom: "a",
      titulo: `${invadiramReserva.length} autor(es) usando a reserva da saúde em outras áreas`,
      texto:
        invadiramReserva.map((a) => a.nome).slice(0, 4).join(", ") +
        (invadiramReserva.length > 4 ? "…" : ""),
      fix: `Limite por autor: ${brl(c.limiteDemaisAutor!)}`,
      href: "/emendas",
    });
  }
  if (invalidas) {
    farol.push({
      tom: "a",
      titulo: `${invalidas.qtd} emenda(s) inválida(s) para saneamento`,
      texto: `${brlCompacto(invalidas.valor)} reprovadas pelo motor`,
      fix: "Devolver ao autor para correção",
      href: "/analise",
    });
  }
  if (submetidas) {
    farol.push({
      tom: "a",
      titulo: `${submetidas.qtd} emenda(s) aguardando parecer`,
      texto: `${brlCompacto(submetidas.valor)} submetidas`,
      fix: "Emitir parecer na análise técnica",
      href: "/analise",
    });
  }
  if (params.cotaPorAutor != null) {
    farol.push(
      acimaDaCota.length === 0
        ? {
            tom: "g",
            titulo: "Cota individual respeitada",
            texto: `${c.autoresComEmenda}/${c.totalAutores} autores dentro de ${brlCompacto(params.cotaPorAutor)}`,
            href: "/emendas",
          }
        : {
            tom: "r",
            titulo: `${acimaDaCota.length} autor(es) com apresentado acima da cota`,
            texto: acimaDaCota.map((a) => a.nome).join(", "),
            // O somatório inclui emenda inválida e rejeitada; a pré-checagem
            // não conta essas na cota. Dizer isso evita duas contas para o
            // mesmo autor entre esta tela e o relatório da emenda.
            fix: `Cota: ${brl(params.cotaPorAutor)} por autor · a soma inclui o que está inválido ou rejeitado, que não consome cota`,
            href: "/emendas",
          }
    );
  }
  if (c.tetoGlobal != null) {
    farol.push(
      c.valor <= c.tetoGlobal + 0.5
        ? {
            tom: "g",
            titulo: "Teto global respeitado",
            texto: `${brlCompacto(c.valor)} de ${brlCompacto(c.tetoGlobal)}`,
            href: "/placar",
          }
        : {
            tom: "r",
            titulo: "Teto global ultrapassado",
            texto: `${brlCompacto(c.valor)} × teto ${brlCompacto(c.tetoGlobal)}`,
            href: "/placar",
          }
    );
  }
  if (!reservaInvadidaGlobal && c.pisoSaudeGlobal != null) {
    farol.push({
      tom: "g",
      titulo: "Reserva da saúde preservada",
      texto: `${brlCompacto(c.pisoSaudeGlobal)} reservados à saúde`,
      href: "/placar",
    });
  }

  const emAnalise = (invalidas?.qtd ?? 0) + (submetidas?.qtd ?? 0);
  const pctTeto =
    c.tetoGlobal != null && c.tetoGlobal > 0
      ? Math.round((c.valor / c.tetoGlobal) * 100)
      : 0;

  const fatiasArea = [
    { rotulo: "Saúde", valor: c.valorSaude, cor: "#00b4d8" },
    { rotulo: "Demais áreas", valor: c.valorDemais, cor: "#0a2463" },
  ];

  const colunasDestino = porDestino.slice(0, 6).map((d) => ({
    rotulo: d.nome.split(" ").slice(0, 2).join(" "),
    segmentos: [
      { valor: d.valorSaude, cor: "#00b4d8" },
      { valor: Math.max(0, d.valor - d.valorSaude), cor: "#c3cee4" },
    ],
  }));

  // De onde sai o teto: RCL × percentual impositivo. São parâmetros do
  // exercício e o painel é o único lugar da interface que os mostra.
  const baseDoCalculo = [
    params.rcl != null
      ? { rotulo: "RCL (base de cálculo)", valor: brlCompacto(params.rcl) }
      : null,
    params.percentualImpositivo != null
      ? {
          rotulo: "Percentual impositivo",
          valor: `${params.percentualImpositivo.toLocaleString("pt-BR")}%`,
        }
      : null,
    params.reservaSaudePct != null
      ? {
          rotulo: "Reserva da saúde",
          valor: `${params.reservaSaudePct}% da cota`,
        }
      : null,
  ].filter((x) => x !== null);

  const fechar = [
    invalidas
      ? {
          n: "1",
          t: `Sanear ${invalidas.qtd} emenda(s)`,
          s: "reprovadas pelo motor",
          href: "/analise",
        }
      : null,
    submetidas
      ? {
          n: "2",
          t: `Dar parecer em ${submetidas.qtd} emenda(s)`,
          s: "aguardando decisão",
          href: "/analise",
        }
      : null,
    {
      n: "3",
      t: "Conferir os destinos mais indicados",
      s: porDestino.slice(0, 3).map((d) => d.nome).join(", "),
      href: "/emendas?aba=destino",
    },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <AtalhosRapidos />
      {/* Abertura no padrão `.hero` da referência: saudação + tiles */}
      <Hero
        data={`Exercício ${ano}`}
        titulo={tituloPainel}
        sub={
          <Link
            href="/tramitacao"
            className="underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white"
          >
            {c.qtd} emendas apresentadas por {c.autoresComEmenda} autor(es) →
          </Link>
        }
      >
        <KpiTile
          icon={Landmark}
          valor={c.tetoGlobal != null ? brlCompacto(c.tetoGlobal) : "—"}
          rotulo="Teto impositivo"
          href="/placar"
        />
        <KpiTile
          icon={Wallet}
          tom="cyan"
          valor={
            params.cotaPorAutor != null ? brlCompacto(params.cotaPorAutor) : "—"
          }
          rotulo="Cota por autor"
        />
        <KpiTile
          icon={ScanSearch}
          tom={emAnalise > 0 ? "amber" : "mint"}
          valor={String(emAnalise)}
          rotulo="Em análise"
          href="/analise"
        />
      </Hero>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card360>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-[15.5px] font-bold tracking-[-.015em]">
              Farol da conferência
            </h3>
            <span className="text-[11.5px] font-semibold text-muted-foreground">
              {c.qtd} emendas · {brlCompacto(c.valor)}
            </span>
          </div>
          <Farol itens={farol} />
        </Card360>

        <div className="flex min-w-0 flex-col gap-4">
          <Card360>
            <Eyebrow>Uso do teto</Eyebrow>
            <Gauge
              pct={pctTeto}
              valor={`${pctTeto}%`}
              rotulo="do teto impositivo"
              sub={
                c.tetoGlobal != null
                  ? `${brlCompacto(c.valor)} de ${brlCompacto(c.tetoGlobal)}`
                  : undefined
              }
              alerta={pctTeto > 100}
            />
            <dl className="mt-1 flex flex-col gap-2 border-t pt-3.5">
              {baseDoCalculo.map(({ rotulo, valor }) => (
                  <div key={rotulo} className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11.5px] font-medium text-muted-foreground">
                      {rotulo}
                    </dt>
                    <dd className="text-[12.5px] font-bold tabular-nums">
                      {valor}
                    </dd>
                  </div>
                ))}
            </dl>
          </Card360>

          <Card360 variante="dark">
            <Eyebrow escuro>O que precisa fechar</Eyebrow>
            <div className="flex flex-col gap-2">
              {fechar.map((a) => (
                <Link
                  key={a!.n}
                  href={a!.href}
                  className="flex items-center gap-3 rounded-[10px] bg-white/10 px-3 py-2.5 transition-colors hover:bg-white/15"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-cyan text-xs font-extrabold text-white">
                    {a!.n}
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[13px] text-white">{a!.t}</b>
                    <span className="block truncate text-[11.5px] text-white/60">
                      {a!.s}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </Card360>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* rosca: composição saúde × demais áreas */}
        <Card360>
          <Eyebrow>Distribuição por área</Eyebrow>
          <Donut
            fatias={fatiasArea}
            centroValor={brlCompacto(c.valor)}
            centroRotulo={`${c.qtd} emendas`}
          />
          <DonutLegenda fatias={fatiasArea} formatar={brlCompacto} />
        </Card360>

        {/* barras empilhadas: destinos mais indicados */}
        <Card360>
          <div className="flex items-baseline justify-between gap-3">
            <Eyebrow className="mb-0">Destinos mais indicados</Eyebrow>
            <Link
              href="/emendas?aba=destino"
              className="text-[11.5px] font-semibold text-muted-foreground hover:text-accent-foreground"
            >
              ver todos →
            </Link>
          </div>
          <Legenda
            itens={[
              { rotulo: "Saúde", cor: "#00b4d8" },
              { rotulo: "Demais áreas", cor: "#c3cee4" },
            ]}
          />
          <Barras colunas={colunasDestino} />
        </Card360>
      </div>

      <SecTitle titulo="Emendas por autor" />
      <Card360>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                {["Autor", "Itens", "Saúde", "Demais", "Total", "Cota", "Situação"].map(
                  (h) => (
                    <th
                      key={h}
                      className="bg-secondary px-2.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground first:rounded-l-[9px] last:rounded-r-[9px]"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {porAutor.map((a) => {
                const reservaOk =
                  c.limiteDemaisAutor == null ||
                  a.valorDemais <= c.limiteDemaisAutor + 0.5;
                const cotaOk =
                  params.cotaPorAutor == null ||
                  a.valorTotal <= params.cotaPorAutor + 0.5;
                const pctCota =
                  params.cotaPorAutor != null && params.cotaPorAutor > 0
                    ? (a.valorTotal / params.cotaPorAutor) * 100
                    : 0;
                return (
                  <tr key={a.autorId}>
                    <td className="border-b border-border px-2.5 py-2.5 font-bold">
                      <Link
                        href={`/vereador360?autor=${a.autorId}`}
                        className="hover:text-accent-foreground hover:underline"
                      >
                        {a.nome}
                      </Link>
                    </td>
                    <td className="border-b border-border px-2.5 py-2.5 text-muted-foreground">
                      {a.itens}
                    </td>
                    <td className="border-b border-border px-2.5 py-2.5 tabular-nums">
                      {brl(a.valorSaude)}
                    </td>
                    <td className="border-b border-border px-2.5 py-2.5 tabular-nums">
                      {brl(a.valorDemais)}
                    </td>
                    <td className="border-b border-border px-2.5 py-2.5 font-semibold tabular-nums">
                      {brl(a.valorTotal)}
                    </td>
                    <td className="border-b border-border px-2.5 py-1.5">
                      <Ring
                        pct={pctCota}
                        tom={!cotaOk ? "bad" : !reservaOk ? "amber" : "cyan"}
                      />
                    </td>
                    <td className="border-b border-border px-2.5 py-2.5">
                      {!cotaOk ? (
                        <Tag360 tom="bad">acima da cota</Tag360>
                      ) : !reservaOk ? (
                        <Tag360 tom="warn">reserva invadida</Tag360>
                      ) : (
                        <Tag360 tom="ok">conforme</Tag360>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card360>
    </div>
  );
}
