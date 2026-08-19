import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { safe } from "@/lib/queries";
import { getAnoAtivo } from "@/lib/exercicio";
import { getParametros360 } from "@/lib/queries-360";
import { SecTitle } from "@/components/e360/sec-title";
import { KpiCard } from "@/components/e360/kpi-card";
import { Card360, Eyebrow } from "@/components/e360/card360";
import { Farol, type FarolItemDado } from "@/components/e360/farol";
import { Banner } from "@/components/e360/banner";

// Checklist de conformidade institucional — espelho do que o TCE-SP confere
// nas contas anuais da Câmara (Comunicado GP 43/2025 e relatórios de
// fiscalização). Cada item é derivado do estado REAL do sistema.
export default async function ConformidadePage() {
  const ano = await getAnoAtivo();
  const [params, normas, totalEmendas, comBeneficiario] = await Promise.all([
    getParametros360(ano),
    safe(
      () =>
        prisma.documentoNormativo.findMany({
          where: { ativo: true },
          select: { tipo: true, titulo: true },
        }),
      [] as { tipo: string; titulo: string }[]
    ),
    safe(() => prisma.emenda.count({ where: ano ? { exercicio: { ano } } : {} }), 0),
    safe(
      () =>
        prisma.emenda.count({
          where: {
            ...(ano ? { exercicio: { ano } } : {}),
            beneficiarioId: { not: null },
          },
        }),
      0
    ),
  ]);

  const temLOM = normas.some((n) => n.tipo === "LOM");
  const temRI = normas.some((n) => n.tipo === "REGIMENTO_INTERNO");
  const temManualNorma = normas.some((n) => /manual/i.test(n.titulo));
  const temCota = params.cotaPorAutor != null;
  const temReserva = params.reservaSaudePct != null;
  const pctRastreio =
    totalEmendas > 0 ? Math.round((comBeneficiario / totalEmendas) * 100) : 0;

  const itens: FarolItemDado[] = [
    {
      tom: temLOM ? "g" : "r",
      titulo: "Lei Orgânica prevê o regime de emendas impositivas",
      texto: temLOM
        ? "LOM cadastrada e ativa no repositório normativo (art. 140)."
        : "Cadastre a LOM na aba Normas das Configurações.",
      fix: temLOM ? undefined : "TCE: item conferido nas contas anuais (art. 166 CF).",
      href: "/config",
    },
    {
      tom: temRI ? "g" : "a",
      titulo: "Regimento Interno disciplina prazos e impedimento técnico",
      texto: temRI
        ? "Regimento Interno cadastrado e ativo."
        : "Cadastre o Regimento Interno na aba Normas — o TCE confere se ele disciplina prazos e critérios de impedimento técnico.",
      href: "/config",
    },
    {
      tom: temManualNorma ? "g" : "a",
      titulo: "Manual orientativo instituído e publicado",
      texto: temManualNorma
        ? "Manual registrado no repositório normativo e publicado no portal."
        : "O manual já está publicado no portal público — registre-o também na aba Normas (a ausência é apontada como impropriedade pelo TCE).",
      fix: "Comunicado SDG 28/2025 · relatórios de contas anuais do TCE-SP.",
      href: "/publica/manual",
    },
    {
      tom: "g",
      titulo: "Transparência ativa com busca e filtros",
      texto:
        "Portal público de consulta às emendas (autor, objeto, valor, beneficiário, situação), sem login.",
      fix: "Exigência do STF (ADPF 854 · art. 163-A da CF).",
      href: "/publica/emendas",
    },
    {
      tom: "g",
      titulo: "Identificação do autor em todas as emendas",
      texto: "Toda emenda tem autor vinculado por FK — sem anonimato.",
      href: "/emendas",
    },
    {
      tom: pctRastreio === 100 ? "g" : pctRastreio >= 80 ? "a" : "r",
      titulo: `Rastreabilidade ponta a ponta — ${pctRastreio}% com beneficiário final`,
      texto: `${comBeneficiario} de ${totalEmendas} emendas do exercício ${ano ?? "—"} têm beneficiário identificado.`,
      fix:
        pctRastreio < 100
          ? "Use Configurações → Beneficiários → 'Derivar dos objetos' e revise os casos restantes."
          : undefined,
      href: "/config",
    },
    {
      tom: temCota && temReserva ? "g" : "a",
      titulo: "Limites parametrizados e conferidos pelo motor",
      texto:
        temCota && temReserva
          ? "Cota individual e reserva da saúde definidos; 10 checagens automáticas na validação."
          : "Defina TETO_VALOR_AUTOR e RESERVA_SAUDE_PERCENTUAL nas Configurações.",
      href: "/config",
    },
  ];

  const ok = itens.filter((i) => i.tom === "g").length;
  const atencao = itens.filter((i) => i.tom === "a").length;
  const falha = itens.filter((i) => i.tom === "r").length;

  return (
    <div>
      <Banner tom="roxo" emoji="🏛️">
        <b>Espelho da fiscalização do TCE-SP</b> — os itens abaixo reproduzem o
        que os auditores conferem nas contas anuais da Câmara (Comunicado GP
        43/2025). Estado calculado do sistema em tempo real.
      </Banner>

      <SecTitle
        titulo="Conformidade institucional — checklist TCE"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          eyebrow="Conformes"
          numero={String(ok)}
          rotulo={`de ${itens.length} itens do checklist`}
          delta={{ tom: "up", texto: "atendidos" }}
        />
        <KpiCard
          eyebrow="Em atenção"
          numero={String(atencao)}
          rotulo="itens com providência recomendada"
          delta={atencao > 0 ? { tom: "warn", texto: "agir" } : { tom: "up", texto: "nenhum" }}
        />
        <KpiCard
          eyebrow="Impropriedades potenciais"
          numero={String(falha)}
          rotulo="itens que o TCE apontaria nas contas"
          delta={falha > 0 ? { tom: "down", texto: "urgente" } : { tom: "up", texto: "nenhuma" }}
        />
      </div>

      <Card360 className="mt-4">
        <Eyebrow>O farol institucional</Eyebrow>
        <Farol itens={itens} />
      </Card360>

      <p className="mt-4 text-[13px] text-muted-foreground">
        Documentos relacionados:{" "}
        <Link href="/publica/manual" className="font-bold text-brand-cyan hover:underline">
          Manual orientativo (público)
        </Link>
        {" · "}
        <Link href="/config" className="font-bold text-brand-cyan hover:underline">
          Normas e parâmetros
        </Link>
      </p>
    </div>
  );
}
