"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mesclarBeneficiarios } from "@/lib/actions/beneficiarios";

type Membro = { id: string; nome: string; emendas: number };
type Grupo = { canonicalId: string; canonicalNome: string; membros: Membro[] };

// Painel de mesclagem: cada grupo de variantes tem um destino escolhível
// (padrão = o de mais emendas); as demais são reapontadas e removidas.
export function MesclarDuplicados({ grupos }: { grupos: Grupo[] }) {
  if (grupos.length === 0) return null;
  return (
    <div className="rounded-lg border border-brand-amber/40 bg-brand-amber/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Merge className="size-4 text-brand-amber" aria-hidden />
        <b className="text-sm">
          {grupos.length} grupo(s) de possíveis duplicados
        </b>
        <span className="text-xs text-muted-foreground">
          — variantes de grafia da mesma entidade. Escolha o destino e mescle.
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {grupos.map((g) => (
          <GrupoLinha key={g.canonicalId} grupo={g} />
        ))}
      </div>
    </div>
  );
}

function GrupoLinha({ grupo }: { grupo: Grupo }) {
  const [canonicalId, setCanonicalId] = useState(grupo.canonicalId);
  const [pending, start] = useTransition();
  const [feito, setFeito] = useState(false);

  const outros = grupo.membros.filter((m) => m.id !== canonicalId);
  const totalEmendas = grupo.membros.reduce((s, m) => s + m.emendas, 0);

  function mesclar() {
    start(async () => {
      const r = await mesclarBeneficiarios(
        canonicalId,
        outros.map((m) => m.id)
      );
      if (r.ok) {
        toast.success(r.message ?? "Mesclado.");
        setFeito(true);
      } else {
        toast.error(r.error);
      }
    });
  }

  if (feito)
    return (
      <div className="rounded-lg bg-secondary px-3 py-2.5 text-[12.5px] font-medium text-muted-foreground">
        ✓ Mesclado em <b className="text-foreground">{grupo.membros.find((m) => m.id === canonicalId)?.nome}</b>.
      </div>
    );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-secondary px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {grupo.membros.map((m) => (
          <label
            key={m.id}
            className="flex cursor-pointer items-center gap-1.5 text-[13px]"
            title="Escolher como destino da mesclagem"
          >
            <input
              type="radio"
              name={`canon-${grupo.canonicalId}`}
              checked={m.id === canonicalId}
              onChange={() => setCanonicalId(m.id)}
              className="accent-[color:var(--brand-cyan)]"
            />
            <span className={m.id === canonicalId ? "font-bold" : ""}>
              {m.nome}
            </span>
            <span className="text-muted-foreground">({m.emendas})</span>
          </label>
        ))}
      </div>
      <Button size="sm" variant="outline" disabled={pending} onClick={mesclar}>
        <Merge className="size-4" aria-hidden />
        Mesclar {outros.length} → destino ({totalEmendas} emendas)
      </Button>
    </div>
  );
}
