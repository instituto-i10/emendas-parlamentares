import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { EmptyState } from "./empty-state";

// ---------------------------------------------------------------------------
// Exercício sem nenhuma emenda.
//
// Existe para que as telas não mostrem um painel de zeros. Zero é um número, e
// um número diz "medi e deu isso"; um funil com seis etapas zeradas, um gráfico
// vazio e um teto de R$ 11 milhões ao lado de R$ 0,00 dão a impressão de que
// algo falhou. O que aconteceu é outra coisa — o ciclo ainda não começou —, e
// dizer isso em uma linha vale mais que a soma dos zeros.
//
// A ação leva a apresentar a primeira emenda: num exercício vazio é a única
// coisa que faz sentido fazer.
// ---------------------------------------------------------------------------
export function SemEmendasNoExercicio({
  ano,
  descricao,
}: {
  ano: number | null;
  descricao?: string;
}) {
  return (
    <EmptyState
      icon={ClipboardCheck}
      titulo={ano ? `Nenhuma emenda no exercício ${ano}` : "Nenhum exercício aberto"}
      descricao={
        descricao ??
        (ano
          ? "O ciclo está aberto e a base orçamentária já foi carregada — falta a primeira emenda ser apresentada."
          : "Cadastre um exercício para começar.")
      }
      acao={
        ano ? (
          <Link
            href="/legislativo/emendas/nova"
            className="text-sm font-bold text-accent-foreground hover:underline"
          >
            Apresentar emenda →
          </Link>
        ) : null
      }
    />
  );
}
