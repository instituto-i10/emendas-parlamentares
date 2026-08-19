import { Trash2 } from "lucide-react";
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
import { SelectField, TextField, type Opcao } from "./fields";
import { ActionButton } from "./action-button";
import { criarParametro, excluirParametro } from "@/lib/actions/config";
import {
  ROTULO_ESCOPO,
  ROTULO_MODO,
  opcoes,
} from "@/lib/rotulos";
import { EscopoParametro } from "@/generated/prisma/enums";

type Parametro = {
  id: string;
  escopo: string;
  chave: string;
  valor: string;
  modo: string | null;
  fundamentoDescricao: string | null;
  exercicio: { ano: number } | null;
  fundamentoNorma: { titulo: string } | null;
};

export function ParametrosTab({
  parametros,
  exercicios,
  normasAtivas,
}: {
  parametros: Parametro[];
  exercicios: { id: string; ano: number }[];
  normasAtivas: { id: string; titulo: string }[];
}) {
  const opcExercicio: Opcao[] = exercicios.map((e) => ({
    value: e.id,
    label: String(e.ano),
  }));
  const opcNormas: Opcao[] = normasAtivas.map((n) => ({
    value: n.id,
    label: n.titulo,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Regras que o motor aplica às emendas. Parâmetros <b>bloqueantes</b>{" "}
          impedem a submissão; <b>alertas</b> apenas avisam. Chaves conhecidas:
          <code className="mx-1">TETO_VALOR_AUTOR</code>,
          <code className="mx-1">RESERVA_SAUDE_PERCENTUAL</code> (% da cota só
          p/ saúde — limite das demais áreas),
          <code className="mx-1">FUNCAO_SAUDE</code> (código da função, padrão
          10), <code className="mx-1">PERCENTUAL_IMPOSITIVO</code>,
          <code className="mx-1">ADERENCIA_LDO</code>.
        </p>
        <FormDialog
          triggerLabel="Novo parâmetro"
          title="Novo parâmetro de validação"
          description="Escopo geral ou por exercício. Pode citar um fundamento normativo."
          action={criarParametro}
        >
          <SelectField
            name="escopo"
            label="Escopo"
            required
            options={opcoes(ROTULO_ESCOPO)}
            defaultValue={EscopoParametro.GERAL}
          />
          <SelectField
            name="exercicioId"
            label="Exercício (se escopo por exercício)"
            options={opcExercicio}
            placeholder="—"
          />
          <TextField name="chave" label="Chave" required placeholder="TETO_VALOR_AUTOR" />
          <TextField name="valor" label="Valor" required placeholder="500000" />
          <SelectField
            name="modo"
            label="Modo"
            options={opcoes(ROTULO_MODO)}
            placeholder="—"
          />
          <SelectField
            name="fundamentoNormaId"
            label="Fundamento normativo"
            options={opcNormas}
            placeholder="— (opcional)"
          />
          <TextField
            name="fundamentoDescricao"
            label="Descrição do fundamento"
            placeholder="art. 25 da LOM"
          />
        </FormDialog>
      </div>

      {parametros.length === 0 ? (
        <EmptyState
          titulo="Nenhum parâmetro cadastrado"
          descricao="Cadastre regras como teto por autor ou aderência à LDO."
        />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chave</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead>Fundamento</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {parametros.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.chave}</TableCell>
                  <TableCell>{p.valor}</TableCell>
                  <TableCell>
                    {ROTULO_ESCOPO[p.escopo]}
                    {p.exercicio ? ` · ${p.exercicio.ano}` : ""}
                  </TableCell>
                  <TableCell>
                    {p.modo ? (
                      <Badge
                        variant={p.modo === "BLOQUEANTE" ? "destructive" : "secondary"}
                      >
                        {ROTULO_MODO[p.modo]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.fundamentoNorma?.titulo ?? p.fundamentoDescricao ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ActionButton
                      action={excluirParametro.bind(null, p.id)}
                      confirmText="Excluir este parâmetro?"
                      successMsg="Parâmetro excluído."
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
    </div>
  );
}
