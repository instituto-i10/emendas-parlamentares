"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanoTrabalhoCampos, type ContextoRedacaoForm, type ValoresPlano } from "./campos";
import {
  pendenciasDoPlano,
  planoEfetivo,
  type CategoriaBeneficiario,
} from "@/lib/plano-trabalho";

export type { ContextoRedacaoForm, ValoresPlano };

// Formulário do plano na sua página própria — a que a entidade abre pelo link e
// a que o gabinete usa para uma emenda já salva. Dentro do formulário da emenda
// os mesmos campos aparecem no bloco 3, salvos junto com o rascunho; ali o
// estado é do formulário, não daqui.
export function PlanoTrabalhoForm({
  categoria,
  valorEmenda,
  inicial,
  onSalvar,
  cabecalho,
  exigirResponsavel = false,
  redacao,
  justificativaDaEmenda = "",
}: {
  categoria: CategoriaBeneficiario | null;
  valorEmenda: number;
  inicial: ValoresPlano;
  onSalvar: (
    v: ValoresPlano,
    responsavel: string
  ) => Promise<{ ok: boolean; error?: string; message?: string }>;
  cabecalho?: React.ReactNode;
  /** Na página da entidade, quem preenche precisa se identificar. */
  exigirResponsavel?: boolean;
  /** Ausente = sem apoio de redação (o campo continua livre para digitar). */
  redacao?: ContextoRedacaoForm;
  /** Fora do terceiro setor, é ela que vale como justificativa do plano. */
  justificativaDaEmenda?: string;
}) {
  const [pending, start] = useTransition();
  const [valores, setValores] = useState<ValoresPlano>({
    ...inicial,
    itens:
      inicial.itens.length > 0
        ? inicial.itens
        : [{ descricao: "", quantidade: 1, valorUnitario: 0 }],
  });
  const [responsavel, setResponsavel] = useState("");

  // O que vale para a conferência e para gravar: na administração pública, a
  // justificativa da emenda entra no lugar da do plano.
  const efetivo = planoEfetivo(valores, categoria, justificativaDaEmenda)!;
  const pendencias = pendenciasDoPlano(efetivo, categoria, valorEmenda);

  function salvar() {
    start(async () => {
      const r = await onSalvar(efetivo, responsavel);
      if (r.ok) toast.success(r.message ?? "Plano de trabalho salvo.");
      else toast.error(r.error ?? "Não foi possível salvar.");
    });
  }

  return (
    <div className="space-y-6">
      {cabecalho}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plano de trabalho</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanoTrabalhoCampos
            categoria={categoria}
            valorEmenda={valorEmenda}
            valores={valores}
            onChange={setValores}
            redacao={redacao}
            justificativaDaEmenda={justificativaDaEmenda}
          />
        </CardContent>
      </Card>

      {exigirResponsavel ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quem está preenchendo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="pt-responsavel">Nome do responsável</Label>
            <Input
              id="pt-responsavel"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Nome completo de quem preenche pela entidade"
            />
            <p className="text-[12px] text-muted-foreground">
              Fica registrado junto ao plano, para que o gabinete saiba quem
              respondeu.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={salvar} disabled={pending}>
          Salvar plano de trabalho
        </Button>
        {pendencias.length > 0 ? (
          <span className="text-[12px] font-medium text-muted-foreground">
            Salva assim mesmo. Para a emenda poder ser remetida, falta{" "}
            {pendencias.join("; ")}.
          </span>
        ) : (
          <span className="text-[12px] font-medium text-[var(--on-ok)]">
            Plano completo para esta categoria de beneficiário.
          </span>
        )}
      </div>
    </div>
  );
}
