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

type ExercicioOpcao = { id: string; ano: number; status: string };

// Seletor de Exercício global: troca o contexto de dados de toda a aplicação.
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
        Nenhum exercício
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
        {/* Pílula de filtro do mock (.chip): cinza-claro, sem borda */}
        <SelectTrigger
          size="sm"
          className="h-8 w-[140px] rounded-[10px] border-transparent bg-secondary px-3 text-xs font-semibold text-secondary-foreground shadow-none hover:bg-accent hover:text-accent-foreground"
          aria-label="Exercício ativo"
          disabled={pending}
        >
          <SelectValue placeholder="Exercício" />
        </SelectTrigger>
        <SelectContent>
          {exercicios.map((e) => (
            <SelectItem key={e.id} value={String(e.ano)}>
              {e.ano}
              {e.status !== "ABERTO" ? " · encerrado" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
