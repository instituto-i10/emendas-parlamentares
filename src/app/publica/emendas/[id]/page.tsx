import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoEmendas360 } from "@/components/logo-emendas360";
import { SecTitle } from "@/components/e360/sec-title";
import { Card360, Eyebrow } from "@/components/e360/card360";
import { Tag360, tomDoStatus } from "@/components/e360/tag360";
import { getEmendaPublica } from "@/lib/queries-publicas";
import {
  ROTULO_STATUS_EMENDA,
  ROTULO_TIPO_BENEFICIARIO,
  ROTULO_TIPO_EMENDA,
  ROTULO_TIPO_INSTRUMENTO,
} from "@/lib/rotulos";
import { brl } from "@/lib/queries-360";

// Página pública da emenda: autor, objeto, valor, beneficiário, situação e
// justificativa — o que o cidadão deve conseguir ver de cada emenda (STF/TCE).
export default async function EmendaPublicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const e = await getEmendaPublica(id);
  if (!e) notFound();

  const dataBr = (d: Date) => new Date(d).toLocaleDateString("pt-BR");
  const linhas: [string, React.ReactNode][] = [
    ["Autor", `${e.autor.nome} — ${e.autor.cargo}`],
    [
      "Beneficiário final",
      e.beneficiario ? (
        <>
          {e.beneficiario.nome}{" "}
          <Tag360 tom={e.beneficiario.tipo === "TERCEIRO_SETOR" ? "roxo" : "info"}>
            {ROTULO_TIPO_BENEFICIARIO[e.beneficiario.tipo] ?? e.beneficiario.tipo}
          </Tag360>
          {e.beneficiario.cnpj ? ` · CNPJ ${e.beneficiario.cnpj}` : ""}
        </>
      ) : (
        "—"
      ),
    ],
    ["Valor", <b key="v">{brl(Number(e.valor))}</b>],
    ["Tipo", ROTULO_TIPO_EMENDA[e.tipo] ?? e.tipo],
    [
      "Instrumento base",
      `${ROTULO_TIPO_INSTRUMENTO[e.instrumentoBase.tipo]} — ${e.instrumentoBase.numero} · exercício ${e.exercicio.ano}`,
    ],
    ["Órgão da dotação", `${e.dotacao.orgao.codigo} — ${e.dotacao.orgao.nome}`],
    ["Função", `${e.dotacao.funcao.codigo} — ${e.dotacao.funcao.nome}`],
    ["Programa", `${e.dotacao.programa.codigo} — ${e.dotacao.programa.nome}`],
    ["Apresentada em", dataBr(e.createdAt)],
    ["Última movimentação", dataBr(e.updatedAt)],
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="grad-dark text-white">
        <div className="flex h-14 min-w-0 items-center gap-3 px-4 sm:px-5 lg:px-7">
          <Link href="/publica" className="min-w-0 shrink">
            <LogoEmendas360 />
          </Link>
          <Link
            href="/publica/emendas"
            className="ml-auto shrink-0 whitespace-nowrap rounded-[10px] bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20 sm:px-4"
          >
            <span className="sm:hidden" aria-hidden>←</span>
            <span className="hidden sm:inline">← Todas as emendas</span>
            <span className="sr-only sm:hidden">Todas as emendas</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 pb-16 pt-6">
        <SecTitle
          titulo={`Emenda nº ${e.numero}/${e.exercicio.ano}`}
        />
        <div className="mb-4 flex flex-wrap gap-2">
          <Tag360 tom={tomDoStatus(e.status)}>
            {ROTULO_STATUS_EMENDA[e.status] ?? e.status}
          </Tag360>
          {e.validacoes[0] ? (
            <Tag360 tom={e.validacoes[0].resultado === "VALIDA" ? "ok" : "warn"}>
              conferência formal: {e.validacoes[0].resultado === "VALIDA" ? "conforme" : "com pendências"}
            </Tag360>
          ) : null}
        </div>

        <Card360>
          <Eyebrow>Objeto</Eyebrow>
          <p className="text-[15px] font-semibold">{e.objeto}</p>
          <div className="mt-4 min-w-0 overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <tbody>
                {linhas.map(([k, v]) => (
                  <tr key={k}>
                    <td className="w-52 border-b border-border px-2.5 py-2 text-muted-foreground">
                      {k}
                    </td>
                    <td className="border-b border-border px-2.5 py-2">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card360>

        <Card360 className="mt-4">
          <Eyebrow>Justificativa</Eyebrow>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            {e.justificativa}
          </p>
        </Card360>
      </main>
    </div>
  );
}
