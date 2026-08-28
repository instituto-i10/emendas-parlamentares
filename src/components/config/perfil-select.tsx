"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { reatribuirPerfil } from "@/lib/actions/config";

// Seletor de perfil na própria linha da tabela de usuários. Salva ao mudar; em
// caso de erro o seletor volta ao valor anterior, para a tela não mentir sobre
// o que está gravado no banco.
export function PerfilSelect({
  usuarioId,
  perfilAtualId,
  opcoes,
}: {
  usuarioId: string;
  perfilAtualId: string | null;
  opcoes: { value: string; label: string }[];
}) {
  const [pending, start] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const perfilId = e.target.value;
    const anterior = perfilAtualId ?? "";
    if (!perfilId || perfilId === anterior) return;
    const select = e.currentTarget;
    start(async () => {
      const res = await reatribuirPerfil({ usuarioId, perfilId });
      if (res.ok) toast.success(res.message ?? "Perfil reatribuído.");
      else {
        toast.error(res.error);
        select.value = anterior;
      }
    });
  }

  return (
    <select
      aria-label="Perfil de acesso"
      defaultValue={perfilAtualId ?? ""}
      disabled={pending}
      onChange={onChange}
      className="campo-select h-8 w-full min-w-44 rounded-[10px] border border-input bg-card pl-2 pr-8 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
    >
      {/* Conta sem perfil não acessa o sistema — o estado precisa ser visível
          na tabela, não só na tela de login de quem foi barrado. */}
      <option value="">Sem perfil (sem acesso)</option>
      {opcoes.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
