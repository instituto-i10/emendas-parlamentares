import { ExternalLink, Power } from "lucide-react";
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
import { alternarNormaAtiva, criarNorma } from "@/lib/actions/config";
import { ROTULO_TIPO_NORMA, opcoes } from "@/lib/rotulos";

type Norma = {
  id: string;
  tipo: string;
  titulo: string;
  numero: string | null;
  arquivoUrl: string;
  dataVigencia: Date | null;
  ativo: boolean;
};

function fmtData(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—";
}

export function NormasTab({ normas }: { normas: Norma[] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        {/* break-words: os nomes de chave/código são palavras únicas e longas;
            sem isto elas fixam a largura mínima e estouram a tela no celular. */}
        <p className="min-w-0 max-w-2xl break-words text-sm text-muted-foreground">
          Repositório normativo consultável (LOM, Regimento Interno). Documentos
          ativos ficam disponíveis como fundamento dos parâmetros e nas telas de
          tramitação.
        </p>
        <FormDialog
          triggerLabel="Novo documento"
          title="Novo documento normativo"
          description="Informe a URL do PDF. O upload direto será habilitado no deploy (PROMPT 11)."
          action={criarNorma}
        >
          <SelectField
            name="tipo"
            label="Tipo"
            required
            options={opcoes(ROTULO_TIPO_NORMA)}
          />
          <TextField name="titulo" label="Título" required />
          <TextField name="numero" label="Número" placeholder="opcional" />
          <TextField
            name="arquivoUrl"
            label="URL do PDF"
            required
            type="url"
            placeholder="https://…"
          />
          <TextField name="dataVigencia" label="Data de vigência" type="date" />
        </FormDialog>
      </div>

      {normas.length === 0 ? (
        <EmptyState
          titulo="Nenhum documento cadastrado"
          descricao="Cadastre a LOM e o Regimento Interno da Câmara."
        />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {normas.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>{ROTULO_TIPO_NORMA[n.tipo] ?? n.tipo}</TableCell>
                  <TableCell className="font-medium">
                    <a
                      href={n.arquivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {n.titulo}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </TableCell>
                  <TableCell>{n.numero ?? "—"}</TableCell>
                  <TableCell>{fmtData(n.dataVigencia)}</TableCell>
                  <TableCell>
                    <Badge variant={n.ativo ? "default" : "secondary"}>
                      {n.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ActionButton
                      action={alternarNormaAtiva.bind(null, n.id)}
                      successMsg="Situação atualizada."
                      variant="outline"
                      size="sm"
                      title={n.ativo ? "Desativar" : "Ativar"}
                    >
                      <Power className="size-4" aria-hidden />
                      {n.ativo ? "Desativar" : "Ativar"}
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
