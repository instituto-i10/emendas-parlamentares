import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { EmptyState } from "./empty-state";
import { anoElaboracao, rotuloCiclo } from "@/lib/ciclo";

// ---------------------------------------------------------------------------
// Exercício sem nenhuma emenda.
//
// Existe para que as telas não mostrem um painel de zeros. Zero é um número, e
// um número diz "medi e deu isso"; um funil com seis etapas zeradas, um gráfico
// vazio e um teto de R$ 11 milhões ao lado de R$ 0,00 dão a impressão de que
// algo falhou. O que aconteceu é outra coisa — o ciclo ainda não começou —, e
// dizer isso em uma linha vale mais que a soma dos zeros.
//
// A descrição padrão explica o PORQUÊ, que é o que faltava: a emenda de um
// exercício só nasce depois que o Executivo manda a proposta orçamentária à
// Câmara, no ano anterior. Sem essa frase o usuário lê "vazio" como "quebrado".
// Escrita a partir dos dois anos do ciclo, para não envelhecer junto com um
// exercício específico.
//
// Rotulada pelo ciclo ("2026/2027") e não pelo ano só, para casar com o
// seletor da topbar — ver src/lib/ciclo.ts.
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
      titulo={
        ano ? `Nenhuma emenda no ciclo ${rotuloCiclo(ano)}` : "Nenhum exercício aberto"
      }
      descricao={
        descricao ??
        (ano
          ? `As emendas ao orçamento de ${ano} são apresentadas ao longo de ` +
            `${anoElaboracao(ano)}, depois que o Executivo envia a proposta orçamentária ` +
            `à Câmara. A base do exercício já está carregada — falta a primeira emenda ` +
            `ser apresentada.`
          : "Cadastre um exercício para começar.")
      }
      acao={
        ano ? (
          <Link
            href="/legislativo/emendas/nova"
            className="text-sm font-bold text-accent-foreground hover:underline"
          >
            Apresentar a primeira emenda →
          </Link>
        ) : null
      }
    />
  );
}
