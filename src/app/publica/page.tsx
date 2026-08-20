import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  FileCheck2,
  HeartPulse,
  Search,
  ShieldCheck,
  Vote,
} from "lucide-react";
import { getAnoAtivo } from "@/lib/exercicio";
import { getDados360, brl, brlCompacto } from "@/lib/queries-360";
import { LogoEmendas360 } from "@/components/logo-emendas360";
import { IlustracaoOrcamento } from "@/components/e360/ilustracoes";
import { Donut, DonutLegenda } from "@/components/e360/graficos";

// Porta de entrada do sistema e portal do cidadão: a raiz (`/`) manda para cá.
// Só agregados, nenhum dado pessoal, sem login — transparência ativa (ADPF 854,
// art. 163-A da CF, Comunicado SDG 28/2025 do TCE-SP).
export default async function PublicaPage() {
  const ano = await getAnoAtivo();
  const { params, consolidado: c, porDestino } = await getDados360(ano);

  const pctSaude = c.valor > 0 ? Math.round((c.valorSaude / c.valor) * 100) : 0;
  const fatias = [
    { rotulo: "Saúde", valor: c.valorSaude, cor: "#00b4d8" },
    { rotulo: "Demais áreas", valor: c.valorDemais, cor: "#0a2463" },
  ];

  const passos = [
    {
      icon: Vote,
      titulo: "O vereador indica",
      texto: `cada um destina até ${params.cotaPorAutor != null ? brlCompacto(params.cotaPorAutor) : "uma cota"} a áreas e órgãos do município`,
    },
    {
      icon: FileCheck2,
      titulo: "A Câmara confere e aprova",
      texto: "a comissão analisa e o Plenário vota junto com o orçamento",
    },
    {
      icon: ShieldCheck,
      titulo: "A Prefeitura executa",
      texto: "por isso “impositiva” — a execução acompanha o exercício",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ---------------------------------------------------------- topo --- */}
      <header className="grad-dark sticky top-0 z-40 text-white">
        <div className="mx-auto flex h-16 min-w-0 max-w-[1240px] items-center gap-3 px-4 sm:gap-6 sm:px-5">
          <Link href="/publica" className="min-w-0 shrink">
            <LogoEmendas360 />
          </Link>
          <nav className="ml-auto hidden items-center gap-7 md:flex">
            <Link
              href="/publica/emendas"
              className="text-[13px] font-semibold text-white/70 transition-colors hover:text-white"
            >
              Consultar emendas
            </Link>
            <Link
              href="/publica/manual"
              className="text-[13px] font-semibold text-white/70 transition-colors hover:text-white"
            >
              Manual
            </Link>
          </nav>
          <Link
            href="/login"
            className="ml-auto shrink-0 whitespace-nowrap rounded-[10px] bg-white/10 px-3 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-white/20 sm:px-4 md:ml-0"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ------------------------------------------------------- hero --- */}
        <section className="grad-dark relative overflow-hidden text-white">
          <div
            className="pointer-events-none absolute -right-40 top-1/2 size-[520px] -translate-y-1/2 rounded-full bg-brand-cyan/15 blur-3xl"
            aria-hidden
          />
          <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pb-20 lg:pt-16">
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.4px] text-brand-mint">
                Exercício {ano ?? "—"} · orçamento impositivo
              </span>
              <h1 className="mt-5 text-[38px] font-extrabold leading-[1.08] tracking-[-.035em] lg:text-[46px]">
                Para onde vai o dinheiro que os vereadores destinam
              </h1>
              <p className="mt-4 max-w-[520px] text-[15px] font-medium leading-relaxed text-white/70">
                Cada vereador indica uma parte do orçamento do município. Aqui
                você vê quanto é, para onde foi e em que situação está — em
                linguagem simples e com os valores reais.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/publica/emendas"
                  className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-[13px] font-bold text-primary transition-colors hover:bg-white/90"
                >
                  <Search className="size-4" aria-hidden />
                  Consultar as emendas
                </Link>
                <Link
                  href="/publica/manual"
                  className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-white/10 px-5 text-[13px] font-bold text-white transition-colors hover:bg-white/20"
                >
                  <BookOpen className="size-4" aria-hidden />
                  Como funcionam
                </Link>
              </div>
            </div>
            <div className="relative">
              <IlustracaoOrcamento />
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- números --- */}
        <section className="relative z-10 mx-auto -mt-9 max-w-[1240px] px-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Building2,
                valor: brlCompacto(c.valor),
                rotulo: "destinados no exercício",
                nota: `${c.qtd} emendas de ${c.autoresComEmenda} vereadores`,
              },
              {
                icon: HeartPulse,
                valor: brlCompacto(c.valorSaude),
                rotulo: "para a saúde",
                nota: `${c.qtdSaude} emendas · ${pctSaude}% do total`,
              },
              {
                icon: Vote,
                valor:
                  params.cotaPorAutor != null
                    ? brlCompacto(params.cotaPorAutor)
                    : "—",
                rotulo: "é a cota de cada vereador",
                nota: `${c.totalAutores} vereadores no exercício`,
              },
            ].map((k) => (
              <div key={k.rotulo} className="rounded-xl bg-card p-5 shadow-card">
                <span className="grad-main grid size-10 place-items-center rounded-[11px] text-white">
                  <k.icon className="size-5" aria-hidden />
                </span>
                <div className="kpi-num mt-4">{k.valor}</div>
                <div className="text-[13px] font-bold">{k.rotulo}</div>
                <div className="mt-1 text-[11.5px] font-medium text-muted-foreground">
                  {k.nota}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------- como funciona --- */}
        <section className="mx-auto max-w-[1240px] px-5 pt-16">
          <h2 className="text-[24px] font-extrabold tracking-[-.03em]">
            Como funciona a emenda impositiva
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {passos.map((p, i) => (
              <div key={p.titulo} className="rounded-xl bg-card p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-[11px] bg-accent text-accent-foreground">
                    <p.icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    Passo {i + 1}
                  </span>
                </div>
                <h3 className="mt-3.5 text-[15px] font-bold tracking-[-.015em]">
                  {p.titulo}
                </h3>
                <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
                  {p.texto}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ para onde vai --- */}
        <section className="mx-auto max-w-[1240px] px-5 pt-14">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
            <div className="min-w-0 rounded-xl bg-card p-[22px] shadow-card">
              <h2 className="text-[15.5px] font-bold tracking-[-.015em]">
                Saúde × demais áreas
              </h2>
              <Donut
                fatias={fatias}
                centroValor={brlCompacto(c.valor)}
                centroRotulo={`${c.qtd} emendas`}
              />
              <DonutLegenda fatias={fatias} formatar={brlCompacto} />
            </div>

            <div className="min-w-0 rounded-xl bg-card p-[22px] shadow-card">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <h2 className="text-[15.5px] font-bold tracking-[-.015em]">
                  Para onde vai o dinheiro
                </h2>
                <Link
                  href="/publica/emendas"
                  className="text-[11.5px] font-semibold text-accent-foreground hover:underline"
                >
                  ver todas →
                </Link>
              </div>
              {porDestino.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {porDestino.slice(0, 6).map((d) => {
                    const pct =
                      porDestino[0].valor > 0
                        ? (d.valor / porDestino[0].valor) * 100
                        : 0;
                    return (
                      <li key={d.nome} className="py-1.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[12.5px] font-bold">
                            {d.nome}
                          </span>
                          <span className="shrink-0 text-[12px] font-semibold tabular-nums">
                            {brl(d.valor)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2.5">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                            <i
                              className="block h-full rounded-full bg-brand-cyan"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-20 shrink-0 text-right text-[10.5px] font-medium text-muted-foreground">
                            {d.itens} emendas
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-[12.5px] font-medium text-muted-foreground">
                  As emendas do exercício ainda não foram apresentadas.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- chamada --- */}
        <section className="mx-auto max-w-[1240px] px-5 py-16">
          <div className="grad-main relative overflow-hidden rounded-2xl px-8 py-10 text-white lg:px-12">
            <div
              className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10"
              aria-hidden
            />
            <div className="relative max-w-[640px]">
              <h2 className="text-[26px] font-extrabold tracking-[-.03em]">
                Consulte emenda por emenda
              </h2>
              <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-white/75">
                Busque por objeto, beneficiário ou autor e veja valor, situação e
                para onde o recurso foi destinado. Sem cadastro, sem login.
              </p>
              <Link
                href="/publica/emendas"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-5 text-[13px] font-bold text-primary transition-colors hover:bg-white/90"
              >
                Abrir a consulta pública
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 py-7 text-[11.5px] font-medium text-muted-foreground">
          <span>
            <b className="font-extrabold text-primary">Emendas360</b> ·
            transparência das emendas parlamentares
          </span>
          <span>Valores agregados do exercício ativo · sem dados pessoais.</span>
        </div>
      </footer>
    </div>
  );
}
