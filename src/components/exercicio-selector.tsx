"use client";

import { useTransition } from "react";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setExercicioAtivo } from "@/lib/actions/contexto";
import { descricaoCiclo, rotuloCiclo } from "@/lib/ciclo";

type ExercicioOpcao = { id: string; ano: number; status: string };

// Seletor de ciclo orçamentário: troca o contexto de dados de toda a aplicação.
// Rotulado como "2026/2027" (elaboração/execução) e não como "2027": em 2026 se
// elabora a emenda de 2027, e o rótulo de um ano só sugeria que o ano corrente
// era o de execução.
export function ExercicioSelector({
  exercicios,
  anoAtivo,
}: {
  exercicios: ExercicioOpcao[];
  anoAtivo: number | null;
}) {
  const [pending, start] = useTransition();

  if (exercicios.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="size-4" aria-hidden />
        Nenhum ciclo
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
      <Select
        value={anoAtivo ? String(anoAtivo) : undefined}
        onValueChange={(v) => start(() => setExercicioAtivo(Number(v)))}
      >
        {/* Pílula de filtro do mock (.chip): cinza-claro, sem borda. */}
        <SelectTrigger
          size="sm"
          className="h-8 w-[168px] rounded-[10px] border-transparent bg-secondary px-3 text-xs font-semibold text-secondary-foreground shadow-none hover:bg-accent hover:text-accent-foreground"
          aria-label="Ciclo orçamentário"
          title={anoAtivo ? descricaoCiclo(anoAtivo) : undefined}
          disabled={pending}
        >
          {/* <SelectValue> com children é obrigatório, não decorativo: o Radix
              usa este nó como âncora para posicionar o menu (position
              "item-aligned"). Sem ele o cálculo falha e o menu abre fora da
              tela. Os children evitam o efeito colateral de renderizar o item
              selecionado inteiro — duas linhas — dentro da pílula de 32px. */}
          <SelectValue>{anoAtivo ? rotuloCiclo(anoAtivo) : "Ciclo"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {exercicios.map((e) => (
            <SelectItem key={e.id} value={String(e.ano)}>
              <span className="flex flex-col items-start">
                <span className="font-semibold">
                  {rotuloCiclo(e.ano)}
                  {e.status !== "ABERTO" ? " · encerrado" : ""}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {descricaoCiclo(e.ano)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
