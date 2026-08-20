"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { definirStatusInstrumento } from "@/lib/actions/instrumentos";
import { ROTULO_STATUS_INSTRUMENTO, opcoes } from "@/lib/rotulos";

const controle =
  "h-9 rounded-[10px] border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

// Controle do ciclo de vida do instrumento (inclui abrir para emendas =
// EM_TRAMITACAO).
export function InstrumentoStatus({ id, status }: { id: string; status: string }) {
  const [valor, setValor] = useState(status);
  const [pending, start] = useTransition();

  function aplicar() {
    start(async () => {
      const r = await definirStatusInstrumento(id, valor);
      if (r.ok) toast.success("Instrumento atualizado.");
      else toast.error(r.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className={`${controle} campo-select pl-3 pr-9`}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        aria-label="Status do instrumento"
      >
        {opcoes(ROTULO_STATUS_INSTRUMENTO).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={pending || valor === status}
        onClick={aplicar}
      >
        Aplicar
      </Button>
    </div>
  );
}
