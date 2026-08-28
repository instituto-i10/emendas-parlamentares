import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { podeTramitar } from "@/lib/authz";
import { requirePermissao } from "@/lib/access";
import { getAnoAtivo } from "@/lib/exercicio";
import { getDados360, brl } from "@/lib/queries-360";
import { SecTitle } from "@/components/e360/sec-title";
import { KpiCard } from "@/components/e360/kpi-card";
import { Card360, Eyebrow } from "@/components/e360/card360";
import { Banner } from "@/components/e360/banner";
import { PrintButton } from "@/components/emendas/print-button";
import { Download, Scale } from "lucide-react";
import { FilaAnalise } from "@/components/analise/fila";

export default async function AnalisePage() {
  // A fila mostra as emendas de todos os gabinetes: exige gerir ou tramitar.
  await requirePermissao("gerirTodasEmendas", "tramitarEmendas");
  const user = await getCurrentUser();
  const ano = await getAnoAtivo();
  const { params, emendas, consolidado: c, porStatus } = await getDados360(ano);
  const podeAgir = podeTramitar(user);

  const qtd = (s: string) => porStatus.find((x) => x.status === s)?.qtd ?? 0;
  const conferidas = emendas.filter((e) => e.status !== "RASCUNHO").length;
  const invalidas = emendas.filter((e) => e.status === "INVALIDA");
  const submetidas = emendas.filter((e) => e.status === "SUBMETIDA");
  const validas = emendas.filter((e) => e.status === "VALIDA");
  const decididas = qtd("APROVADA") + qtd("REJEITADA");

  // Reserva = limite: demais áreas não podem ultrapassar (teto − reserva).
  const reservaInvadida =
    c.limiteDemaisGlobal != null && c.valorDemais > c.limiteDemaisGlobal + 0.5;

  // Fila de trabalho: primeiro o que precisa de gente, depois o que está pronto.
  const fila = [...submetidas, ...invalidas, ...validas];

  return (
    <div>
      <Banner tom="vermelho" icone={Scale}>
        <b>
          O motor confere os requisitos formais; o relator revisa, decide e
          assina
        </b>{" "}
        (Human First) · o juízo de mérito é sempre do parlamentar
      </Banner>

      <SecTitle
        titulo="Conferência & Análise Técnica"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          eyebrow="Emendas conferidas"
          numero={String(conferidas)}
          rotulo="cota, teto, base e classificação na pré-checagem"
        />
        <KpiCard
          eyebrow="Para saneamento"
          numero={String(invalidas.length)}
          rotulo="inválidas — devolver ao autor para correção"
          delta={
            invalidas.length > 0
              ? { tom: "warn", texto: "requer ação" }
              : { tom: "up", texto: "nenhuma pendência" }
          }
        />
        <KpiCard
          eyebrow="Aguardando parecer"
          numero={String(submetidas.length)}
          rotulo="submetidas para aprovar/rejeitar"
          delta={
            submetidas.length > 0
              ? { tom: "warn", texto: podeAgir ? "decidir abaixo" : "aguardando relator" }
              : { tom: "up", texto: "fila vazia" }
          }
        />
        <KpiCard
          eyebrow="Decididas"
          numero={String(decididas)}
          rotulo={`aprovadas ${qtd("APROVADA")} · rejeitadas ${qtd("REJEITADA")}`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card360>
          <Eyebrow>
            Fila de validação — nada é consolidado sem o relator assinar
          </Eyebrow>
          <FilaAnalise itens={fila} podeAgir={podeAgir} />
        </Card360>

        <Card360>
          <Eyebrow>Prévia — parecer da conferência formal · exercício {ano ?? "—"}</Eyebrow>
          <div className="rounded-lg bg-secondary p-6 font-serif text-[13.5px] leading-relaxed text-foreground">
            <p>
              <b>
                PARECER DA CONFERÊNCIA FORMAL — EMENDAS AO ORÇAMENTO · EXERCÍCIO{" "}
                {ano ?? "—"}
              </b>
            </p>
            <br />
            <p>
              <b>Universo conferido:</b> {c.qtd} emendas de {c.autoresComEmenda}{" "}
              autor(es), somando {brl(c.valor)}
              {c.tetoGlobal != null ? (
                <>
                  {" "}
                  ({Math.round((c.valor / c.tetoGlobal) * 100)}% do teto global de{" "}
                  {brl(c.tetoGlobal)})
                </>
              ) : null}
              .
            </p>
            {params.cotaPorAutor != null ? (
              <p>
                <b>Cota individual:</b> {brl(params.cotaPorAutor)} por autor.
              </p>
            ) : null}
            {c.pisoSaudeGlobal != null ? (
              <p>
                <b>Reserva de saúde:</b> {brl(c.pisoSaudeGlobal)} (
                {params.reservaSaudePct}%) reservados exclusivamente à saúde. As
                demais áreas somam {brl(c.valorDemais)},{" "}
                {reservaInvadida ? "ACIMA" : "dentro"} do limite de{" "}
                {brl(c.limiteDemaisGlobal!)}. Em saúde: {brl(c.valorSaude)}.
              </p>
            ) : null}
            <p>
              <b>Ressalvas:</b>{" "}
              {invalidas.length > 0 || reservaInvadida
                ? [
                    invalidas.length > 0
                      ? `${invalidas.length} emenda(s) inválida(s) devolvida(s) para saneamento`
                      : null,
                    reservaInvadida
                      ? "demais áreas acima do limite (reserva da saúde invadida)"
                      : null,
                  ]
                    .filter(Boolean)
                    .join("; ") + "."
                : "não há."}
            </p>
            <p>
              <b>Conclusão:</b> pela admissibilidade das emendas conformes,
              condicionada ao saneamento das ressalvas antes da consolidação.
            </p>
            <br />
            <p className="text-[11.5px] font-medium text-muted-foreground">
              <b>Juízo e assinatura: relator da comissão.</b>
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <PrintButton />
            <Link
              href="/legislativo/tramitacao/relatorios"
              className="inline-flex h-8 items-center rounded-[10px] bg-secondary px-3 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="size-4" aria-hidden /> Relatórios e exportação
            </Link>
          </div>
        </Card360>
      </div>
    </div>
  );
}
