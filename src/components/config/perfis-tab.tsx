import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FormDialog } from "./form-dialog";
import { CheckboxField, SelectField, TextAreaField, TextField } from "./fields";
import { ActionButton } from "./action-button";
import { criarPerfil, excluirPerfil } from "@/lib/actions/config";
import { AJUDA_PERMISSAO, ROTULO_PERMISSAO, ROTULO_PODER, opcoes } from "@/lib/rotulos";
import { PERMISSOES_PERFIL } from "@/lib/validation/schemas";

type Perfil = {
  id: string;
  nome: string;
  descricao: string | null;
  poder: string | null;
  perfilDoSistema: boolean;
  adminGeral: boolean;
  usuarios: number;
} & Record<string, unknown>;

export function PerfisTab({ perfis }: { perfis: Perfil[] }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <p className="min-w-0 max-w-2xl break-words text-sm text-muted-foreground">
          Um perfil é um Poder de atuação somado às permissões marcadas. Perfil
          sem nenhuma permissão de escrita funciona como perfil de consulta:
          enxerga os painéis e relatórios do seu Poder, sem botões de ação.
        </p>
        <FormDialog
          triggerLabel="Novo perfil"
          title="Novo perfil de acesso"
          description="O Poder de atuação separa Legislativo e Executivo; as permissões dizem o que o perfil executa dentro dele."
          action={criarPerfil}
        >
          <TextField name="nome" label="Nome do perfil" required />
          <TextAreaField
            name="descricao"
            label="Descrição"
            placeholder="Para que serve este perfil"
          />
          <SelectField
            name="poder"
            label="Poder de atuação"
            options={opcoes(ROTULO_PODER)}
            placeholder="Transversal (os dois Poderes)"
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Permissões</p>
            <div className="space-y-2">
              {PERMISSOES_PERFIL.map((p) => (
                <CheckboxField
                  key={p}
                  name={p}
                  label={ROTULO_PERMISSAO[p] ?? p}
                  ajuda={AJUDA_PERMISSAO[p]}
                />
              ))}
            </div>
          </div>
        </FormDialog>
      </div>

      {perfis.length === 0 ? (
        <EmptyState titulo="Nenhum perfil cadastrado" />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card p-4 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Perfil</TableHead>
                <TableHead>Poder</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {perfis.map((p) => {
                const marcadas = PERMISSOES_PERFIL.filter((k) => p[k]);
                // Um perfil de fábrica ou com gente vinculada não pode sair; o
                // botão explica o motivo em vez de falhar depois do clique.
                const motivo = p.perfilDoSistema
                  ? "Perfil do sistema: não pode ser excluído."
                  : p.usuarios > 0
                    ? `${p.usuarios} usuário(s) vinculado(s). Reatribua antes de excluir.`
                    : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="align-top whitespace-normal">
                      <div className="w-[22rem] max-w-full">
                        <span className="block font-medium">{p.nome}</span>
                        {p.descricao ? (
                          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                            {p.descricao}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top whitespace-nowrap">
                      {p.poder ? (
                        ROTULO_PODER[p.poder]
                      ) : (
                        <span className="text-muted-foreground">Transversal</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {p.adminGeral ? (
                        <Badge variant="secondary">Acesso total</Badge>
                      ) : marcadas.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          Somente consulta
                        </span>
                      ) : (
                        <div className="flex max-w-md flex-wrap gap-1">
                          {marcadas.map((k) => (
                            <Badge key={k} variant="secondary">
                              {ROTULO_PERMISSAO[k] ?? k}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top tabular-nums">{p.usuarios}</TableCell>
                    <TableCell className="align-top">
                      {motivo ? (
                        <span
                          className="block cursor-not-allowed p-2 text-muted-foreground/50"
                          title={motivo}
                        >
                          <Trash2 className="size-4" />
                        </span>
                      ) : (
                        <ActionButton
                          action={excluirPerfil.bind(null, p.id)}
                          confirmText={`Excluir o perfil "${p.nome}"?`}
                          successMsg="Perfil excluído."
                          size="icon"
                          title="Excluir perfil"
                        >
                          <Trash2 className="size-4" />
                        </ActionButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
