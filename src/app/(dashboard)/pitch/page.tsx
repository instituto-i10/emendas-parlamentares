import Link from "next/link";
import { getAnoAtivo } from "@/lib/exercicio";
import { getDados360, brlCompacto } from "@/lib/queries-360";
import { SecTitle } from "@/components/e360/sec-title";
import { KpiCard } from "@/components/e360/kpi-card";

const PASSOS = [
  ["1", "Painel — o quadro geral", "teto, cota, reserva de saúde e conformidade", "/painel"],
  ["2", "Tramitação — o caminho da emenda", "do projeto de lei à consolidação", "/tramitacao"],
  ["3", "Emendas & Beneficiários — para onde vai", "por autor, área e destino", "/emendas"],
  ["4", "Vereador 360 — a cota de cada um", "itens e reserva de saúde por parlamentar", "/vereador360"],
  ["5", "Análise Técnica — Human First", "o motor confere, o relator assina", "/analise"],
  ["6", "Resumo Consolidado — o fecho", "o quadro que vai ao Plenário", "/placar"],
] as const;

export default async function PitchPage() {
  const ano = await getAnoAtivo();
  const { params, consolidado: c } = await getDados360(ano);

  return (
    <div>
      <div className="grad-dark mb-4 rounded-2xl px-10 py-11 text-white">
        <div className="mb-3 text-[11.5px] font-extrabold uppercase tracking-[2px] text-brand-mint">
          Emendas360 · modo apresentação · exercício {ano ?? "—"}
        </div>
        <h3 className="font-serif text-3xl font-bold leading-tight">
          {c.qtd > 0
            ? `${brlCompacto(c.valor)} em emendas, ${c.qtd} indicações, ${c.autoresComEmenda} autores — e uma comissão que precisa conferir tudo antes do Plenário.`
            : "Da planilha ao Plenário, sem perder o controle — cota, teto e reserva de saúde conferidos automaticamente."}
        </h3>
        <p className="mt-3 max-w-[760px] text-base text-white/70">
          Não é conceito: são os dados reais do exercício. Cota, teto, reserva
          de saúde e destinos conferidos automaticamente — e o que não conforma
          sai destacado para saneamento antes da consolidação.
        </p>
        <p className="mt-4 font-serif text-xl italic text-white/90">
          “A planilha vira painel: a comissão confere em minutos o que levava
          dias, e o relator assina com segurança.”
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          eyebrow="Teto global"
          numero={c.tetoGlobal != null ? brlCompacto(c.tetoGlobal) : "—"}
          rotulo={
            c.tetoGlobal != null
              ? `cota × ${c.totalAutores} autores`
              : "parâmetro a configurar"
          }
        />
        <KpiCard
          eyebrow="Cota individual"
          numero={params.cotaPorAutor != null ? brlCompacto(params.cotaPorAutor) : "—"}
          rotulo={`× ${c.totalAutores} autores`}
        />
        <KpiCard
          eyebrow="Emendas"
          numero={String(c.qtd)}
          rotulo={`${brlCompacto(c.valor)} apresentados`}
        />
        <KpiCard
          eyebrow="Método"
          numero="Human First"
          rotulo="o motor confere, o relator valida"
        />
      </div>

      <SecTitle titulo="A demo em 6 passos" />
      <div className="flex flex-col gap-2.5">
        {PASSOS.map(([n, t, s, href]) => (
          <Link
            key={n}
            href={href}
            className="grid grid-cols-[52px_1fr_auto] items-center gap-4 rounded-lg bg-card px-5 py-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-cyan text-[17px] font-black text-white">
              {n}
            </span>
            <span>
              <b className="block text-[15px]">{t}</b>
              <span className="text-xs text-muted-foreground">{s}</span>
            </span>
            <span className="whitespace-nowrap text-sm font-extrabold text-brand-green">
              abrir →
            </span>
          </Link>
        ))}
      </div>

      <div className="grad-dark mt-4 rounded-2xl px-10 py-9 text-white">
        <div className="mb-2 text-[11.5px] font-extrabold uppercase tracking-[2px] text-brand-mint">
          O fecho
        </div>
        <h3 className="font-serif text-2xl font-bold leading-snug">
          O mesmo painel serve à comissão, ao gabinete, ao Executivo e ao
          cidadão — e acompanha a emenda da indicação à execução.
        </h3>
        <p className="mt-3 text-white/70">
          Conferir → sanear → consolidar → executar. O trabalho da comissão,
          instrumentalizado.
        </p>
      </div>
    </div>
  );
}
