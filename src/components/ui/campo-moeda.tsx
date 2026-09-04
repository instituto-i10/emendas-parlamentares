"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Campo de dinheiro.
//
// Os dígitos entram pelos CENTAVOS e empurram para a esquerda — é como se
// digita no caixa e no internet banking. A alternativa, campo de texto livre,
// aceita "150000,00", "150.000" e "150000.00" e transforma cada um num número
// diferente na hora de somar; com a máscara só existe um estado válido, e a
// memória de cálculo nunca discorda do que está na tela.
//
// O valor sai daqui como NÚMERO. Quem consome não precisa saber que houve
// máscara — e não deve, para não haver duas ideias de "valor" no formulário.
// ---------------------------------------------------------------------------

const formatar = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const centavosDe = (texto: string) => {
  const digitos = texto.replace(/\D/g, "");
  return digitos ? parseInt(digitos, 10) : 0;
};

export function CampoMoeda({
  value,
  onChange,
  id,
  className,
  disabled,
  readOnly,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (valor: number) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  "aria-label"?: string;
}) {
  const gerado = useId();
  const idCampo = id ?? gerado;

  // Arredonda para centavos antes de exibir: 0.1 + 0.2 vindo de uma soma
  // qualquer não pode virar "0,30000000000000004" no campo.
  const texto = formatar(Math.round(value * 100));

  return (
    <span className="relative block min-w-0">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-muted-foreground"
      >
        R$
      </span>
      <input
        id={idCampo}
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        disabled={disabled}
        readOnly={readOnly}
        value={texto}
        onChange={(e) => onChange(centavosDe(e.target.value) / 100)}
        // O cursor vive no fim: clicar no meio e digitar produziria um valor
        // que não é o que a pessoa quis.
        onFocus={(e) => {
          const alvo = e.currentTarget;
          requestAnimationFrame(() =>
            alvo.setSelectionRange(alvo.value.length, alvo.value.length)
          );
        }}
        onClick={(e) => {
          const alvo = e.currentTarget;
          alvo.setSelectionRange(alvo.value.length, alvo.value.length);
        }}
        className={cn(
          "flex h-9 w-full rounded-[10px] border border-input bg-card py-1 pl-9 pr-3",
          "text-right text-sm tabular-nums outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "read-only:bg-secondary read-only:text-muted-foreground",
          className
        )}
      />
    </span>
  );
}
