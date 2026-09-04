import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/session";
import { podeVerTodasEmendas } from "@/lib/authz";
import { getAnoAtivo } from "@/lib/exercicio";
import {
  getDados360,
  listarAutores,
  ehSaude,
  brl,
  brlCompacto,
} from "@/lib/queries-360";
import { ROTULO_STATUS_EMENDA } from "@/lib/rotulos";
import { SecTitle } from "@/components/e360/sec-title";
import { KpiCard } from "@/components/e360/kpi-card";
import { Card360, Eyebrow } from "@/components/e360/card360";
import { Farol, type FarolItemDado } from "@/components/e360/farol";
import { Tag360, tomDoStatus } from "@/components/e360/tag360";
import { Avatar360 } from "@/components/e360/avatar";
import { Ring } from "@/components/e360/graficos";
import { EmptyState } from "@/components/empty-state";
import { AtalhosRapidos } from "@/components/atalhos-rapidos";

export default async function Vereador360Page({
  searchParams,
}: {
  searchParams: Promise<{ autor?: string; q?: string }>;
}) {
  const { autor: autorParam, q } = await searchParams;
  const user = await getCurrentUser();
  const ano = await getAnoAtivo();
  const [{ params, emendas, consolidado: c, porAutor }, autores] =
    await Promise.all([getDados360(ano), listarAutores()]);

  // O gabinete vê sempre a própria cota; quem gere/tramita escolhe na lista.
  const autorProprio = autores.find((a) => a.usuarioId === user.id);
  const travadoNoProprio = !podeVerTodasEmendas(user) && !!autorProprio;
  const selecionado = travadoNoProprio
    ? autorProprio
    : (autores.find((a) => a.id === autorParam) ??
      autores.find((a) => porAutor.some((r) => r.autorId === a.id)) ??
      autores[0]);

  if (!selecionado) {
    return (
      <div>
        <AtalhosRapidos />
        <SecTitle titulo="Vereador 360" />
        <EmptyState titulo="Nenhum autor cadastrado" />
      </div>
    );
  }

  const resumo = porAutor.find((r) => r.autorId === selecionado.id);
  const itens = emendas.filter((e) => e.autorId === selecionado.id);
  const cotaOk =
    params.cotaPorAutor == null ||
    (resumo?.valorTotal ?? 0) <= params.cotaPorAutor + 0.5;
  // Apresentar emenda é faculdade — a regra é limite: demais áreas até
  // (cota − reserva); a parcela reservada só pode ir para a saúde.
  const reservaOk =
    c.limiteDemaisAutor == null ||
    (resumo?.valorDemais ?? 0) <= c.limiteDemaisAutor + 0.5;
  const pctCota =
    params.cotaPorAutor != null && params.cotaPorAutor > 0
      ? ((resumo?.valorTotal ?? 0) / params.cotaPorAutor) * 100
      : 0;

  const farol: FarolItemDado[] = [
    params.cotaPorAutor != null
      ? {
          tom: cotaOk ? "g" : "r",
          titulo: cotaOk
            ? "Apresentado dentro da cota"
            : "Apresentado acima da cota",
          texto: `${brl(resumo?.valorTotal ?? 0)} apresentados de ${brl(params.cotaPorAutor)}`,
          fix: cotaOk ? undefined : "Soma tudo o que o autor apresentou, inclusive o que está inválido ou rejeitado — que não consome cota na pré-checagem.",
        }
      : {
          tom: "a" as const,
          titulo: "Cota não configurada",
          texto: "defina TETO_VALOR_AUTOR nas Configurações",
        },
    c.limiteDemaisAutor != null
      ? {
          tom: reservaOk ? "g" : "a",
          titulo: reservaOk
            ? "Reserva da saúde preservada"
            : "Reserva da saúde invadida",
          texto: `demais áreas ${brl(resumo?.valorDemais ?? 0)} · limite ${brl(c.limiteDemaisAutor)}`,
        }
      : {
          tom: "g" as const,
          titulo: "Saúde do autor",
          texto: `${brl(resumo?.valorSaude ?? 0)} em ${resumo?.itensSaude ?? 0} item(ns)`,
        },
    {
      tom: "g",
      titulo: "Itens apresentados",
      texto: `${itens.length} emenda(s) no exercício ${ano ?? "—"}`,
    },
  ];

  // Lista lateral: filtro server-side, sem estado no cliente.
  const busca = (q ?? "").trim().toLowerCase();
  const lista = autores
    .map((a) => {
      const r = porAutor.find((x) => x.autorId === a.id);
      const pct =
        params.cotaPorAutor != null && params.cotaPorAutor > 0
          ? ((r?.valorTotal ?? 0) / params.cotaPorAutor) * 100
          : 0;
      const acima =
        params.cotaPorAutor != null &&
        (r?.valorTotal ?? 0) > params.cotaPorAutor + 0.5;
      const invadiu =
        c.limiteDemaisAutor != null &&
        (r?.valorDemais ?? 0) > c.limiteDemaisAutor + 0.5;
      return { autor: a, resumo: r, pct, acima, invadiu };
    })
    .filter((x) => !busca || x.autor.nome.toLowerCase().includes(busca));

  const alertas = lista.filter((x) => x.acima || x.invadiu).length;

  return (
    <div>
      <AtalhosRapidos />
      <SecTitle titulo="Vereador 360" />

      <div
        className={cn(
          "grid gap-4",
          !travadoNoProprio && "lg:grid-cols-[288px_minmax(0,1fr)]"
        )}
      >
        {/* ------------------------------------------------ lista de autores */}
        {!travadoNoProprio ? (
          <aside className="lg:sticky lg:top-[88px] lg:self-start">
            <div className="flex max-h-[calc(100vh-120px)] flex-col overflow-hidden rounded-xl bg-card shadow-card">
              <div className="border-b p-3.5">
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-bold">
                    Vereadores
                    <span className="ml-1.5 font-semibold text-muted-foreground">
                      {autores.length}
                    </span>
                  </span>
                  {alertas > 0 ? (
                    <Tag360 tom="warn">{alertas} com alerta</Tag360>
                  ) : null}
                </div>
                <form action="/vereador360" className="relative">
                  {autorParam ? (
                    <input type="hidden" name="autor" value={autorParam} />
                  ) : null}
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder="Buscar vereador"
                    aria-label="Buscar vereador"
                    className="h-9 w-full rounded-[10px] bg-secondary pl-9 pr-3 text-[12.5px] font-medium outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
                  />
                </form>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {lista.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[12.5px] font-medium text-muted-foreground">
                    Nenhum vereador encontrado.
                  </p>
                ) : (
                  lista.map(({ autor: a, resumo: r, pct, acima, invadiu }) => {
                    const ativo = a.id === selecionado.id;
                    return (
                      <Link
                        key={a.id}
                        href={`/vereador360?autor=${a.id}`}
                        aria-current={ativo ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 transition-colors",
                          ativo ? "bg-accent" : "hover:bg-secondary"
                        )}
                      >
                        <Avatar360 nome={a.nome} tamanho="sm" />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-[12.5px] font-bold",
                              ativo && "text-accent-foreground"
                            )}
                          >
                            {a.nome}
                          </span>
                          <span className="block truncate text-[10.5px] font-medium text-muted-foreground">
                            {r
                              ? `${r.itens} itens · ${brlCompacto(r.valorTotal)}`
                              : "sem emendas"}
                          </span>
                        </span>
                        {r ? (
                          <Ring
                            pct={pct}
                            tamanho={28}
                            tom={acima ? "bad" : invadiu ? "amber" : "cyan"}
                          />
                        ) : null}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        ) : null}

        {/* --------------------------------------------------------- detalhe */}
        <div className="min-w-0">
          <div className="mb-4 flex min-w-0 flex-wrap items-center gap-4 rounded-xl bg-card p-[22px] shadow-card">
            <Avatar360 nome={selecionado.nome} tamanho="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[19px] font-extrabold tracking-[-.025em]">
                {selecionado.nome}
              </h2>
              <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">
                {itens.length} itens no exercício {ano ?? "—"}
                {params.cotaPorAutor != null
                  ? ` · cota ${brl(params.cotaPorAutor)}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!cotaOk ? (
                <Tag360 tom="bad">acima da cota</Tag360>
              ) : !reservaOk ? (
                <Tag360 tom="warn">reserva invadida</Tag360>
              ) : (
                <Tag360 tom="ok">conforme</Tag360>
              )}
              {params.cotaPorAutor != null ? (
                <Ring
                  pct={pctCota}
                  tamanho={44}
                  tom={!cotaOk ? "bad" : !reservaOk ? "amber" : "cyan"}
                />
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              eyebrow="Apresentado"
              numero={brlCompacto(resumo?.valorTotal ?? 0)}
              rotulo={
                params.cotaPorAutor != null
                  ? `de ${brl(params.cotaPorAutor)} disponíveis`
                  : "total das emendas do autor"
              }
              delta={
                params.cotaPorAutor != null
                  ? cotaOk
                    ? { tom: "up", texto: `${Math.round(pctCota)}% da cota` }
                    : { tom: "down", texto: "cota ultrapassada" }
                  : undefined
              }
            />
            <KpiCard
              eyebrow="Itens"
              numero={String(itens.length)}
              rotulo="indicações apresentadas"
            />
            <KpiCard
              eyebrow="Saúde"
              numero={brlCompacto(resumo?.valorSaude ?? 0)}
              rotulo={`${resumo?.itensSaude ?? 0} item(ns) · função ${params.funcaoSaudeCodigo}`}
              delta={
                c.pisoSaudeAutor != null
                  ? {
                      tom: "neutral",
                      texto: `reserva ${brlCompacto(c.pisoSaudeAutor)}`,
                    }
                  : undefined
              }
            />
            <KpiCard
              eyebrow="Demais áreas"
              numero={brlCompacto(resumo?.valorDemais ?? 0)}
              rotulo={`${(resumo?.itens ?? 0) - (resumo?.itensSaude ?? 0)} item(ns)`}
              delta={
                c.limiteDemaisAutor != null
                  ? reservaOk
                    ? { tom: "up", texto: "dentro do limite" }
                    : { tom: "warn", texto: "acima do limite" }
                  : undefined
              }
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
            <Card360>
              <Eyebrow>Itens da cota</Eyebrow>
              {itens.length === 0 ? (
                <EmptyState
                  titulo="Nenhuma emenda deste autor no exercício"
                  acao={
                    travadoNoProprio ? (
                      <Link
                        href="/legislativo/emendas/nova"
                        className="text-sm font-bold text-accent-foreground hover:underline"
                      >
                        Apresentar emenda →
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <div className="min-w-0 overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
                    <thead>
                      <tr>
                        {["Área", "Objeto / destino", "Situação", "Valor"].map(
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
                      {itens.map((e) => (
                        <tr key={e.id}>
                          <td className="border-b border-border px-2.5 py-2.5">
                            <Tag360 tom={ehSaude(e, params) ? "ok" : "pend"}>
                              {ehSaude(e, params) ? "Saúde" : e.funcaoNome}
                            </Tag360>
                          </td>
                          <td className="border-b border-border px-2.5 py-2.5">
                            <Link
                              href={`/legislativo/emendas/${e.id}`}
                              className="font-semibold hover:text-accent-foreground hover:underline"
                            >
                              {e.objeto}
                            </Link>
                            <span className="block text-[11px] font-medium text-muted-foreground">
                              {e.orgaoNome} · {e.unidadeNome}
                            </span>
                          </td>
                          <td className="border-b border-border px-2.5 py-2.5">
                            <Tag360 tom={tomDoStatus(e.status)}>
                              {ROTULO_STATUS_EMENDA[e.status] ?? e.status}
                            </Tag360>
                          </td>
                          <td className="border-b border-border px-2.5 py-2.5 font-semibold tabular-nums">
                            {brl(e.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card360>

            <Card360>
              <Eyebrow>Farol do autor</Eyebrow>
              <Farol itens={farol} />
            </Card360>
          </div>
        </div>
      </div>
    </div>
  );
}
