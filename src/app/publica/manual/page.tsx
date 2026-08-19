import Link from "next/link";
import { LogoEmendas360 } from "@/components/logo-emendas360";
import { SecTitle } from "@/components/e360/sec-title";
import { Card360, Eyebrow } from "@/components/e360/card360";
import { Banner } from "@/components/e360/banner";
import { getAnoAtivo } from "@/lib/exercicio";
import { getParametros360, brl } from "@/lib/queries-360";
import { PrintButton } from "@/components/emendas/print-button";

// Manual orientativo de indicação e execução de emendas impositivas — a
// ausência deste manual é apontada como IMPROPRIEDADE pelo TCE-SP (Comunicado
// SDG 28/2025; relatórios de contas anuais). Os limites vêm dos parâmetros
// reais do exercício ativo.
export default async function ManualPage() {
  const ano = await getAnoAtivo();
  const p = await getParametros360(ano);
  const reserva =
    p.cotaPorAutor != null && p.reservaSaudePct != null
      ? (p.cotaPorAutor * p.reservaSaudePct) / 100
      : null;

  const secoes: { titulo: string; itens: [string, string][] }[] = [
    {
      titulo: "1. Antes de indicar (planejamento)",
      itens: [
        [
          "Diagnostique a necessidade",
          "A emenda deve responder a uma necessidade real e mensurável da população — não a uma conveniência. Registre o diagnóstico na justificativa.",
        ],
        [
          "Verifique a aderência ao planejamento",
          "A indicação precisa ser compatível com o PPA, a LDO e a LOA. No sistema, a dotação é escolhida da base do projeto de lei — o motor confere automaticamente.",
        ],
        [
          "Defina objeto e beneficiário",
          "Objeto claro e beneficiário final identificado (órgão ou entidade). Emendas genéricas dificultam a execução e a fiscalização.",
        ],
        [
          "Evite a pulverização",
          "O TCE aponta que a dispersão de verbas em muitos valores pequenos fere a eficiência (art. 37 da CF). Prefira menos indicações, com mais impacto.",
        ],
      ],
    },
    {
      titulo: "2. Limites do exercício",
      itens: [
        [
          "Cota individual",
          p.cotaPorAutor != null
            ? `Cada parlamentar dispõe de ${brl(p.cotaPorAutor)} no exercício ${ano ?? "atual"}. O motor bloqueia a submissão acima da cota.`
            : "A cota individual é definida pelo parâmetro TETO_VALOR_AUTOR nas Configurações.",
        ],
        [
          "Reserva da saúde",
          reserva != null
            ? `${p.reservaSaudePct}% da cota (${brl(reserva)}) só pode ir para a saúde (função ${p.funcaoSaudeCodigo}). Apresentar emenda é faculdade — o limite é que as demais áreas não ultrapassem ${brl(p.cotaPorAutor! - reserva)}.`
            : "A reserva é definida pelo parâmetro RESERVA_SAUDE_PERCENTUAL.",
        ],
        [
          "Impedimento técnico",
          "Aprovada a emenda, a execução é obrigatória (art. 166 §11 da CF) — salvo impedimento técnico devidamente justificado pelo Executivo.",
        ],
      ],
    },
    {
      titulo: "3. Como indicar no sistema",
      itens: [
        [
          "Selecione a dotação (sem digitação livre)",
          "Órgão → Unidade → Programa → Ação → Dotação, sempre da base do projeto de lei. Natureza e fonte são preenchidas automaticamente.",
        ],
        [
          "Informe objeto, beneficiário, valor e justificativa",
          "Cite o fundamento (art. 140 da Lei Orgânica) e o diagnóstico da necessidade.",
        ],
        [
          "Valide antes de submeter",
          "O motor executa 10 checagens formais (cota, teto, reserva da saúde, PPA, LDO, base, classificação). Só emendas VÁLIDAS podem ser submetidas.",
        ],
        [
          "Acompanhe a tramitação",
          "Conferência formal → análise técnica → parecer → deliberação. Cada decisão fica registrada com parecer e trilha de auditoria.",
        ],
      ],
    },
    {
      titulo: "4. Execução e prestação de contas",
      itens: [
        [
          "Conta bancária específica",
          "O Comunicado Audesp 09/2026 do TCE-SP exige conta vinculada a cada emenda — proibido transitar por outras contas.",
        ],
        [
          "Contabilidade segregada",
          "Receitas, rendimentos e despesas identificados por emenda, no padrão Audesp (Comunicado 55/2025).",
        ],
        [
          "Entidades do terceiro setor",
          "Repasses exigem lei autorizativa, habilitação, plano de trabalho e prestação de contas. Atenção a conflitos de interesse (acompanhamento do Ministério Público).",
        ],
        [
          "Transparência contínua",
          "Autor, objeto, valor, beneficiário e situação de cada emenda ficam públicos no portal de consulta, com busca e filtros.",
        ],
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="grad-dark text-white print:hidden">
        <div className="flex h-14 items-center gap-3 px-5 lg:px-7">
          <Link href="/publica">
            <LogoEmendas360 />
          </Link>
          <Link
            href="/publica/emendas"
            className="ml-auto rounded-[10px] bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
          >
            Consultar emendas
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 pb-16 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SecTitle
            titulo="Manual de indicação e execução de emendas impositivas"
            nota={`exercício ${ano ?? "atual"}`}
          />
          <div className="mt-7 print:hidden">
            <PrintButton />
          </div>
        </div>

        <Banner tom="ok" emoji="⚖️">
          <b>Fundamentos:</b> art. 166, §§ 9º e 11 e art. 163-A da Constituição
          Federal · art. 140 da Lei Orgânica do Município · Comunicados SDG
          28/2025, Audesp 55/2025 e 09/2026 e Resolução 17/2025 do TCE-SP ·
          ADI 7697 e ADPF 854 (STF).
        </Banner>

        {secoes.map((s) => (
          <Card360 key={s.titulo} className="mb-4">
            <Eyebrow>{s.titulo}</Eyebrow>
            <div className="flex flex-col gap-3">
              {s.itens.map(([t, d]) => (
                <div key={t}>
                  <b className="block text-[14px]">{t}</b>
                  <p className="text-[13.5px] leading-relaxed text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </Card360>
        ))}

        <Card360 variante="dark">
          <Eyebrow escuro>Em uma frase</Eyebrow>
          <p className="font-serif text-[15px] leading-relaxed">
            Emenda impositiva bem-feita é emenda <b>planejada</b>, executada com{" "}
            <b>controle</b> e totalmente <b>transparente</b> — objeto claro,
            execução rastreável e resultado verificável.
          </p>
        </Card360>
      </main>
    </div>
  );
}
