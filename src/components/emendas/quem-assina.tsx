"use client";

import { useState, useTransition } from "react";
import { PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Obrigatorio } from "@/components/ui/obrigatorio";
import { salvarResponsavelDestino } from "@/lib/actions/beneficiarios";
import type { BeneficiarioOpcao } from "./campo-beneficiario";

// ---------------------------------------------------------------------------
// QUEM ASSINA pelo destino — pedido do cliente na reunião: "se ele colocar no
// objeto, já colocar os dados do terceiro setor, quem assina".
//
// Vem para o PASSO 1, junto de quem recebe, e não lá no fim: no terceiro setor
// o plano de trabalho não é preenchido pelo vereador — ele sai por um link para
// a entidade, e sem saber para quem mandar o link o passo 4 não tem como
// terminar. Descobrir isso na última tela é descobrir tarde.
//
// O dado é gravado no CADASTRO do destino, não na emenda: o representante legal
// é o mesmo em toda emenda destinada àquela entidade.
// ---------------------------------------------------------------------------
export function QuemAssina({
  destino,
  onSalvo,
}: {
  destino: BeneficiarioOpcao;
  onSalvo: (b: BeneficiarioOpcao) => void;
}) {
  const [pending, start] = useTransition();
  const [nome, setNome] = useState(destino.responsavelNome ?? "");
  const [cargo, setCargo] = useState(destino.responsavelCargo ?? "");
  const [email, setEmail] = useState(destino.responsavelEmail ?? "");
  const [editando, setEditando] = useState(!destino.responsavelNome);

  // Trocar de destino tem de trocar o que está nos campos — sem isso o
  // responsável da Santa Casa apareceria como se fosse o da APAE. Quem faz
  // isso é o `key={destino.id}` de quem monta este componente: remontar é mais
  // barato e mais previsível do que ressincronizar estado dentro de um efeito.

  function salvar() {
    start(async () => {
      const r = await salvarResponsavelDestino(destino.id, { nome, cargo, email });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      onSalvo({
        ...destino,
        responsavelNome: r.nome,
        responsavelCargo: r.cargo || null,
        responsavelEmail: r.email || null,
      });
      setEditando(false);
      toast.success("Quem assina foi gravado no cadastro do destino.");
    });
  }

  if (!editando) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border bg-secondary/40 px-4 py-3">
        <p className="min-w-0 text-[12.5px] leading-relaxed">
          <span className="text-muted-foreground">Assina pelo destino: </span>
          <b>{destino.responsavelNome}</b>
          {destino.responsavelCargo ? `, ${destino.responsavelCargo}` : ""}
          {destino.responsavelEmail ? (
            <span className="text-muted-foreground"> · {destino.responsavelEmail}</span>
          ) : null}
        </p>
        <Button variant="ghost" size="sm" type="button" onClick={() => setEditando(true)}>
          <PenLine className="size-4" aria-hidden /> Trocar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[10px] border bg-secondary/40 p-4">
      <div>
        <p className="text-[13px] font-semibold">Quem assina pelo destino</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
          É esta pessoa que recebe o link e assina o plano de trabalho. Fica
          guardado no cadastro do destino — nas próximas emendas já vem
          preenchido.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="assina-nome">
            <span>
              Nome
              <Obrigatorio />
            </span>
          </Label>
          <Input
            id="assina-nome"
            value={nome}
            disabled={pending}
            placeholder="Nome do representante legal"
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assina-cargo">Cargo</Label>
          <Input
            id="assina-cargo"
            value={cargo}
            disabled={pending}
            placeholder="Presidente, diretor…"
            onChange={(e) => setCargo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assina-email">E-mail</Label>
          <Input
            id="assina-email"
            type="email"
            value={email}
            disabled={pending}
            placeholder="para onde vai o link"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <Button
        size="sm"
        type="button"
        disabled={pending || nome.trim().length < 3}
        onClick={salvar}
      >
        {pending ? "Gravando…" : "Gravar quem assina"}
      </Button>
    </div>
  );
}
