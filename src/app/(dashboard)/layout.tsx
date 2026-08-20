import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/session";
import { anoElaboracao, getAnoAtivo, listarExercicios } from "@/lib/exercicio";
import { getDados360 } from "@/lib/queries-360";
import { getInstrumentoBaseAberto } from "@/lib/queries-orcamento";
import { ROTULO_TIPO_INSTRUMENTO } from "@/lib/rotulos";

// Layout da casca autenticada: monta o menu lateral/topbar e injeta o contexto
// (usuário, exercícios, ano ativo e as pendências que viram contador no menu).
// Usa cookies → renderização dinâmica.
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  const exercicios = await listarExercicios();
  const anoAtivo = await getAnoAtivo(exercicios);

  // `getDados360` é cacheado por requisição — a página que também precisar do
  // consolidado reaproveita esta mesma leitura.
  const [{ porStatus }, base] = await Promise.all([
    getDados360(anoAtivo),
    getInstrumentoBaseAberto(anoAtivo),
  ]);
  const qtd = (s: string) => porStatus.find((x) => x.status === s)?.qtd ?? 0;

  // Só conta o que espera ação humana — total de emendas não é pendência.
  const contadores = {
    analise: qtd("INVALIDA") + qtd("SUBMETIDA") + qtd("EM_TRAMITACAO"),
  };

  // A linha de contexto da topbar diz o que o seletor sozinho não diz: em que
  // ano se está TRABALHANDO. O ciclo "2026/2027" resolve a ambiguidade do
  // rótulo; esta linha deixa explícito que 2026 é o ano de elaboração.
  return (
    <AppShell
      user={{ nome: user.nome, poder: user.poder, role: user.role }}
      exercicios={exercicios}
      anoAtivo={anoAtivo}
      contadores={contadores}
      contexto={
        anoAtivo
          ? `Elaborando em ${anoElaboracao(anoAtivo)} as emendas de ${anoAtivo}` +
            (base
              ? ` · base ${ROTULO_TIPO_INSTRUMENTO[base.tipo] ?? base.tipo} ${base.numero}`
              : "")
          : undefined
      }
    >
      {children}
    </AppShell>
  );
}
