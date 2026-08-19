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
import { SelectField, TextAreaField, TextField, type Opcao } from "./fields";
import { ImportBaseDialog } from "./import-base-dialog";
import { criarInstrumentoPL, subirLeiAprovada } from "@/lib/actions/config";
import {
  ROTULO_ESPECIE,
  ROTULO_STATUS_INSTRUMENTO,
  ROTULO_TIPO_INSTRUMENTO,
  opcoes,
} from "@/lib/rotulos";
import { StatusInstrumento } from "@/generated/prisma/enums";

type Instrumento = {
  id: string;
  especie: string;
  tipo: string;
  numero: string;
  ementa: string;
  status: string;
  exercicio: { ano: number } | null;
  instrumentoOrigem: { numero: string; tipo: string } | null;
  _count: { dotacoes: number; emendas: number };
};

type ProjetoLei = {
  id: string;
  numero: string;
  tipo: string;
  exercicio: { ano: number } | null;
};

export function InstrumentosTab({
  instrumentos,
  exercicios,
  projetosDeLei,
}: {
  instrumentos: Instrumento[];
  exercicios: { id: string; ano: number }[];
  projetosDeLei: ProjetoLei[];
}) {
  const opcExercicio: Opcao[] = exercicios.map((e) => ({
    value: e.id,
    label: String(e.ano),
  }));
  const opcPL: Opcao[] = projetosDeLei.map((p) => ({
    value: p.id,
    label: `${ROTULO_TIPO_INSTRUMENTO[p.tipo] ?? p.tipo} ${p.numero}${
      p.exercicio ? ` (${p.exercicio.ano})` : ""
    }`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Ciclo PL → lei aprovada. O <b>projeto de lei</b> serve de base às
          emendas (gere a base a partir dele). Depois de sancionada, suba a{" "}
          <b>lei aprovada</b> vinculada ao PL de origem para acompanhamento.
        </p>
        <div className="flex gap-2">
          <FormDialog
            triggerLabel="Projeto de lei"
            title="Novo projeto de lei (base das emendas)"
            description="Cria um instrumento PROJETO_LEI em tramitação."
            action={criarInstrumentoPL}
          >
            <SelectField
              name="tipo"
              label="Tipo"
              required
              options={opcoes(ROTULO_TIPO_INSTRUMENTO)}
            />
            <TextField name="numero" label="Número" required placeholder="PL 123/2025" />
            <TextAreaField name="ementa" label="Ementa" required />
            <SelectField
              name="exercicioId"
              label="Exercício"
              required
              options={opcExercicio}
            />
            <TextField name="arquivoUrl" label="URL do PDF" type="url" placeholder="opcional" />
            <TextField name="dataEnvio" label="Data de envio" type="date" />
          </FormDialog>

          <FormDialog
            triggerLabel="Lei aprovada"
            title="Subir lei aprovada"
            description="Vincula a lei ao projeto de lei de origem (acompanhamento)."
            action={subirLeiAprovada}
          >
            <SelectField
              name="instrumentoOrigemId"
              label="Projeto de lei de origem"
              required
              options={opcPL}
            />
            <TextField name="numero" label="Número da lei" required />
            <TextAreaField name="ementa" label="Ementa" required />
            <SelectField
              name="status"
              label="Status"
              required
              options={opcoes(ROTULO_STATUS_INSTRUMENTO)}
              defaultValue={StatusInstrumento.SANCIONADO}
            />
            <TextField name="dataAprovacao" label="Data de aprovação" type="date" />
            <TextField name="dataVigencia" label="Data de vigência" type="date" />
            <TextField name="arquivoUrl" label="URL do PDF" type="url" placeholder="opcional" />
          </FormDialog>
        </div>
      </div>

      {instrumentos.length === 0 ? (
        <EmptyState
          titulo="Nenhum instrumento cadastrado"
          descricao="Suba o projeto de lei do PPA/LDO/LOA do exercício."
        />
      ) : (
        <div className="rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Espécie</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Exercício</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dotações</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {instrumentos.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>
                    <Badge
                      variant={i.especie === "PROJETO_LEI" ? "secondary" : "default"}
                    >
                      {ROTULO_ESPECIE[i.especie] ?? i.especie}
                    </Badge>
                  </TableCell>
                  <TableCell>{ROTULO_TIPO_INSTRUMENTO[i.tipo] ?? i.tipo}</TableCell>
                  <TableCell className="font-medium">
                    {i.numero}
                    {i.instrumentoOrigem ? (
                      <span className="block text-xs text-muted-foreground">
                        origem: {i.instrumentoOrigem.numero}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{i.exercicio?.ano ?? "—"}</TableCell>
                  <TableCell>
                    {ROTULO_STATUS_INSTRUMENTO[i.status] ?? i.status}
                  </TableCell>
                  <TableCell>{i._count.dotacoes}</TableCell>
                  <TableCell>
                    {i.especie === "PROJETO_LEI" ? (
                      <ImportBaseDialog instrumentoId={i.id} />
                    ) : null}
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
