"use client";

import { useMemo, useState } from "react";
import { Trash2, Wand2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "./form-dialog";
import { SelectField, TextField } from "./fields";
import { ActionButton } from "./action-button";
import {
  criarBeneficiario,
  derivarBeneficiarios,
  excluirBeneficiario,
} from "@/lib/actions/beneficiarios";
import { MesclarDuplicados } from "./mesclar-duplicados";
import { ROTULO_TIPO_BENEFICIARIO, opcoes } from "@/lib/rotulos";
import { ListaPaginada } from "@/components/lista-paginada";

type Beneficiario = {
  id: string;
  nome: string;
  tipo: string;
  cnpj: string | null;
  observacao: string | null;
  _count: { emendas: number };
};

type Grupo = {
  canonicalId: string;
  canonicalNome: string;
  membros: { id: string; nome: string; emendas: number }[];
};

// Cadastro do beneficiário final das emendas — a "ponta" da rastreabilidade
// exigida pelo STF/TCE (docs/analise-regulatoria-gaps.md, P0).
export function BeneficiariosTab({
  beneficiarios,
  duplicados = [],
}: {
  beneficiarios: Beneficiario[];
  duplicados?: Grupo[];
}) {
  const [categoria, setCategoria] = useState("");
  const listados = useMemo(
    () => (categoria ? beneficiarios.filter((b) => b.tipo === categoria) : beneficiarios),
    [beneficiarios, categoria]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="min-w-0 max-w-2xl break-words text-sm text-muted-foreground">
          Beneficiário final de cada emenda (órgão público ou entidade do
          terceiro setor) — a ponta da <b>rastreabilidade</b> exigida pelo STF e
          pelo TCE. Use <b>Derivar dos objetos</b> para criar e vincular
          automaticamente a partir do texto das emendas já registradas.
        </p>
        <div className="flex gap-2">
          <ActionButton
            action={derivarBeneficiarios}
            confirmText="Derivar beneficiários do objeto das emendas sem vínculo?"
            successMsg="Beneficiários derivados."
            variant="outline"
          >
            <Wand2 className="size-4" aria-hidden />
            Derivar dos objetos
          </ActionButton>
          <FormDialog
            triggerLabel="Novo beneficiário"
            title="Novo beneficiário"
            description="Órgão público ou entidade que recebe o recurso da emenda."
            action={criarBeneficiario}
          >
            <TextField name="nome" label="Nome" required placeholder="Santa Casa de Misericórdia" />
            <SelectField
              name="tipo"
              label="Tipo"
              required
              options={opcoes(ROTULO_TIPO_BENEFICIARIO)}
              defaultValue="OUTRO"
            />
            <TextField name="cnpj" label="CNPJ" placeholder="opcional (entidades)" />
            <TextField name="observacao" label="Observação" placeholder="habilitação, plano de trabalho…" />
          </FormDialog>
        </div>
      </div>

      <MesclarDuplicados grupos={duplicados} />

      {listados.length === 0 ? (
        <EmptyState
          titulo="Nenhum beneficiário cadastrado"
          descricao="Cadastre manualmente ou derive automaticamente do objeto das emendas."
        />
      ) : (
        <ListaPaginada
          itens={listados}
          rotuloItens="beneficiários"
          porPagina={12}
          placeholder="Buscar por nome ou CNPJ"
          textoBusca={(b) => `${b.nome} ${b.cnpj ?? ""}`}
          filtros={[
            {
              rotulo: "Filtrar por categoria",
              vazio: "Todas as categorias",
              valor: categoria,
              onChange: setCategoria,
              opcoes: Object.entries(ROTULO_TIPO_BENEFICIARIO).map(
                ([valor, rotulo]) => ({ valor, rotulo })
              ),
            },
          ]}
        >
          {(visiveis) => (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead className="text-right">Emendas</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.nome}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        b.tipo === "TERCEIRO_SETOR" ? "secondary" : "outline"
                      }
                    >
                      {ROTULO_TIPO_BENEFICIARIO[b.tipo] ?? b.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.cnpj ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {b._count.emendas}
                  </TableCell>
                  <TableCell>
                    <ActionButton
                      action={excluirBeneficiario.bind(null, b.id)}
                      confirmText="Excluir este beneficiário? As emendas vinculadas ficam sem beneficiário."
                      successMsg="Beneficiário excluído."
                      size="icon"
                      title="Excluir"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
          )}
        </ListaPaginada>
      )}
    </div>
  );
}
