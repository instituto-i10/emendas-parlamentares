import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileInput,
  FilePlus2,
  Gavel,
  Landmark,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { getAnoAtivo } from "@/lib/exercicio";
import { getDados360, brl, brlCompacto } from "@/lib/queries-360";
import { getInstrumentoBaseAberto } from "@/lib/queries-orcamento";
import { ROTULO_STATUS_EMENDA, ROTULO_TIPO_INSTRUMENTO } from "@/lib/rotulos";
import { SecTitle } from "@/components/e360/sec-title";
import { Card360, Eyebrow } from "@/components/e360/card360";
import { Stepper, type Etapa } from "@/components/e360/stepper";
import { Tag360, tomDoStatus } from "@/components/e360/tag360";
import { Avatar360 } from "@/components/e360/avatar";
import { cn } from "@/lib/utils";
import { SemEmendasNoExercicio } from "@/components/sem-emendas";

export default async function TramitacaoPage() {
  const ano = await getAnoAtivo();
  const [{ consolidado: c, porStatus, emendas }, base] = await Promise.all([
    getDados360(ano),
    getInstrumentoBaseAberto(ano),
  ]);

  // O funil das seis etapas com zero em todas não informa nada — e o stepper
  // ainda desenha as duas primeiras como concluídas, sugerindo andamento.
  if (c.qtd === 0) {
    return (
      <div>
        <SecTitle titulo={`Tramitação — exercício ${ano ?? ""}`} />
        <SemEmendasNoExercicio
          ano={ano}
          descricao="O projeto de lei está em tramitação e o período de emendas, aberto. A primeira emenda apresentada aparece aqui."
        />
      </div>
    );
  }

  const qtd = (s: string) => porStatus.find((x) => x.status === s)?.qtd ?? 0;
  const valor = (s: string) => porStatus.find((x) => x.status === s)?.valor ?? 0;
  const rascunhos = qtd("RASCUNHO") + qtd("EM_VALIDACAO");
  const invalidas = qtd("INVALIDA");
  const validas = qtd("VALIDA");
  const submetidas = qtd("SUBMETIDA") + qtd("EM_TRAMITACAO");
  const aprovadas = qtd("APROVADA");
  const rejeitadas = qtd("REJEITADA");
  const decididas = aprovadas + rejeitadas;

  // Etapa atual do processo, derivada do que existe no banco.
  const etapaAtual =
    decididas > 0 && submetidas === 0 && validas === 0 && rascunhos === 0
      ? "consolidacao"
      : submetidas > 0
        ? "parecer"
        : validas > 0 || invalidas > 0
          ? "conferencia"
          : c.qtd > 0
            ? "apresentacao"
            : "abertura";

  const ordem = [
    "recebimento",
    "abertura",
    "apresentacao",
    "conferencia",
    "parecer",
    "consolidacao",
  ];
  const estado = (etapa: string): Etapa["estado"] => {
    const i = ordem.indexOf(etapa);
    const atual = ordem.indexOf(etapaAtual);
    return i < atual ? "done" : i === atual ? "now" : "next";
  };

  const etapas: Etapa[] = [
    {
      id: "recebimento",
      titulo: "Projeto de lei",
      icon: Landmark,
      estado: base ? "done" : "next",
      contador: base
        ? `${ROTULO_TIPO_INSTRUMENTO[base.tipo] ?? base.tipo} ${base.numero}`
        : "sem base",
      href: "/executivo/planejamento/instrumentos",
    },
    {
      id: "abertura",
      titulo: "Período aberto",
      icon: FileInput,
      estado: base ? "done" : "next",
      contador: base ? "em tramitação" : "—",
    },
    {
      id: "apresentacao",
      titulo: "Apresentação",
      icon: FilePlus2,
      estado: c.qtd > 0 ? estado("apresentacao") : "next",
      contador: `${c.qtd} emendas`,
      nota: brlCompacto(c.valor),
      href: "/emendas",
    },
    {
      id: "conferencia",
      titulo: "Conferência formal",
      icon: ScanSearch,
      estado: estado("conferencia"),
      contador: `${invalidas} p/ sanear`,
      nota: `${validas} válidas`,
      href: "/analise",
    },
    {
      id: "parecer",
      titulo: "Análise e parecer",
      icon: Gavel,
      estado: estado("parecer"),
      contador: `${submetidas} na fila`,
      href: "/analise",
    },
    {
      id: "consolidacao",
      titulo: "Consolidação",
      icon: CheckCircle2,
      estado: estado("consolidacao"),
      contador: `${decididas} decididas`,
      nota: `${aprovadas} aprovadas`,
      href: "/legislativo/tramitacao/acatadas",
    },
  ];

  // Filas operacionais: cada card é uma pilha de trabalho com destino.
  const filas: {
    id: string;
    titulo: string;
    icon: LucideIcon;
    qtd: number;
    valor: number;
    tom: "bad" | "warn" | "info" | "ok";
    acao: string;
    href: string;
    status: string[];
  }[] = [
    {
      id: "sanear",
      titulo: "Devolver para saneamento",
      icon: ScanSearch,
      qtd: invalidas,
      valor: valor("INVALIDA"),
      tom: "bad",
      acao: "Abrir análise técnica",
      href: "/analise",
      status: ["INVALIDA"],
    },
    {
      id: "parecer",
      titulo: "Aguardando parecer",
      icon: Gavel,
      qtd: submetidas,
      valor: valor("SUBMETIDA") + valor("EM_TRAMITACAO"),
      tom: "warn",
      acao: "Dar parecer",
      href: "/analise",
      status: ["SUBMETIDA", "EM_TRAMITACAO"],
    },
    {
      id: "elaboracao",
      titulo: "Em elaboração pelo gabinete",
      icon: FilePlus2,
      qtd: rascunhos,
      valor: valor("RASCUNHO") + valor("EM_VALIDACAO"),
      tom: "info",
      acao: "Ver emendas",
      href: "/legislativo/emendas/todas",
      status: ["RASCUNHO", "EM_VALIDACAO"],
    },
    {
      id: "decididas",
      titulo: "Com decisão da comissão",
      icon: CheckCircle2,
      qtd: decididas,
      valor: valor("APROVADA") + valor("REJEITADA"),
      tom: "ok",
      acao: "Ver acatadas",
      href: "/legislativo/tramitacao/acatadas",
      status: ["APROVADA", "REJEITADA"],
    },
  ];

  // O que está parado na etapa corrente — a lista que o relator abre primeiro.
  const filaAtual = filas.find((f) => f.qtd > 0 && f.tom !== "ok") ?? filas[0];
  const naFila = emendas
    .filter((e) => filaAtual.status.includes(e.status))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      <SecTitle
        titulo={`Tramitação${base ? ` — ${ROTULO_TIPO_INSTRUMENTO[base.tipo] ?? base.tipo} ${base.numero}` : ""}`}
        nota={`exercício ${ano ?? "—"}`}
      />

      {/* ---------------------------------------------------------- esteira */}
      <Card360>
        <Stepper etapas={etapas} />
      </Card360>

      {/* ------------------------------------------------------------ filas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filas.map((f) => (
          <Link key={f.id} href={f.href} className="group rounded-xl">
            <div
              className={cn(
                "flex h-full flex-col rounded-xl bg-card p-5 shadow-card transition-all",
                "group-hover:-translate-y-0.5 group-hover:shadow-card-hover"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-[11px]",
                    f.tom === "bad" && "bg-[var(--surf-bad)] text-[var(--on-bad)]",
                    f.tom === "warn" &&
                      "bg-[var(--surf-warn)] text-[var(--on-warn)]",
                    f.tom === "info" &&
                      "bg-[var(--surf-info)] text-[var(--on-info)]",
                    f.tom === "ok" && "bg-[var(--surf-ok)] text-[var(--on-ok)]"
                  )}
                >
                  <f.icon className="size-[18px]" aria-hidden />
                </span>
                {f.qtd > 0 ? <Tag360 tom={f.tom}>{f.qtd}</Tag360> : null}
              </div>
              <div className="kpi-num mt-4" style={{ fontSize: 24 }}>
                {f.qtd}
              </div>
              <div className="text-[12.5px] font-bold leading-snug">
                {f.titulo}
              </div>
              <div className="mt-1 text-[11.5px] font-medium text-muted-foreground">
                {brlCompacto(f.valor)}
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold text-accent-foreground">
                {f.acao}
                <ArrowRight className="size-3.5" aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* -------------------------------------------------- fila do momento */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card360>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <Eyebrow className="mb-0.5">Fila do momento</Eyebrow>
              <h3 className="text-[15.5px] font-bold tracking-[-.015em]">
                {filaAtual.titulo}
              </h3>
            </div>
            <Link
              href={filaAtual.href}
              className="text-[11.5px] font-semibold text-accent-foreground hover:underline"
            >
              abrir a fila →
            </Link>
          </div>

          {naFila.length === 0 ? (
            <p className="rounded-lg bg-secondary px-4 py-6 text-center text-[12.5px] font-medium text-muted-foreground">
              Nada parado nesta etapa.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {naFila.map((e) => (
                <Link
                  key={e.id}
                  href={`/legislativo/emendas/${e.id}`}
                  className="flex items-center gap-3 rounded-lg bg-secondary px-3.5 py-3 transition-colors hover:bg-accent"
                >
                  <Avatar360 nome={e.autorNome} tamanho="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold">
                      {e.numero} — {e.objeto}
                    </span>
                    <span className="block truncate text-[11px] font-medium text-muted-foreground">
                      {e.autorNome} · {e.orgaoNome}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-[12px] font-semibold tabular-nums sm:block">
                    {brl(e.valor)}
                  </span>
                  <Tag360 tom={tomDoStatus(e.status)}>
                    {ROTULO_STATUS_EMENDA[e.status] ?? e.status}
                  </Tag360>
                </Link>
              ))}
            </div>
          )}
        </Card360>

        {/* ramos do processo que não são a linha principal */}
        <Card360>
          <Eyebrow>Desvios do fluxo</Eyebrow>
          <div className="flex flex-col gap-2">
            <div className="rounded-lg bg-[var(--surf-bad)] px-4 py-3.5">
              <div className="text-[12.5px] font-bold text-[var(--on-bad)]">
                Não conforma → volta ao autor
              </div>
              <div className="mt-0.5 text-[11.5px] font-medium text-[var(--on-bad)]/80">
                {invalidas} emenda(s) para saneamento e revalidação
              </div>
            </div>
            <div className="rounded-lg bg-secondary px-4 py-3.5">
              <div className="text-[12.5px] font-bold">
                Parecer contrário → rejeitada
              </div>
              <div className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">
                {rejeitadas} emenda(s) rejeitadas pela comissão
              </div>
            </div>
            <div className="rounded-lg bg-[var(--surf-ok)] px-4 py-3.5">
              <div className="text-[12.5px] font-bold text-[var(--on-ok)]">
                Aprovada → lei orçamentária
              </div>
              <div className="mt-0.5 text-[11.5px] font-medium text-[var(--on-ok)]/80">
                {aprovadas} emenda(s) seguem para consolidação
              </div>
            </div>
          </div>
        </Card360>
      </div>
    </div>
  );
}
